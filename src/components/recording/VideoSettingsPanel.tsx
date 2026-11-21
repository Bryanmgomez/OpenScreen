import { SlidersHorizontal, Video } from 'lucide-react'
import { EncodingSettings, FpsSelect, QualitySelect } from '@/components/recording/EncodingSettings'
import { Panel } from '@/components/ui/Panel'
import { SettingRow } from '@/components/ui/SettingRow'
import { Switch } from '@/components/ui/Switch'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * Ajustes rápidos de vídeo (calidad, FPS, cursor). El resto de la codificación (perfil, formato,
 * códec, aceleración…) queda en «Opciones avanzadas» y comparte exactamente los mismos ajustes.
 */
export function VideoSettingsPanel() {
  const { settings, update } = useSettingsStore()
  const status = useRecordingStore((state) => state.status)
  const busy = useRecordingStore((state) => state.busy)
  if (!settings) return null

  const active = status.state === 'recording' || status.state === 'paused'
  const { showCursor, quality } = settings.recording

  return (
    <Panel title="Ajustes de vídeo" icon={<Video size={15} />}>
      <div className="quick-settings">
        <SettingRow label="Calidad">
          <QualitySelect hideLabel disabled={busy || active} />
        </SettingRow>
        <SettingRow label="FPS">
          <FpsSelect hideLabel disabled={busy || active} />
        </SettingRow>
        <SettingRow
          label="Mostrar cursor"
          description="Incluye el puntero cuando la API de captura lo permite."
        >
          <Switch
            label="Mostrar cursor"
            checked={showCursor}
            disabled={busy}
            onChange={(next) => void update({ recording: { showCursor: next } })}
          />
        </SettingRow>
      </div>

      <details className="disclosure" open={quality === 'custom' ? true : undefined}>
        <summary>
          <SlidersHorizontal size={14} /> Opciones avanzadas de codificación
        </summary>
        <div className="disclosure__body">
          <EncodingSettings disabled={busy || active} omit={['fps', 'quality']} />
        </div>
      </details>
    </Panel>
  )
}
