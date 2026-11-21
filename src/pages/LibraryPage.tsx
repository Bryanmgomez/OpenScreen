import { useMemo, useState } from 'react'
import { ArrowDownUp, Filter, Library, RefreshCw, Search } from 'lucide-react'
import {
  filterAndSortRecordings,
  type RecordingFormat,
  type RecordingPeriod,
  type RecordingSort
} from '@shared/recording'
import { RecordingCard } from '@/components/recordings/RecordingCard'
import { DeleteDialog, RenameDialog } from '@/components/recordings/RecordingDialogs'
import { StorageInfoPanel } from '@/components/recordings/StorageInfoPanel'
import { VideoPlayerModal } from '@/components/recordings/VideoPlayerModal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { useRecordings } from '@/hooks/useRecordings'
import { useSettingsStore } from '@/store/settingsStore'

export function LibraryPage() {
  const {
    items,
    files,
    thumbnails,
    storage,
    tempFiles,
    available,
    error,
    busy,
    refresh,
    reveal,
    remove,
    rename,
    cleanupTemp,
    getMediaUrl
  } = useRecordings()
  const storageWarningGb = useSettingsStore((state) => state.settings?.performance.storageWarningGb)

  const [query, setQuery] = useState('')
  const [format, setFormat] = useState<RecordingFormat | 'all'>('all')
  const [period, setPeriod] = useState<RecordingPeriod>('all')
  const [sort, setSort] = useState<RecordingSort>('date')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [renameTarget, setRenameTarget] = useState<(typeof items)[number] | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<(typeof items)[number] | null>(null)
  const [player, setPlayer] = useState<{ recording: (typeof items)[number]; src: string } | null>(null)

  const visibleFiles = useMemo(
    () => filterAndSortRecordings(files, { query, format, period, sort, direction }),
    [files, query, format, period, sort, direction]
  )
  const visible = useMemo(
    () =>
      visibleFiles.map((file) => ({
        ...file,
        id: file.path,
        path: file.path,
        createdAt: new Date(file.createdAt).toISOString(),
        thumbnailUrl: thumbnails[file.path]
      })),
    [visibleFiles, thumbnails]
  )

  const findItem = (path: string): (typeof items)[number] | undefined =>
    items.find((item) => item.path === path)

  const play = async (path: string): Promise<void> => {
    const recording = findItem(path)
    if (!recording) return
    const src = await getMediaUrl(path)
    if (src) setPlayer({ recording, src })
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Grabaciones</h1>
          <p>
            Biblioteca real de vídeos guardados. Ordena, filtra y administra tus grabaciones.
          </p>
        </div>
        <div className="row">
          <span className="badge badge--accent">{files.length} grabaciones</span>
          <Button icon={<RefreshCw size={14} />} onClick={() => void refresh()} disabled={busy}>
            Actualizar
          </Button>
        </div>
      </header>

      <StorageInfoPanel
        storage={storage}
        tempFiles={tempFiles}
        busy={busy}
        onCleanup={() => void cleanupTemp()}
        warningGb={storageWarningGb}
      />

      <div className="toolbar toolbar--library">
        <label className="search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nombre de archivo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar grabaciones"
          />
        </label>
        <Select
          label="Formato"
          hideLabel
          placeholder="Formato"
          value={format}
          onChange={(value) => setFormat(value as RecordingFormat | 'all')}
          options={[
            { value: 'all', label: 'Todos los formatos' },
            { value: 'webm', label: 'WebM' },
            { value: 'mp4', label: 'MP4' },
            { value: 'mkv', label: 'MKV' }
          ]}
        />
        <Select
          label="Fecha"
          hideLabel
          placeholder="Fecha"
          value={period}
          onChange={(value) => setPeriod(value as RecordingPeriod)}
          options={[
            { value: 'all', label: 'Cualquier fecha' },
            { value: 'today', label: 'Hoy' },
            { value: '7d', label: 'Últimos 7 días' },
            { value: '30d', label: 'Últimos 30 días' }
          ]}
        />
        <Select
          label="Ordenar"
          hideLabel
          placeholder="Ordenar por"
          value={sort}
          onChange={(value) => setSort(value as RecordingSort)}
          options={[
            { value: 'date', label: 'Fecha' },
            { value: 'name', label: 'Nombre' },
            { value: 'duration', label: 'Duración' },
            { value: 'size', label: 'Tamaño' }
          ]}
        />
        <SegmentedControl
          label="Dirección del orden"
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'desc', label: '↓' },
            { value: 'asc', label: '↑' }
          ]}
        />
        <span className="toolbar__view" aria-hidden="true">
          <ArrowDownUp size={16} />
        </span>
      </div>

      {(error || !available) && (
        <p className="notice notice--error">
          {error ?? 'La carpeta de grabaciones no está disponible.'}
        </p>
      )}

      {visible.length > 0 ? (
        <div className="rec-grid">
          {visible.map((recording) => (
            <RecordingCard
              key={recording.id}
              recording={recording}
              onPlay={(path) => void play(path)}
              onReveal={(path) => void reveal(path)}
              onRename={(path) => {
                const item = findItem(path)
                if (item) setRenameTarget(item)
              }}
              onDelete={(path) => {
                const item = findItem(path)
                if (item) setDeleteTarget(item)
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={files.length === 0 ? <Library size={26} /> : <Filter size={26} />}
          title={files.length === 0 ? 'Aún no hay grabaciones' : 'Sin resultados'}
          description={
            files.length === 0
              ? 'Detén una grabación para que aparezca aquí. También puedes pulsar «Actualizar» si la carpeta cambió fuera de la aplicación.'
              : 'Prueba con otro texto, formato o rango de fechas.'
          }
        />
      )}

      <RenameDialog
        recording={renameTarget}
        onClose={() => setRenameTarget(null)}
        onConfirm={(name) => rename(renameTarget?.path ?? '', name)}
      />
      <DeleteDialog
        recording={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await remove(deleteTarget.path)
        }}
      />
      <VideoPlayerModal
        recording={player?.recording ?? null}
        src={player?.src ?? null}
        onClose={() => setPlayer(null)}
      />
    </div>
  )
}
