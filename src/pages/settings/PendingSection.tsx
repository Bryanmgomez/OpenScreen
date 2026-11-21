import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { SettingsSectionDef } from './sections'

interface PendingSectionProps {
  section: SettingsSectionDef
}

/** Sección todavía sin implementar: dice con claridad en qué fase llega y qué incluirá. */
export function PendingSection({ section }: PendingSectionProps) {
  const { pending, icon: Icon, label } = section
  if (!pending) return null

  return (
    <Card
      title={label}
      icon={<Icon size={18} />}
      description="Esta categoría aún no tiene ajustes disponibles."
      action={<Badge tone="warning">Fase {pending.phase}</Badge>}
    >
      <div className="card__description">Incluirá:</div>
      <ul className="pending-list">
        {pending.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  )
}
