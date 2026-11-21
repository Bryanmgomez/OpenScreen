import { useEffect, useRef, useState } from 'react'
import { Play, Square, Video, VideoOff } from 'lucide-react'
import type { SourceRef } from '@shared/capture'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { toMessage } from '@/utils/errors'

interface SourcePreviewProps {
  selection: SourceRef | null
  available: boolean
}

/**
 * Vista previa real: el renderer pide un `MediaStream` con `getDisplayMedia` y main concede
 * exactamente la fuente seleccionada mediante `setDisplayMediaRequestHandler`.
 */
export function SourcePreview({ selection, available }: SourcePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = (): void => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  useEffect(() => {
    stop()
    setError(null)
    return () => stop()
  }, [selection?.id, selection?.kind, available])

  const start = async (): Promise<void> => {
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
  }

  const canPreview = Boolean(selection && available && navigator.mediaDevices?.getDisplayMedia)

  return (
    <Panel
      title="Vista previa"
      icon={active ? <Video size={15} /> : <VideoOff size={15} />}
      action={
        active ? (
          <Button icon={<Square size={12} />} onClick={stop}>
            Detener
          </Button>
        ) : (
          <Button icon={<Play size={12} />} onClick={() => void start()} disabled={!canPreview}>
            Ver vista previa
          </Button>
        )
      }
    >
      <div className="preview">
        <video ref={videoRef} className="preview__video" autoPlay muted playsInline />
        {!active && (
          <div className="preview__placeholder">
            <VideoOff size={24} />
            <span>
              {selection && !available
                ? 'La fuente guardada ya no está disponible. Elige otra.'
                : 'Selecciona una fuente y pulsa «Ver vista previa».'}
            </span>
          </div>
        )}
      </div>
      {error && <p className="notice notice--error">{error}</p>}
      <p className="panel__note">
        La vista previa usa el mismo stream que se capturará al grabar; no es una imagen de ejemplo.
      </p>
    </Panel>
  )
}
