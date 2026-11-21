import { FolderOpen, Video } from 'lucide-react'
import type { RecordingFormat, RecordingQuality } from '@shared/recording'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { SettingRow } from '@/components/ui/SettingRow'
import { Switch } from '@/components/ui/Switch'
import { getApi } from '@/services/ipc'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'
import { toMessage } from '@/utils/errors'

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'balanced', label: 'Equilibrada' },
  { value: 'high', label: 'Alta' }
] as const

const FORMAT_OPTIONS = [
  { value: 'webm', label: 'WebM (nativo)' },
  { value: 'mp4', label: 'MP4 (FFmpeg)' }
] as const

/** Ajustes reales del motor de grabación; se persisten con `settings:update`. */
export function RecordingSection() {
  const { settings, update, error } = useSettingsStore()
  const ffmpegAvailable = useRecordingStore((state) => state.ffmpegAvailable)

  if (!settings) return null
  const recording = settings.recording

  const chooseOutputDir = async (): Promise<void> => {
    try {
      const dir = await getApi().recording.pickOutputDir()
      if (dir) await update({ recording: { outputDir: dir } })
    } catch (cause) {
      useRecordingStore.setState({ error: toMessage(cause) })
    }
  }

  return (
    <>
      {error && <p className="notice notice--error">{error}</p>}
      <Card title="Salida de vídeo" icon={<Video size={18} />}>
        <SettingRow label="Mostrar cursor" description="Incluye el puntero cuando la API de captura lo permite.">
          <Switch
            label="Mostrar cursor"
            checked={recording.showCursor}
            onChange={(showCursor) => void update({ recording: { showCursor } })}
          />
        </SettingRow>
        <SettingRow label="Calidad" description="Bitrate objetivo del codificador.">
          <Select
            label="Calidad"
            hideLabel
            value={recording.quality}
            options={QUALITY_OPTIONS}
            onChange={(value) => void update({ recording: { quality: value as RecordingQuality } })}
          />
        </SettingRow>
        <SettingRow
          label="Formato"
          description={recording.format === 'mp4' ? 'Requiere FFmpeg instalado.' : 'WebM nativo, sin dependencias.'}
        >
          <Select
            label="Formato"
            hideLabel
            value={recording.format}
            options={FORMAT_OPTIONS}
            onChange={(value) => void update({ recording: { format: value as RecordingFormat } })}
          />
        </SettingRow>
        <SettingRow
          label="FFmpeg"
          description={ffmpegAvailable === null ? 'Comprobando…' : ffmpegAvailable ? 'Disponible en PATH o en la ruta configurada.' : 'No disponible. WebM sigue funcionando.'}
        >
          <Badge tone={ffmpegAvailable ? 'success' : ffmpegAvailable === null ? 'neutral' : 'warning'}>
            {ffmpegAvailable === null ? '…' : ffmpegAvailable ? 'Sí' : 'No'}
          </Badge>
        </SettingRow>
        <div className="field">
          <label className="field__label" htmlFor="ffmpeg-path">Ruta de FFmpeg (opcional)</label>
          <input
            id="ffmpeg-path"
            className="input"
            value={recording.ffmpegPath ?? ''}
            placeholder="ffmpeg"
            onChange={(event) =>
              void update({ recording: { ffmpegPath: event.target.value || null } })
            }
          />
          <span className="field__hint">Vacío = buscar `ffmpeg` en PATH. Se ejecuta con argumentos, nunca con shell.</span>
        </div>
      </Card>

      <Card title="Destino" icon={<FolderOpen size={18} />}>
        <SettingRow
          label="Carpeta de grabaciones"
          description={recording.outputDir ?? 'Carpeta de vídeos del sistema'}
        >
          <Button icon={<FolderOpen size={14} />} onClick={() => void chooseOutputDir()}>
            Elegir
          </Button>
        </SettingRow>
        <div className="field">
          <label className="field__label" htmlFor="file-template">Plantilla de nombre</label>
          <input
            id="file-template"
            className="input"
            value={recording.fileNameTemplate}
            onChange={(event) =>
              void update({ recording: { fileNameTemplate: event.target.value } })
            }
          />
          <span className="field__hint">Tokens: {'{source}'}, {'{date}'}, {'{time}'}, {'{ext}'}</span>
        </div>
      </Card>
    </>
  )
}
