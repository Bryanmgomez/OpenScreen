import { useEffect } from 'react'
import { Monitor, X } from 'lucide-react'
import { RegionForm } from '@/components/capture/RegionForm'
import { SourcePreview } from '@/components/capture/SourcePreview'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCaptureStore } from '@/store/captureStore'

/** Estado real de la fuente seleccionada y editor de región, reutilizados desde la grabación. */
export function CaptureSection() {
  const { snapshot, busy, init, setRegion, clearSelection } = useCaptureStore()

  useEffect(() => {
    void init()
  }, [init])

  const selection = snapshot?.selection ?? null

  return (
    <>
      <Card title="Fuente seleccionada" icon={<Monitor size={18} />}>
        {selection ? (
          <>
            <div className="info-list">
              <dt>Nombre</dt>
              <dd>{selection.name}</dd>
              <dt>Tipo</dt>
              <dd>{selection.kind === 'screen' ? 'Monitor' : 'Ventana'}</dd>
              <dt>Resolución</dt>
              <dd>
                {selection.width ?? '—'}×{selection.height ?? '—'}
              </dd>
              <dt>Disponible</dt>
              <dd>{snapshot?.selectionAvailable ? 'Sí' : 'No'}</dd>
            </div>
            <Button
              icon={<X size={13} />}
              onClick={() => void clearSelection()}
              disabled={busy || !snapshot}
            >
              Quitar selección
            </Button>
            <SourcePreview selection={selection} available={snapshot?.selectionAvailable ?? false} />
          </>
        ) : (
          <EmptyState
            icon={<Monitor size={24} />}
            title="Sin fuente seleccionada"
            description="Elige un monitor o una ventana en la pantalla de Grabación."
          />
        )}
      </Card>
      {snapshot && <RegionForm region={snapshot.region} busy={busy} onSave={setRegion} />}
    </>
  )
}
