import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { SourceRef } from '@shared/capture'
import { toMessage } from '@/utils/errors'

interface PreviewStream {
  videoRef: RefObject<HTMLVideoElement | null>
  active: boolean
  error: string | null
  canPreview: boolean
  start: () => Promise<void>
  stop: () => void
}

/**
 * Vista previa real: el renderer pide un `MediaStream` con `getDisplayMedia` y main concede
 * exactamente la fuente seleccionada mediante `setDisplayMediaRequestHandler`. Se detiene sola
 * cuando cambia la fuente o deja de estar disponible.
 */
export function usePreviewStream(selection: SourceRef | null, available: boolean): PreviewStream {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback((): void => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  useEffect(() => {
    stop()
    setError(null)
    return () => stop()
  }, [selection?.id, selection?.kind, available, stop])

  const start = useCallback(async (): Promise<void> => {
    try {
      stop()
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => setActive(false))
      setActive(true)
      setError(null)
    } catch (cause) {
      setError(toMessage(cause))
      setActive(false)
    }
  }, [stop])

  const canPreview = Boolean(selection && available && navigator.mediaDevices?.getDisplayMedia)

  return { videoRef, active, error, canPreview, start, stop }
}
