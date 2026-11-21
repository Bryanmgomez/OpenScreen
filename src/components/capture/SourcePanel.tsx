import { AppWindow, Monitor } from 'lucide-react'
import type { CaptureSnapshot } from '@shared/capture'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'

interface SourcePanelProps {
  snapshot: CaptureSnapshot
  busy: boolean
  locked: boolean
  onChange: () => void
  onClear: () => void
}

/** Resumen de la fuente seleccionada, con acceso al selector. */
export function SourcePanel({ snapshot, busy, locked, onChange, onClear }: SourcePanelProps) {
  const selection = snapshot.selection
  const source = selection
    ? snapshot.sources.find((item) => item.id === selection.id && item.kind === selection.kind)
    : undefined
  const Icon = selection?.kind === 'window' ? AppWindow : Monitor
  const width = source?.width ?? selection?.width
  const height = source?.height ?? selection?.height

  return (
    <Panel
      title="Fuente"
      icon={<Icon size={15} />}
      action={
        <Button onClick={onChange} disabled={locked}>
          Cambiar
        </Button>
      }
    >
      {selection ? (
        <div className="source-summary">
          <div className="source-summary__row">
            <span className="source-summary__name" title={selection.name}>
              {selection.name}
            </span>
            <Badge tone={snapshot.selectionAvailable ? 'success' : 'warning'}>
              {snapshot.selectionAvailable ? 'Disponible' : 'No disponible'}
            </Badge>
          </div>
          <p className="source-summary__meta">
            {selection.kind === 'screen' ? 'Monitor' : 'Ventana'}
            {width && height ? ` · ${width}×${height}` : ''}
          </p>
          <Button variant="ghost" onClick={onClear} disabled={busy || locked}>
            Quitar selección
          </Button>
        </div>
      ) : (
        <p className="card__description">
          Aún no has elegido una fuente. Pulsa «Cambiar» o un tipo de fuente para seleccionarla.
        </p>
      )}
    </Panel>
  )
}
