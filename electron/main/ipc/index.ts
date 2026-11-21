import type { CaptureService } from '../../services/capture/captureService'
import type { SettingsService } from '../../services/settings/settingsService'
import { registerAppHandlers } from './appHandlers'
import { registerCaptureHandlers } from './captureHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerWindowHandlers } from './windowHandlers'

export interface IpcDependencies {
  settings: SettingsService
  capture: CaptureService
}

/** Punto único donde se registran todos los canales IPC. Añadir un módulo = añadir una línea. */
export function registerIpcHandlers({ settings, capture }: IpcDependencies): void {
  registerAppHandlers()
  registerWindowHandlers()
  registerSettingsHandlers(settings)
  registerCaptureHandlers(capture)
}
