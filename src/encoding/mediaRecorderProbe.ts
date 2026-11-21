import {
  EMPTY_RENDERER_CAPABILITIES,
  RECORDER_MIME_CANDIDATES,
  type RecorderMimeCapability,
  type RendererEncodingCapabilities
} from '@shared/encoding'
import type { CaptureLimits } from './model'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hasHeader(bytes: Uint8Array, format: 'webm' | 'mp4' | 'mkv'): boolean {
  if (bytes.length < 8) return false
  if (format === 'mp4') {
    return String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
  }
  return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
}

async function testMime(
  mimeType: string,
  format: 'webm' | 'mp4' | 'mkv'
): Promise<{ actualMimeType: string | null; reason: string | null }> {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mimeType)) {
    return { actualMimeType: null, reason: 'Chromium no acepta este tipo MIME.' }
  }
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 36
  const context = canvas.getContext('2d')
  if (!context) return { actualMimeType: null, reason: 'No se pudo crear el lienzo de prueba.' }
  const stream = canvas.captureStream(1)
  let recorder: MediaRecorder | null = null
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 500_000 })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    const stopped = new Promise<void>((resolve, reject) => {
      if (!recorder) return reject(new Error('MediaRecorder no se inicializó.'))
      recorder.onstop = () => resolve()
      recorder.onerror = () => reject(new Error('MediaRecorder falló durante la prueba.'))
    })
    // VP9 puede tardar varios cientos de ms en emitir el primer chunk: 10 frames / 800 ms evita falsos negativos.
    recorder.start(100)
    for (let index = 0; index < 10; index += 1) {
      context.fillStyle = index % 2 === 0 ? '#ff0000' : '#0000ff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await delay(80)
    }
    recorder.stop()
    await Promise.race([
      stopped,
      delay(5000).then(() => {
        throw new Error('La grabación de prueba no terminó a tiempo.')
      })
    ])
    const blob = new Blob(chunks, { type: mimeType })
    if (blob.size === 0 || !hasHeader(new Uint8Array(await blob.slice(0, 12).arrayBuffer()), format)) {
      return { actualMimeType: null, reason: 'El contenedor producido no es válido.' }
    }
    return { actualMimeType: recorder.mimeType || mimeType, reason: null }
  } catch (error) {
    return {
      actualMimeType: null,
      reason: error instanceof Error ? error.message : 'Error desconocido en la prueba.'
    }
  } finally {
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    stream.getTracks().forEach((track) => track.stop())
  }
}

/** Prueba real de los MIME candidatos. Nunca marca como válido un tipo solo por `isTypeSupported`. */
export async function probeMediaRecorderCapabilities(
  limits: CaptureLimits
): Promise<RendererEncodingCapabilities> {
  if (typeof MediaRecorder === 'undefined') return structuredClone(EMPTY_RENDERER_CAPABILITIES)
  const mimeTypes: RecorderMimeCapability[] = []
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    const result = await testMime(candidate.mimeType, candidate.format)
    mimeTypes.push({
      mimeType: candidate.mimeType,
      actualMimeType: result.actualMimeType,
      format: candidate.format,
      codec: candidate.codec,
      verified: result.reason === null,
      reason: result.reason
    })
  }
  return {
    mimeTypes,
    maxWidth: limits.width,
    maxHeight: limits.height,
    maxFps: limits.fps,
    probedAt: Date.now()
  }
}

/** Cuenta frames entregados de verdad; `getSettings().frameRate` solo refleja la petición. */
export async function measureDeliveredFps(
  stream: MediaStream,
  durationMs = 700
): Promise<number | null> {
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  try {
    await video.play()
  } catch {
    return null
  }
  const requestFrame = (video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: (now: number) => void) => number
  }).requestVideoFrameCallback
  if (typeof requestFrame !== 'function') return null

  return await new Promise<number | null>((resolve) => {
    let frames = 0
    let started: number | null = null
    const callback = (now: number): void => {
      if (started === null) started = now
      frames += 1
      if (now - started < durationMs) requestFrame.call(video, callback)
      else resolve(Math.round((frames / ((now - started) / 1000)) * 10) / 10)
    }
    requestFrame.call(video, callback)
    setTimeout(() => resolve(null), durationMs + 1500)
  })
}
