import { Circle, Film, Info, ListChecks, Mic, Monitor, Server } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { SystemInfo } from '@/components/SystemInfo'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { PHASES, PHASE_STATUS_LABEL } from '@/utils/roadmap'

interface PlannedFeature {
  title: string
  description: string
  phase: number
  icon: ReactNode
}

const PLANNED_FEATURES: readonly PlannedFeature[] = [
  {
    title: 'Fuente de captura',
    description: 'Pantalla completa, monitor, ventana o región.',
    phase: 2,
    icon: <Monitor size={18} />
  },
  {
    title: 'Audio',
    description: 'Sistema y micrófono, con pistas independientes.',
    phase: 3,
    icon: <Mic size={18} />
  },
  {
    title: 'Calidad de video',
    description: 'Resolución, FPS, códecs y aceleración por hardware.',
    phase: 4,
    icon: <Film size={18} />
  }
]

export function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <Logo size={64} />
        <div className="hero__text">
          <h1>OpenScreen</h1>
          <p>Grabador de pantalla de código abierto, moderno y eficiente.</p>
        </div>
        <div className="hero__actions">
          <Button
            variant="danger"
            large
            icon={<Circle size={16} fill="currentColor" />}
            disabled
            title="Disponible cuando se implemente el motor de captura (Fase 2)"
          >
            Iniciar grabación
          </Button>
          <div className="hero__hint">
            <Info size={14} />
            El motor de captura llega en la Fase 2.
          </div>
        </div>
      </section>

      <div className="grid-3">
        {PLANNED_FEATURES.map((feature) => (
          <Card
            key={feature.title}
            className="feature"
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            action={<Badge tone="warning">Fase {feature.phase}</Badge>}
          />
        ))}
      </div>

      <div className="grid-2">
        <Card title="Hoja de ruta" icon={<ListChecks size={18} />}>
          <ol className="roadmap">
            {PHASES.map((phase) => (
              <li
                key={phase.number}
                className={cn('roadmap__item', phase.status === 'done' && 'roadmap__item--done')}
              >
                <span className="roadmap__number">{phase.number}</span>
                <span className="roadmap__title">{phase.title}</span>
                <Badge
                  tone={
                    phase.status === 'done' ? 'success' : phase.status === 'next' ? 'accent' : 'neutral'
                  }
                >
                  {PHASE_STATUS_LABEL[phase.status]}
                </Badge>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Sistema" icon={<Server size={18} />} description="Datos leídos del proceso main por IPC.">
          <SystemInfo />
        </Card>
      </div>
    </div>
  )
}
