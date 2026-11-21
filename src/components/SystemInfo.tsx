import { useAppInfo } from '@/hooks/useAppInfo'
import { platformLabel } from '@/utils/platform'

/** Datos reales del entorno, obtenidos del proceso main por IPC. */
export function SystemInfo() {
  const { info, error } = useAppInfo()

  if (error) return <div className="notice notice--error">{error}</div>
  if (!info) return <p className="card__description">Cargando…</p>

  return (
    <dl className="info-list">
      <dt>Versión</dt>
      <dd>{info.version}</dd>
      <dt>Plataforma</dt>
      <dd>
        {platformLabel(info.platform)} ({info.arch})
      </dd>
      <dt>Electron</dt>
      <dd>{info.electron}</dd>
      <dt>Chromium</dt>
      <dd>{info.chrome}</dd>
      <dt>Node.js</dt>
      <dd>{info.node}</dd>
      <dt>Modo</dt>
      <dd>{info.isPackaged ? 'Aplicación empaquetada' : 'Desarrollo'}</dd>
      <dt>Datos de usuario</dt>
      <dd className="mono">{info.userDataPath}</dd>
    </dl>
  )
}
