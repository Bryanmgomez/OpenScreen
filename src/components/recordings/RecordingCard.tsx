import { Film, FolderOpen, Pencil, Play, Trash2, TriangleAlert } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import type { RecordingItem } from '@/types/recording'
import { formatBytes, formatDate, formatDuration, formatFps, formatResolution } from '@/utils/format'

interface RecordingCardProps {
  recording: RecordingItem
  onPlay?: (id: string) => void
  onReveal?: (id: string) => void
  onRename?: (id: string) => void
  onDelete?: (id: string) => void
}

export function RecordingCard({ recording, onPlay, onReveal, onRename, onDelete }: RecordingCardProps) {
  const {
    id,
    name,
    durationMs,
    createdAt,
    thumbnailUrl,
    format,
    size,
    actualWidth,
    actualHeight,
    actualFps,
    measuredFps,
    metadataStatus,
    codec
  } = recording

  return (
    <article className="rec-card">
      <div className="rec-card__thumb">
        {thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : <Film size={28} aria-hidden="true" />}
        <span className="rec-card__duration">{formatDuration(durationMs)}</span>
        <span className="rec-card__format">{format.toUpperCase()}</span>
      </div>
      <div className="rec-card__info">
        <h3 className="rec-card__name" title={name}>
          {name}
        </h3>
        <p className="rec-card__date">{formatDate(createdAt)}</p>
        <dl className="rec-card__meta">
          <div>
            <dt>Resolución</dt>
            <dd>{formatResolution(actualWidth, actualHeight)}</dd>
          </div>
          <div>
            <dt>FPS</dt>
            <dd>{formatFps(actualFps, measuredFps)}</dd>
          </div>
          <div>
            <dt>Tamaño</dt>
            <dd>{formatBytes(size)}</dd>
          </div>
          {codec && codec !== 'auto' && (
            <div>
              <dt>Códec</dt>
              <dd className="rec-card__codec">{codec.toUpperCase()}</dd>
            </div>
          )}
        </dl>
        {metadataStatus !== 'ok' && (
          <p className="rec-card__warning" title="El sidecar .openscreen.json falta o no es válido">
            <TriangleAlert size={13} />
            {metadataStatus === 'missing' ? 'Sin metadatos' : 'Metadatos no válidos'}
          </p>
        )}
      </div>
      <div className="rec-card__actions">
        <IconButton label="Reproducir" disabled={!onPlay} onClick={() => onPlay?.(id)}>
          <Play size={15} />
        </IconButton>
        <IconButton label="Abrir ubicación" disabled={!onReveal} onClick={() => onReveal?.(id)}>
          <FolderOpen size={15} />
        </IconButton>
        <IconButton label="Renombrar" disabled={!onRename} onClick={() => onRename?.(id)}>
          <Pencil size={15} />
        </IconButton>
        <IconButton label="Eliminar" disabled={!onDelete} onClick={() => onDelete?.(id)}>
          <Trash2 size={15} />
        </IconButton>
      </div>
    </article>
  )
}
