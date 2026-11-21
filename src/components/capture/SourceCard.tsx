import { AppWindow, Check, Monitor } from 'lucide-react'
import type { CaptureSource } from '@shared/capture'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

interface SourceCardProps {
  source: CaptureSource
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}

/** Una fuente real devuelta por desktopCapturer, con miniatura y datos verificables. */
export function SourceCard({ source, selected, disabled = false, onSelect }: SourceCardProps) {
  const resolution = source.width && source.height ? `${source.width}×${source.height}` : null

  return (
    <button
      type="button"
      className={cn('source-card', selected && 'source-card--selected')}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="source-card__thumb">
        {source.thumbnailUrl ? (
          <img src={source.thumbnailUrl} alt="" />
        ) : (
          <span className="source-card__placeholder">
            {source.kind === 'screen' ? <Monitor size={26} /> : <AppWindow size={26} />}
          </span>
        )}
        {source.iconUrl && <img className="source-card__icon" src={source.iconUrl} alt="" />}
        {selected && (
          <span className="source-card__check">
            <Check size={13} />
          </span>
        )}
      </span>
      <span className="source-card__body">
        <span className="source-card__name" title={source.name}>
          {source.name}
        </span>
        <span className="source-card__meta">
          {resolution ?? 'Ventana'}
          {source.refreshRate ? ` · ${Math.round(source.refreshRate)} Hz` : ''}
          {source.scaleFactor && source.scaleFactor !== 1 ? ` · ${source.scaleFactor}x` : ''}
        </span>
        <span className="source-card__badges">
          {source.primary && <Badge tone="accent">Principal</Badge>}
          <Badge>
            {source.kind === 'screen' ? (source.internal ? 'Interno' : 'Externo') : 'Ventana'}
          </Badge>
        </span>
      </span>
    </button>
  )
}
