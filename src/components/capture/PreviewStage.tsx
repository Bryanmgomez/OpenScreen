import { Monitor, Play, Square, VideoOff } from 'lucide-react'
import type { SourceRef } from '@shared/capture'
import { Button } from '@/components/ui/Button'
import { usePreviewStream } from '@/hooks/usePreviewStream'
import { cn } from '@/utils/cn'

interface PreviewStageProps {
  selection: SourceRef | null
  available: boolean
  /** Miniatura real que devolvió `desktopCapturer` para la fuente elegida (si existe). */
  thumbnailUrl?: string | null
}

/**
 * Escenario principal de la página Grabar. Mientras la vista previa en vivo está apagada muestra
 * la miniatura real de la fuente; al encenderla muestra el mismo `MediaStream` que se grabará.
 */
export function PreviewStage({ selection, available, thumbnailUrl }: PreviewStageProps) {
  const { videoRef, active, error, canPreview, start, stop } = usePreviewStream(selection, available)
  const showThumbnail = !active && Boolean(thumbnailUrl) && available

  return (
    <div className="stage-wrap">
      <div className={cn('stage', active && 'stage--live')}>
        <video ref={videoRef} className="stage__video" autoPlay muted playsInline />
        {showThumbnail && <img className="stage__thumb" src={thumbnailUrl ?? undefined} alt="" />}
        {!active && !showThumbnail && (
          <div className="stage__placeholder">
            {selection ? <VideoOff size={28} /> : <Monitor size={28} />}
            <strong>
              {selection && !available ? 'Fuente no disponible' : 'Elige qué quieres grabar'}
            </strong>
            <span>
              {selection && !available
                ? 'La fuente guardada ya no existe. Elige otra en «Fuente».'
                : 'Selecciona un monitor o una ventana en el panel de la derecha.'}
            </span>
          </div>
        )}
        <div className="stage__bar">
          <span className="stage__tag">
            {active ? 'Vista previa en vivo' : showThumbnail ? 'Miniatura de la fuente' : 'Sin vista previa'}
          </span>
          {active ? (
            <Button icon={<Square size={12} />} onClick={stop}>
              Detener vista previa
            </Button>
          ) : (
            <Button icon={<Play size={12} />} onClick={() => void start()} disabled={!canPreview}>
              Ver vista previa
            </Button>
          )}
        </div>
      </div>
      {error && <p className="notice notice--error">{error}</p>}
    </div>
  )
}
