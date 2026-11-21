import { AppWindow, Monitor, Scan } from 'lucide-react'
import type { CaptureRegion, CaptureSnapshot, SourceRef } from '@shared/capture'
import { RegionForm } from '@/components/capture/RegionForm'
import { SourceCard } from '@/components/capture/SourceCard'
import type { SourceTab } from '@/components/capture/SourceTypeTiles'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'

interface SourcePickerModalProps {
  open: boolean
  tab: SourceTab
  snapshot: CaptureSnapshot
  busy: boolean
  locked: boolean
  onClose: () => void
  onSelect: (source: SourceRef) => void
  onSaveRegion: (region: CaptureRegion) => Promise<void>
}

const TITLES: Record<SourceTab, string> = {
  screen: 'Monitores conectados',
  window: 'Ventanas disponibles',
  region: 'Región personalizada'
}

/** Selector de fuente: lista real de monitores o ventanas, o el formulario de región. */
export function SourcePickerModal({
  open,
  tab,
  snapshot,
  busy,
  locked,
  onClose,
  onSelect,
  onSaveRegion
}: SourcePickerModalProps) {
  const sources = tab === 'region' ? [] : snapshot.sources.filter((source) => source.kind === tab)

  return (
    <Modal open={open} title={TITLES[tab]} onClose={onClose} className="modal--wide">
      {tab === 'region' ? (
        <RegionForm region={snapshot.region} busy={busy} onSave={onSaveRegion} />
      ) : sources.length === 0 ? (
        <EmptyState
          icon={tab === 'screen' ? <Monitor size={26} /> : <Scan size={26} />}
          title={tab === 'screen' ? 'No hay monitores' : 'No hay ventanas'}
          description="No se detectaron fuentes de este tipo. Cierra este cuadro y pulsa «Actualizar» para volver a buscar."
        />
      ) : (
        <div className="source-grid">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              selected={snapshot.selection?.id === source.id}
              disabled={locked}
              onSelect={() =>
                onSelect({
                  id: source.id,
                  kind: source.kind,
                  name: source.name,
                  displayId: source.displayId,
                  width: source.width,
                  height: source.height
                })
              }
            />
          ))}
        </div>
      )}
      {tab !== 'region' && sources.length > 0 && (
        <p className="panel__note">
          {tab === 'screen' ? <Monitor size={13} /> : <AppWindow size={13} />}
          {sources.length} {sources.length === 1 ? 'fuente detectada' : 'fuentes detectadas'}.
        </p>
      )}
    </Modal>
  )
}
