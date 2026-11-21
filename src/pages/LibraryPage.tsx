import { Grid2x2, Library, Search } from 'lucide-react'
import { RecordingCard } from '@/components/recordings/RecordingCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { PendingTag } from '@/components/ui/PendingTag'
import { Select } from '@/components/ui/Select'
import { useRecordings } from '@/hooks/useRecordings'

export function LibraryPage() {
  const { items, available } = useRecordings()

  return (
    <div className="page">
      <header className="page__header">
        <h1>Grabaciones</h1>
        <p>Biblioteca de tus grabaciones.</p>
      </header>

      <div className="toolbar" aria-disabled={!available}>
        <label className="search">
          <Search size={15} aria-hidden="true" />
          <input type="search" placeholder="Buscar grabaciones" disabled={!available} aria-label="Buscar grabaciones" />
        </label>
        <Select
          label="Ordenar"
          hideLabel
          placeholder="Ordenar por"
          disabled={!available}
          options={[
            { value: 'date', label: 'Fecha' },
            { value: 'name', label: 'Nombre' },
            { value: 'duration', label: 'Duración' }
          ]}
        />
        <span className="toolbar__view" aria-hidden="true">
          <Grid2x2 size={16} />
        </span>
        {!available && <PendingTag phase={5} />}
      </div>

      {items.length > 0 ? (
        <div className="rec-grid">
          {items.map((recording) => (
            <RecordingCard key={recording.id} recording={recording} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Library size={26} />}
          title="Aún no hay grabaciones"
          description="Cuando existan grabaciones aparecerán aquí como tarjetas, con miniatura, nombre, duración y fecha, y acciones para reproducir y gestionarlas."
        />
      )}
    </div>
  )
}
