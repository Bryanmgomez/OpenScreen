import { Circle } from 'lucide-react'
import { useState } from 'react'
import { RecordingCard } from '@/components/recordings/RecordingCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Switch } from '@/components/ui/Switch'
import type { RecordingItem } from '@/types/recording'

/** Solo para ver el diseño: estos datos NO son grabaciones reales y la ruta solo existe en desarrollo. */
const SAMPLE: RecordingItem = {
  id: 'sample',
  name: 'Ejemplo de tarjeta',
  durationMs: 754000,
  createdAt: '2026-11-20T14:05:00'
}

export function DesignGalleryPage() {
  const [open, setOpen] = useState(false)
  const [on, setOn] = useState(true)
  const [mode, setMode] = useState('a')

  return (
    <div className="page">
      <header className="page__header">
        <h1>Galería de componentes</h1>
        <p>Solo desarrollo. Los datos de esta página son de ejemplo y no representan funciones reales.</p>
      </header>
      <div className="grid-2">
        <Panel title="Botones">
          <div className="row">
            <Button variant="primary">Primario</Button>
            <Button>Secundario</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" icon={<Circle size={14} fill="currentColor" />}>
              Peligro
            </Button>
            <Button disabled>Deshabilitado</Button>
          </div>
        </Panel>
        <Panel title="Controles">
          <div className="stack">
            <Switch label="Interruptor" checked={on} onChange={setOn} />
            <SegmentedControl
              label="Segmentado"
              value={mode}
              onChange={setMode}
              options={[{ value: 'a', label: 'Uno' }, { value: 'b', label: 'Dos' }]}
            />
            <Select label="Selector" options={[{ value: '1', label: 'Opción 1' }]} />
          </div>
        </Panel>
        <Panel title="Estados">
          <div className="stack">
            <StatusIndicator tone="idle" label="Inactivo" />
            <StatusIndicator tone="pending" label="Pendiente" />
            <StatusIndicator tone="recording" label="Grabando" />
            <StatusIndicator tone="success" label="Listo" />
            <StatusIndicator tone="error" label="Error" />
            <Badge tone="accent">Insignia</Badge>
          </div>
        </Panel>
        <Card title="Tarjeta y modal" description="Tarjeta genérica.">
          <Button onClick={() => setOpen(true)}>Abrir modal</Button>
        </Card>
      </div>
      <div className="rec-grid">
        <RecordingCard recording={SAMPLE} onPlay={() => undefined} />
      </div>
      <Modal
        open={open}
        title="Modal de ejemplo"
        onClose={() => setOpen(false)}
        footer={<Button variant="primary" onClick={() => setOpen(false)}>Aceptar</Button>}
      >
        <p>Contenido del modal.</p>
      </Modal>
    </div>
  )
}
