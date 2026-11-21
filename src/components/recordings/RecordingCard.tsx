import { Film, FolderOpen, Pencil, Play, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import type { RecordingItem } from '@/types/recording'
import { formatDate, formatDuration } from '@/utils/format'

interface RecordingCardProps {
  recording: RecordingItem
  /** Acción sin handler = botón deshabilitado (la función aún no existe). */
  onPlay?: (id: string) => void
  onReveal?: (id: string) => void
  onRename?: (id: string) => void
  onDelete?: (id: string) => void
}

export function RecordingCard({ recording, onPlay, onReveal, onRename, onDelete }: RecordingCardProps) {
  const { id, name, durationMs, createdAt, thumbnailUrl } = recording
  return (
    <article className="rec-card">
      <div className="rec-card__thumb">
        {thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : <Film size={28} aria-hidden="true" />}
        <span className="rec-card__duration">{formatDuration(durationMs)}</span>
      </div>
      <div className="rec-card__info">
        <h3 className="rec-card__name" title={name}>
          {name}
        </h3>
        <p className="rec-card__date">{formatDate(createdAt)}</p>
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
