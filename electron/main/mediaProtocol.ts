import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { protocol } from 'electron'
import {
  isFinalRecordingFile,
  isPathInside,
  mimeTypeForRecordingName,
  pathFromMediaUrl,
  RECORDING_MEDIA_PROTOCOL
} from '../services/recording/model'

/**
 * Esquema privado para reproducir vídeos reales sin copiarlos al renderer ni desactivar
 * `webSecurity`. Solo se sirven contenedores terminados dentro de la carpeta configurada.
 */
export function registerRecordingMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: RECORDING_MEDIA_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        allowServiceWorkers: false,
        bypassCSP: false
      }
    }
  ])
}

function plain(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

/** Convierte un `Readable` de Node en el cuerpo web que espera `protocol.handle`. */
function streamBody(
  path: string,
  start: number,
  end: number
): ConstructorParameters<typeof Response>[0] {
  const nodeStream = createReadStream(path, { start, end })
  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) => {
        controller.enqueue(new Uint8Array(chunk as Uint8Array))
      })
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (error) => controller.error(error))
    },
    cancel() {
      nodeStream.destroy()
    }
  })
  return webStream as unknown as ConstructorParameters<typeof Response>[0]
}

export function registerRecordingMediaProtocol(getOutputDir: () => string): void {
  protocol.handle(RECORDING_MEDIA_PROTOCOL, async (request) => {
    const requestedPath = pathFromMediaUrl(request.url)
    if (!requestedPath) return plain('URL no válida.', 400)

    const target = resolve(requestedPath)
    const outputDir = resolve(getOutputDir())
    if (!isPathInside(outputDir, target) || !isFinalRecordingFile(basename(target))) {
      return plain('Acceso denegado.', 403)
    }

    let info
    try {
      info = await stat(target)
      if (!info.isFile()) return plain('El archivo ya no existe.', 404)
    } catch {
      return plain('El archivo ya no existe.', 404)
    }

    let start = 0
    let end = Math.max(0, info.size - 1)
    let status = 200
    const range = request.headers.get('range')

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
      if (!match || (!match[1] && !match[2])) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${info.size}`,
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
      if (match[1] && match[2]) {
        start = Number(match[1])
        end = Number(match[2])
      } else if (match[1]) {
        start = Number(match[1])
        end = info.size - 1
      } else {
        const suffix = Number(match[2])
        start = Math.max(0, info.size - suffix)
        end = info.size - 1
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= info.size) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${info.size}`,
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
      end = Math.min(end, info.size - 1)
      status = 206
    }

    const contentLength = info.size === 0 ? 0 : end - start + 1
    const headers: Record<string, string> = {
      'Content-Type': mimeTypeForRecordingName(target),
      'Content-Length': String(contentLength),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      // Necesario para dibujar el fotograma en un <canvas> sin contaminarlo.
      'Access-Control-Allow-Origin': '*'
    }
    if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`

    if (info.size === 0) return new Response(null, { status, headers })
    return new Response(streamBody(target, start, end), { status, headers })
  })
}
