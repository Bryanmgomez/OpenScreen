import type { AudioService } from '../../services/audio/audioService'
import type { CaptureService } from '../../services/capture/captureService'
import type { RecordingService } from '../../services/recording/recordingService'
import type { SettingsService } from '../../services/settings/settingsService'
import type { SystemService } from '../../services/system/systemService'
import { registerAppHandlers } from './appHandlers'
import { registerAudioHandlers } from './audioHandlers'
import { registerCaptureHandlers } from './captureHandlers'
import { registerRecordingHandlers } from './recordingHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerSystemHandlers } from './systemHandlers'
import { registerWindowHandlers } from './windowHandlers'

export interface IpcDependencies {
  settings: SettingsService
  audio: AudioService
  capture: CaptureService
  recording: RecordingService
  system: SystemService
}

/** Punto único donde se registran todos los canales IPC. Añadir un módulo = añadir una línea. */
export function registerIpcHandlers({
  settings,
  audio,
  capture,
  recording,
  system
}: IpcDependencies): void {
  registerAppHandlers()
  registerWindowHandlers()
  registerSettingsHandlers(settings)
  registerAudioHandlers(audio)
  registerCaptureHandlers(capture)
  registerRecordingHandlers(recording)
  registerSystemHandlers(system)
}
