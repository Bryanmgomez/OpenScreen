import { StatusIndicator, type StatusTone } from '@/components/ui/StatusIndicator'
import { useCaptureStore } from '@/store/captureStore'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'

const STATE_LABELS: Record<string, string> = {
  idle: 'Listo',
  starting: 'Preparando',
  recording: 'Grabando',
  paused: 'En pausa',
  stopping: 'Finalizando',
  error: 'Error'
}

const QUALITY_LABELS: Record<string, string> = {
  low: 'Baja',
  balanced: 'Media',
  high: 'Alta',
  custom: 'Personalizada'
}

function toneFor(state: string): StatusTone {
  if (state === 'recording') return 'recording'
  if (state === 'paused' || state === 'starting' || state === 'stopping') return 'pending'
  if (state === 'error') return 'error'
  return 'success'
}

/**
 * Barra de estado inferior. Todo lo que muestra sale del estado real (grabación, fuente y
 * ajustes guardados); no hay indicadores decorativos.
 */
export function StatusBar() {
  const state = useRecordingStore((store) => store.status.state)
  const selection = useCaptureStore((store) => store.snapshot?.selection ?? null)
  const recording = useSettingsStore((store) => store.settings?.recording)

  return (
    <footer className="statusbar">
      <div className="statusbar__group">
        <StatusIndicator tone={toneFor(state)} label={STATE_LABELS[state] ?? 'Listo'} />
        <span className="statusbar__item">
          Fuente: {selection ? selection.name : 'sin seleccionar'}
        </span>
      </div>
      {recording && (
        <div className="statusbar__group">
          <span className="statusbar__item">Formato: {recording.format.toUpperCase()}</span>
          <span className="statusbar__item">
            Calidad: {QUALITY_LABELS[recording.quality] ?? recording.quality}
          </span>
          <span className="statusbar__item">
            {recording.resolution === 'original' ? 'Resolución original' : recording.resolution}
          </span>
          <span className="statusbar__item">{recording.fps} FPS</span>
        </div>
      )}
    </footer>
  )
}
