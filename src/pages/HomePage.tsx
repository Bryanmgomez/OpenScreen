import { useState } from 'react'
import { Circle, Film, History, Mic, Monitor } from 'lucide-react'
import { Link } from 'react-router-dom'
import { VideoPlayerModal } from '@/components/recordings/VideoPlayerModal'
import { Logo } from '@/components/brand/Logo'
import { Panel } from '@/components/ui/Panel'
import { SettingRow } from '@/components/ui/SettingRow'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useRecordings } from '@/hooks/useRecordings'
import { RecordingCard } from '@/components/recordings/RecordingCard'
import { useSettingsStore } from '@/store/settingsStore'

export function HomePage() {
  const { items, getMediaUrl } = useRecordings()
  const settings = useSettingsStore((state) => state.settings)
  const recent = items.slice(0, 3)
  const [player, setPlayer] = useState<{ recording: (typeof items)[number]; src: string } | null>(null)

  const play = async (path: string): Promise<void> => {
    const recording = items.find((item) => item.path === path)
    if (!recording) return
    const src = await getMediaUrl(path)
    if (src) setPlayer({ recording, src })
  }

  return (
    <div className="page">
      <section className="hero">
        <Logo size={56} />
        <div className="hero__text">
          <h1>OpenScreen</h1>
          <p>Grabador de pantalla de código abierto.</p>
          <StatusIndicator tone="success" label="Captura y grabación disponibles" />
        </div>
        <div className="hero__actions">
          <Link className="btn btn--danger btn--lg" to="/recording">
            <Circle size={16} fill="currentColor" />
            Iniciar grabación
          </Link>
        </div>
      </section>

      <div className="grid-2">
        <Panel
          title="Captura"
          icon={<Monitor size={16} />}
          action={
            <Link className="btn btn--ghost" to="/recording">
              Elegir fuente
            </Link>
          }
        >
          <div className="stack">
            <p className="card__description">
              Los monitores y ventanas reales se detectan automáticamente. Selecciona la fuente y
              comprueba su vista previa en la pantalla de Grabación.
            </p>
            <StatusIndicator tone="success" label="Fuentes de captura disponibles" />
          </div>
        </Panel>

        <Panel title="Ajustes rápidos" icon={<Film size={16} />}>
          <SettingRow label="Resolución">
            <StatusIndicator tone="success" label={settings?.recording.resolution ?? 'Original'} />
          </SettingRow>
          <SettingRow label="FPS">
            <StatusIndicator tone="success" label={`${settings?.recording.fps ?? 30} fps`} />
          </SettingRow>
          <SettingRow label="Audio del sistema">
            <StatusIndicator tone="success" label="Mezclador disponible" />
          </SettingRow>
          <SettingRow label="Micrófono">
            <Link className="btn btn--ghost" to="/settings">Configurar</Link>
          </SettingRow>
          <div className="panel__note">
            <Mic size={12} /> Calidad y codificación: Sesión 06
          </div>
        </Panel>
      </div>

      <Panel
        title="Grabaciones recientes"
        icon={<History size={16} />}
        action={
          <Link className="btn btn--ghost" to="/library">
            Ver todas
          </Link>
        }
      >
        {recent.length > 0 ? (
          <div className="rec-grid">
            {recent.map((recording) => (
              <RecordingCard
                key={recording.id}
                recording={recording}
                onPlay={(path) => void play(path)}
              />
            ))}
          </div>
        ) : (
          <p className="card__description">
            Aún no hay grabaciones. Detén una grabación para verla aquí.
          </p>
        )}
      </Panel>
      <VideoPlayerModal
        recording={player?.recording ?? null}
        src={player?.src ?? null}
        onClose={() => setPlayer(null)}
      />
    </div>
  )
}
