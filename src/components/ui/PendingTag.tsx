import { Clock } from 'lucide-react'

interface PendingTagProps {
  phase: number
}

/** Marca un control o sección cuyo backend aún no existe. */
export function PendingTag({ phase }: PendingTagProps) {
  return (
    <span className="badge badge--warning" title={`Disponible en la Fase ${phase}`}>
      <Clock size={11} />
      Pendiente · Fase {phase}
    </span>
  )
}
