import { FolderOpen, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { SettingRow } from '@/components/ui/SettingRow'
import { getApi } from '@/services/ipc'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'
import { toMessage } from '@/utils/errors'

/** Dónde y con qué nombre se guardan las grabaciones. */
export function OutputPanel() {
  const { settings, update } = useSettingsStore()
  const busy = useRecordingStore((state) => state.busy)
  if (!settings) return null
  const { fileNameTemplate, outputDir } = settings.recording

  const chooseOutputDir = async (): Promise<void> => {
    try {
      const dir = await getApi().recording.pickOutputDir()
      if (dir) await update({ recording: { outputDir: dir } })
    } catch (cause) {
      useRecordingStore.setState({ error: toMessage(cause) })
    }
  }

  return (
    <Panel title="Salida" icon={<HardDrive size={15} />}>
      <div className="stack stack--fill">
        <div className="field">
          <label className="field__label" htmlFor="recording-template">
            Plantilla de nombre
          </label>
          <input
            id="recording-template"
            className="input"
            value={fileNameTemplate}
            disabled={busy}
            onChange={(event) =>
              void update({ recording: { fileNameTemplate: event.target.value } })
            }
          />
          <span className="field__hint">Tokens: {'{source}'}, {'{date}'}, {'{time}'}</span>
        </div>
        <SettingRow
          label="Carpeta de destino"
          description={outputDir ?? 'Carpeta de vídeos del sistema'}
        >
          <Button icon={<FolderOpen size={13} />} onClick={() => void chooseOutputDir()} disabled={busy}>
            Elegir
          </Button>
        </SettingRow>
      </div>
    </Panel>
  )
}
