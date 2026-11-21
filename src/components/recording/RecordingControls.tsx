import { useEffect, useState } from 'react'
import { Circle, FolderOpen, Pause, Play, Square, Video, X } from 'lucide-react'
import { elapsedMs } from '@shared/recording'
import { AudioMixer } from '@/components/recording/AudioMixer'
import { EncodingSettings } from '@/components/recording/EncodingSettings'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { SettingRow } from '@/components/ui/SettingRow'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Switch } from '@/components/ui/Switch'
import { getApi } from '@/services/ipc'
import { startRecordingWithCurrentSettings } from '@/services/recordingActions'
import { useAudioStore } from '@/store/audioStore'
import { useCaptureStore } from '@/store/captureStore'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatDuration } from '@/utils/format'
import { toMessage } from '@/utils/errors'

function statusLabel(state: string): string {
  switch (state) {
    case 'recording':
      return 'Grabando'
    case 'paused':
      return 'En pausa'
    case 'starting':
      return 'Preparando'
    case 'stopping':
      return 'Finalizando'
    case 'error':
      return 'Error'
    default:
      return 'Inactiva'
  }
}

/** Controles reales del motor. El estado autoritativo siempre viene de main. */
export function RecordingControls() {
  const [, forceTick] = useState(0)
  const { settings, update } = useSettingsStore()
  const { snapshot } = useCaptureStore()
  const support = useAudioStore((state) => state.support)
  const {
    status,
    error,
    busy,
    ffmpegAvailable,
    cursorHonored,
    planWarnings,
    pause,
    resume,
    stop,
    cancel
  } = useRecordingStore()

  const active = status.state === 'recording' || status.state === 'paused'
  const selection = snapshot?.selection ?? null
  const canStart =
    (status.state === 'idle' || status.state === 'error') &&
    Boolean(selection && snapshot?.selectionAvailable && support) &&
    !busy

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => forceTick((value) => value + 1), 250)
    return () => window.clearInterval(timer)
  }, [active])

  if (!settings) return null
  const recording = settings.recording
  const mp4Unavailable = recording.format === 'mp4' && ffmpegAvailable === false

  const chooseOutputDir = async (): Promise<void> => {
    try {
      const dir = await getApi().recording.pickOutputDir()
      if (dir) await update({ recording: { outputDir: dir } })
    } catch (cause) {
      useRecordingStore.setState({ error: toMessage(cause) })
    }
  }

  const begin = async (): Promise<void> => {
    await startRecordingWithCurrentSettings()
  }

  return (
    <Panel title="Grabación" icon={<Video size={15} />} action={<Badge tone={active ? 'accent' : 'neutral'}>{statusLabel(status.state)}</Badge>}>
      <div className="stack">
        <div className="recording-meter">
          <StatusIndicator
            tone={
              status.state === 'recording'
                ? 'recording'
                : status.state === 'paused'
                  ? 'pending'
                  : status.state === 'error'
                    ? 'error'
                    : 'idle'
            }
            label={statusLabel(status.state)}
          />
          <span className="recording-meter__time" aria-label="Duración de la grabación">
            {formatDuration(elapsedMs(status))}
          </span>
        </div>

        <div className="toolbar">
          {!active ? (
            <Button variant="danger" icon={<Circle size={13} />} onClick={() => void begin()} disabled={!canStart}>
              Iniciar grabación
            </Button>
          ) : (
            <>
              {status.state === 'recording' ? (
                <Button icon={<Pause size={13} />} onClick={() => void pause()} disabled={busy}>
                  Pausar
                </Button>
              ) : (
                <Button icon={<Play size={13} />} onClick={() => void resume()} disabled={busy}>
                  Reanudar
                </Button>
              )}
              <Button variant="danger" icon={<Square size={13} />} onClick={() => void stop()} disabled={busy}>
                Detener
              </Button>
              <Button icon={<X size={13} />} onClick={() => void cancel()} disabled={busy}>
                Cancelar
              </Button>
            </>
          )}
        </div>

        {!selection && (
          <p className="notice">Selecciona un monitor o una ventana antes de grabar.</p>
        )}
        {selection && !snapshot?.selectionAvailable && (
          <p className="notice notice--error">La fuente guardada desapareció. Elige otra.</p>
        )}
        {error && <p className="notice notice--error">{error}</p>}
        {planWarnings.map((warning) => (
          <p className="notice" key={warning}>{warning}</p>
        ))}
        {status.encoding && (
          <p className="field__hint">
            Aplicado: {status.encoding.actualWidth ?? '?'}×{status.encoding.actualHeight ?? '?'} @{' '}
            {status.encoding.actualFps ?? '?'} fps
            {status.encoding.measuredFps !== null
              ? ` (medidos ${status.encoding.measuredFps.toFixed(1)} fps)`
              : ''}
            {' · '}
            {status.encoding.transcode ? 'transcodificado' : 'sin recodificar'}
          </p>
        )}
        {cursorHonored === false && (
          <p className="notice">
            Este sistema no permite ocultar el cursor mediante la API de captura; la preferencia se
            guarda, pero puede aparecer en el vídeo.
          </p>
        )}
        {mp4Unavailable && (
          <p className="notice">
            MP4 necesita FFmpeg instalado y accesible. WebM funciona sin dependencias externas.
          </p>
        )}

        <div className="recording-options">
          <SettingRow label="Mostrar cursor" description="Incluye el puntero en la grabación cuando la API lo permite.">
            <Switch
              label="Mostrar cursor"
              checked={recording.showCursor}
              disabled={busy}
              onChange={(showCursor) => void update({ recording: { showCursor } })}
            />
          </SettingRow>
          <EncodingSettings disabled={busy || active} />
          <div className="field">
            <label className="field__label" htmlFor="recording-template">
              Plantilla de nombre
            </label>
            <input
              id="recording-template"
              className="input"
              value={recording.fileNameTemplate}
              disabled={busy}
              onChange={(event) =>
                void update({ recording: { fileNameTemplate: event.target.value } })
              }
            />
            <span className="field__hint">Tokens: {'{source}'}, {'{date}'}, {'{time}'}</span>
          </div>
          <SettingRow
            label="Carpeta de destino"
            description={recording.outputDir ?? 'Carpeta de vídeos del sistema'}
          >
            <Button icon={<FolderOpen size={13} />} onClick={() => void chooseOutputDir()} disabled={busy}>
              Elegir
            </Button>
          </SettingRow>
        </div>

        <AudioMixer />

        {status.lastRecording && (
          <div className="recording-result">
            <Badge tone="success">Guardado</Badge>
            <span title={status.lastRecording.path}>{status.lastRecording.name}</span>
            {status.lastRecording.tracks.length > 0 && (
              <span className="field__hint">
                Pistas: {status.lastRecording.tracks.map((track) => track.name).join(', ')}
              </span>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
