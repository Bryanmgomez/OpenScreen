import { Play, Square, Video, VideoOff } from 'lucide-react'
import type { SourceRef } from '@shared/capture'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { usePreviewStream } from '@/hooks/usePreviewStream'

interface SourcePreviewProps {
  selection: SourceRef | null
  available: boolean
}

/** Vista previa en panel (Ajustes → Captura). La de la página Grabar es `PreviewStage`. */
export function SourcePreview({ selection, available }: SourcePreviewProps) {
  const { videoRef, active, error, canPreview, start, stop } = usePreviewStream(selection, available)

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
