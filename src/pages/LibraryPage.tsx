import { Library } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

export function LibraryPage() {
  return (
    <div className="page">
      <header className="page__header">
        <h1>Grabaciones</h1>
        <p>Biblioteca de tus grabaciones.</p>
      </header>

      <EmptyState
        icon={<Library size={26} />}
        title="Aún no hay grabaciones"
        description="La biblioteca (miniaturas, duración, tamaño, reproducir, abrir ubicación y eliminar) se implementará en la Fase 5, cuando existan grabaciones que gestionar."
      >
        <Badge tone="warning">Fase 5</Badge>
      </EmptyState>
    </div>
  )
}
