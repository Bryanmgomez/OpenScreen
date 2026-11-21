/**
 * Miniaturas reales: el propio navegador decodifica el vídeo y un `<canvas>` captura un
 * fotograma. No hay FFmpeg ni generación supuesta; si el contenedor no se puede decodificar,
 * la tarjeta conserva su marcador en lugar de mostrar una imagen inventada.
 */
const cache = new Map<string, string>()
const inFlight = new Map<string, Promise<string | null>>()

export function cachedThumbnail(path: string): string | undefined {
  return cache.get(path)
}

export function clearThumbnailCache(): void {
  cache.clear()
}

export function forgetThumbnail(path: string): void {
  cache.delete(path)
}

function waitFor(video: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const cleanup = (): void => {
      if (timer) clearTimeout(timer)
      video.removeEventListener(event, done)
      video.removeEventListener('error', failed)
    }
    const done = (): void => {
      cleanup()
      resolve()
    }
    const failed = (): void => {
      cleanup()
      reject(new Error(`No se pudo preparar el vídeo (${event}).`))
    }
    video.addEventListener(event, done, { once: true })
    video.addEventListener('error', failed, { once: true })
    timer = setTimeout(failed, timeoutMs)
  })
}

async function captureFrame(src: string): Promise<string | null> {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = src

  try {
    await waitFor(video, 'loadedmetadata', 10_000)
    if (!video.videoWidth || !video.videoHeight) return null

    const duration = Number.isFinite(video.duration) ? video.duration : 0
    if (duration > 0) {
      const seeked = waitFor(video, 'seeked', 6_000)
      video.currentTime = Math.min(duration / 10, 1)
      await seeked
    } else {
      await waitFor(video, 'loadeddata', 6_000)
    }

    const maxWidth = 320
    const scale = Math.min(1, maxWidth / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
    return dataUrl.startsWith('data:image/') ? dataUrl : null
  } catch {
    return null
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}

/** Cachea por ruta para que Home y Biblioteca no decodifiquen el mismo vídeo dos veces. */
export function generateThumbnail(path: string, src: string): Promise<string | null> {
  const cached = cache.get(path)
  if (cached) return Promise.resolve(cached)
  const pending = inFlight.get(path)
  if (pending) return pending

  const task = captureFrame(src)
    .then((dataUrl) => {
      if (dataUrl) cache.set(path, dataUrl)
      return dataUrl
    })
    .finally(() => {
      inFlight.delete(path)
    })
  inFlight.set(path, task)
  return task
}

/** Genera como máximo `concurrency` miniaturas a la vez para no saturar la decodificación. */
export async function generateThumbnails(
  requests: readonly { path: string; src: string }[],
  concurrency = 2
): Promise<void> {
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < requests.length) {
      const request = requests[next]
      next += 1
      if (!request) continue
      await generateThumbnail(request.path, request.src)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, requests.length) }, worker))
}
