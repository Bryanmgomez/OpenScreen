import { Card } from '@/components/ui/Card'
import { PendingControl } from '@/components/ui/PendingControl'
import { PendingTag } from '@/components/ui/PendingTag'
import { SettingRow } from '@/components/ui/SettingRow'
import type { SettingsSectionDef } from './sections'

interface PendingSectionProps {
  section: SettingsSectionDef
}

/** Categoría aún sin backend: muestra sus controles deshabilitados y la fase en que llegan. */
export function PendingSection({ section }: PendingSectionProps) {
  const { pending, icon: Icon, label } = section
  if (!pending) return null

  return (
    <>
      <div className="notice">
        <PendingTag phase={pending.phase} />
        Estos ajustes aún no tienen funcionamiento. Se muestran para fijar el diseño.
      </div>
      {pending.groups.map((group) => (
        <Card key={group.title} title={group.title} icon={<Icon size={18} />} description={label}>
          {group.controls.map((def) => (
            <SettingRow key={def.id} label={def.label} description={def.description}>
              <PendingControl def={def} />
            </SettingRow>
          ))}
        </Card>
      ))}
    </>
  )
}
