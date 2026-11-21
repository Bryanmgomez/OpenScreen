import { useAudioStore } from '@/store/audioStore'
import { useCaptureStore } from '@/store/captureStore'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * Inicia una grabación con la selección y las preferencias actuales. Se usa tanto desde el botón
 * como desde los atajos globales, para que ambos sigan exactamente el mismo camino.
 */
export async function startRecordingWithCurrentSettings(): Promise<void> {
  const settings = useSettingsStore.getState().settings
  const snapshot = useCaptureStore.getState().snapshot
  const support = useAudioStore.getState().support
  const recording = useRecordingStore.getState()
  if (!settings || !snapshot?.selection || !snapshot.selectionAvailable || !support) return
  if (recording.busy || (recording.status.state !== 'idle' && recording.status.state !== 'error')) {
    return
  }

  const { recording: preferences } = settings
  await recording.start({
    source: snapshot.selection,
    options: {
      showCursor: preferences.showCursor,
      quality: preferences.quality,
      format: preferences.format
    },
    preferences,
    audio: settings.audio,
    support
  })
}
