import { TriangleAlert } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

interface ErrorScreenProps {
  message: string
}

/** Pantalla mostrada si la interfaz no puede comunicarse con el proceso main. */
export function ErrorScreen({ message }: ErrorScreenProps) {
  return (
    <div className="boot" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <EmptyState
        icon={<TriangleAlert size={26} />}
        title="No se pudo iniciar OpenScreen"
        description={message}
      />
    </div>
  )
}
