import { useEffect, useState } from 'react'
import { Check, Monitor, RefreshCw, Scan, AppWindow } from 'lucide-react'
import type { CaptureSource, SourceRef } from '@shared/capture'
import { RegionForm } from '@/components/capture/RegionForm'
import { SourceCard } from '@/components/capture/SourceCard'
import { SourcePreview } from '@/components/capture/SourcePreview'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useCaptureStore } from '@/store/captureStore'

type Tab = 'screen' | 'window' | 'region'

const TABS = [
  { value: 'screen' as const, label: 'Monitores' },
  { value: 'window' as const, label: 'Ventanas' },
  { value: 'region' as const, label: 'Región' }
]

function toRef(source: CaptureSource): SourceRef {
  return {
    id: source.id,
    kind: source.kind,
    name: source.name,
    displayId: source.displayId,
    width: source.width,
    height: source.height
  }
}

export function RecordingPage() {
  const [tab, setTab] = useState<Tab>('screen')
  const { snapshot, error, busy, init, refresh, selectSource, setRegion, clearSelection } =
    useCaptureStore()

  useEffect(() => {
    void init()
  }, [init])

  const selection = snapshot?.selection ?? null
  const sources = snapshot?.sources.filter((source) => source.kind === tab) ?? []

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Grabación</h1>
          <p>Selecciona exactamente qué monitor o ventana quieres capturar.</p>
        </div>
        <div className="toolbar">
          <SegmentedControl label="Tipo de fuente" value={tab} options={TABS} onChange={setTab} />
          <Button
            icon={<RefreshCw size={14} />}
            onClick={() => void refresh()}
            disabled={busy || !snapshot}
          >
            Actualizar
          </Button>
        </div>
      </header>

      {error && <p className="notice notice--error">{error}</p>}

      {!snapshot ? (
        <EmptyState
          icon={<Monitor size={26} />}
          title="Detectando fuentes"
          description="Consultando los monitores y ventanas reales del sistema…"
        />
      ) : (
        <>
          {snapshot.warnings.map((warning) => (
            <p
              key={warning}
              className={snapshot.permission === 'denied' ? 'notice notice--error' : 'notice'}
            >
              {warning}
            </p>
          ))}

          {tab === 'region' ? (
            <RegionForm region={snapshot.region} busy={busy} onSave={setRegion} />
          ) : (
            <div className="capture-layout">
              <Panel
                title={tab === 'screen' ? 'Monitores conectados' : 'Ventanas disponibles'}
                icon={tab === 'screen' ? <Monitor size={15} /> : <AppWindow size={15} />}
                action={<Badge>{sources.length}</Badge>}
              >
                {sources.length === 0 ? (
                  <EmptyState
                    icon={tab === 'screen' ? <Monitor size={26} /> : <Scan size={26} />}
                    title={tab === 'screen' ? 'No hay monitores' : 'No hay ventanas'}
                    description="No se detectaron fuentes de este tipo. Pulsa «Actualizar» para volver a buscar."
                  />
                ) : (
                  <div className="source-grid">
                    {sources.map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        selected={selection?.id === source.id}
                        onSelect={() => void selectSource(toRef(source))}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              <div className="stack">
                <SourcePreview selection={selection} available={snapshot.selectionAvailable} />

                <Panel title="Selección actual" icon={<Check size={15} />}>
                  {selection ? (
                    <div className="stack">
                      <dl className="info-list">
                        <dt>Fuente</dt>
                        <dd>{selection.name}</dd>
                        <dt>Tipo</dt>
                        <dd>{selection.kind === 'screen' ? 'Monitor' : 'Ventana'}</dd>
                        <dt>Estado</dt>
                        <dd>{snapshot.selectionAvailable ? 'Disponible' : 'Ya no disponible'}</dd>
                      </dl>
                      <Button onClick={() => void clearSelection()} disabled={busy}>
                        Quitar selección
                      </Button>
                    </div>
                  ) : (
                    <p className="card__description">
                      Aún no has elegido una fuente. Haz clic en una tarjeta para seleccionarla.
                    </p>
                  )}
                </Panel>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
