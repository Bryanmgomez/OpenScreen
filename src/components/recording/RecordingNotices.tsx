import { useRecordingStore } from '@/store/recordingStore'
import { useCaptureStore } from '@/store/captureStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Badge } from '@/components/ui/Badge'

/** Avisos y resultado de la última grabación, tal como los informa el motor real. */
export function RecordingNotices() {
  const snapshot = useCaptureStore((state) => state.snapshot)
  const format = useSettingsStore((state) => state.settings?.recording.format)
  const { status, error, ffmpegAvailable, cursorHonored, planWarnings } = useRecordingStore()
  const selection = snapshot?.selection ?? null
  const mp4Unavailable = format === 'mp4' && ffmpegAvailable === false

  return (
    <div className="notices">
      {!selection && <p className="notice">Selecciona un monitor o una ventana antes de grabar.</p>}
      {selection && !snapshot?.selectionAvailable && (
        <p className="notice notice--error">La fuente guardada desapareció. Elige otra.</p>
      )}
      {error && <p className="notice notice--error">{error}</p>}
      {planWarnings.map((warning) => (
        <p className="notice" key={warning}>
          {warning}
        </p>
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
  )
}
