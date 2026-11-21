import { Circle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

export function RecordingPage() {
  return (
    <div className="page">
      <header className="page__header">
        <h1>Grabación</h1>
        <p>Estado y controles de la grabación en curso.</p>
      </header>

      <EmptyState
        icon={<Circle size={26} />}
        title="No hay ninguna grabación en curso"
        description="Con el motor de captura (Fase 2) esta pantalla mostrará el temporizador, el estado, pausar/reanudar, detener y los indicadores de audio."
      >
        <Badge tone="warning">Fase 2</Badge>
        <Link className="btn btn--secondary" to="/">
          Volver al inicio
        </Link>
      </EmptyState>
    </div>
  )
}
