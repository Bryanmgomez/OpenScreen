import { Info, ListChecks, Scale } from 'lucide-react'
import { SystemInfo } from '@/components/SystemInfo'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { PHASES, PHASE_STATUS_LABEL } from '@/utils/roadmap'

export function GeneralSection() {
  return (
    <>
      <Card title="Acerca de OpenScreen" icon={<Info size={18} />}>
        <SystemInfo />
      </Card>
      <Card title="Hoja de ruta" icon={<ListChecks size={18} />}>
        <ol className="roadmap">
          {PHASES.map((phase) => (
            <li key={phase.number} className={cn('roadmap__item', phase.status === 'done' && 'roadmap__item--done')}>
              <span className="roadmap__number">{phase.number}</span>
              <span className="roadmap__title">{phase.title}</span>
              <Badge tone={phase.status === 'done' ? 'success' : phase.status === 'next' ? 'accent' : 'neutral'}>
                {PHASE_STATUS_LABEL[phase.status]}
              </Badge>
            </li>
          ))}
        </ol>
      </Card>
      <Card
        title="Licencia"
        icon={<Scale size={18} />}
        description="OpenScreen es software libre distribuido bajo la licencia GNU GPL-3.0-only. El texto completo está en el archivo LICENSE del proyecto."
      />
    </>
  )
}
