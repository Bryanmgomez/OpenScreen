import { useEffect } from 'react'
import { startRecordingWithCurrentSettings } from '@/services/recordingActions'
import { useAudioStore } from '@/store/audioStore'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSystemStore } from '@/store/systemStore'

/** Ejecuta en el renderer las acciones solicitadas por los atajos globales registrados en main. */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    return useSystemStore.getState().onShortcut(({ action }) => {
      switch (action) {
        case 'start':
          void startRecordingWithCurrentSettings()
          break
        case 'pause':
          void useRecordingStore.getState().pause()
          break
        case 'resume':
          void useRecordingStore.getState().resume()
          break
        case 'stop':
          void useRecordingStore.getState().stop()
          break
        case 'toggleMicrophone': {
          const microphone = useSettingsStore.getState().settings?.audio.microphone
          if (!microphone) return
          void useAudioStore.getState().updateTrack('microphone', { muted: !microphone.muted })
          break
        }
      }
    })
  }, [])
}
