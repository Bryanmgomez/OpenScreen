import { useMemo, useState } from 'react'
import { Grid2x2, Library, RefreshCw, Search } from 'lucide-react'
import { RecordingCard } from '@/components/recordings/RecordingCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { useRecordings } from '@/hooks/useRecordings'
import { useRecordingsStore } from '@/store/recordingsStore'

type Sort = 'date' | 'name' | 'duration'

export function LibraryPage() {
  const { items, error, busy, reveal, open, remove } = useRecordings()
  const refresh = useRecordingsStore((state) => state.refresh)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('date')

  const visible = useMemo(() => {
    const filtered = items.filter((item) =>
      item.name.toLowerCase().includes(query.trim().toLowerCase())
    )
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'es')
      if (sort === 'duration') return b.durationMs - a.durationMs
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [items, query, sort])

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Grabaciones</h1>
          <p>Archivos reales guardados en la carpeta de destino configurada.</p>
        </div>
        <Button icon={<RefreshCw size={14} />} onClick={() => void refresh()} disabled={busy}>
          Actualizar
        </Button>
      </header>

      <div className="toolbar">
        <label className="search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar grabaciones"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar grabaciones"
          />
        </label>
        <Select
          label="Ordenar"
          hideLabel
          placeholder="Ordenar por"
          value={sort}
          onChange={(value) => setSort(value as Sort)}
          options={[
            { value: 'date', label: 'Fecha' },
            { value: 'name', label: 'Nombre' },
            { value: 'duration', label: 'Duración' }
          ]}
        />
        <span className="toolbar__view" aria-hidden="true">
          <Grid2x2 size={16} />
        </span>
      </div>

      {error && <p className="notice notice--error">{error}</p>}

      {visible.length > 0 ? (
        <div className="rec-grid">
          {visible.map((recording) => (
            <RecordingCard
              key={recording.id}
              recording={recording}
              onPlay={(path) => void open(path)}
              onReveal={(path) => void reveal(path)}
              onDelete={(path) => void remove(path)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Library size={26} />}
          title="Aún no hay grabaciones"
          description="Detén una grabación para que aparezca aquí. También puedes pulsar «Actualizar» si la carpeta cambió fuera de la aplicación."
        />
      )}
    </div>
  )
}
