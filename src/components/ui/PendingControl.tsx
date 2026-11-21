import { SegmentedControl } from './SegmentedControl'
import { Select } from './Select'
import { Switch } from './Switch'
import type { PendingControlDef } from '@/utils/pendingControls'

interface PendingControlProps {
  def: PendingControlDef
}

const PLACEHOLDERS = { shortcut: 'Sin asignar', path: 'No definido' } as const

/** Renderiza un control deshabilitado: ni valor por defecto ni opciones elegidas. */
export function PendingControl({ def }: PendingControlProps) {
  switch (def.kind) {
    case 'switch':
      return <Switch label={def.label} checked={false} disabled />
    case 'segmented':
      return <SegmentedControl label={def.label} options={def.options ?? []} disabled />
    case 'select':
      return <Select label={def.label} hideLabel options={def.options ?? []} placeholder="Pendiente" disabled />
    case 'shortcut':
    case 'path':
      return <span className="chip chip--disabled">{PLACEHOLDERS[def.kind]}</span>
  }
}
