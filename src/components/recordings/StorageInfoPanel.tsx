import { Link } from 'react-router-dom'
import { CheckCircle2, HardDrive, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import type { RecordingStorageInfo } from '@shared/recording'
import { formatBytes } from '@/utils/format'

interface StorageInfoPanelProps {
  storage: RecordingStorageInfo | null
  tempFiles: readonly string[]
  busy: boolean
  onCleanup: () => void
  showChangeLink?: boolean
}

/** Estado real de la carpeta configurada y gestión de temporales huérfanos. */
export function StorageInfoPanel({
  storage,
  tempFiles,
  busy,
  onCleanup,
  showChangeLink = true
}: StorageInfoPanelProps) {
  const available = storage?.available ?? false
  return (
    <section className="storage-panel" aria-label="Almacenamiento de grabaciones">
      <div className="storage-panel__main">
        <div className="storage-panel__title">
          <HardDrive size={16} />
          <strong>Carpeta de grabaciones</strong>
          {storage && (
            <StatusIndicator
              tone={available ? 'success' : 'error'}
              label={available ? 'Disponible' : 'No disponible'}
            />
          )}
        </div>
        <p className="storage-panel__path" title={storage?.outputDir}>
          {storage?.outputDir ?? 'Comprobando…'}
        </p>
        {storage?.reason && <p className="notice notice--error">{storage.reason}</p>}
      </div>
      <div className="storage-panel__side">
        <span className="badge" title="Espacio libre estimado por el sistema de archivos">
          Libres: {formatBytes(storage?.freeBytes ?? null)}
        </span>
        {tempFiles.length > 0 ? (
          <span className="badge badge--warning" title={tempFiles.join('\n')}>
            <TriangleAlert size={13} /> {tempFiles.length} temporales
          </span>
        ) : (
          <span className="badge badge--success">
            <CheckCircle2 size={13} /> Sin temporales
          </span>
        )}
        <Button icon={<Trash2 size={14} />} onClick={onCleanup} disabled={busy || tempFiles.length === 0}>
          Limpiar
        </Button>
        {showChangeLink && <Link className="btn btn--ghost" to="/settings">Cambiar carpeta</Link>}
      </div>
    </section>
  )
}
