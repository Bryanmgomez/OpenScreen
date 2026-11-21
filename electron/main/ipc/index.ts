import type { SettingsService } from '../../services/settings/settingsService'
import { registerAppHandlers } from './appHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerWindowHandlers } from './windowHandlers'

export interface IpcDependencies {
  settings: SettingsService
}

/** Punto único donde se registran todos los canales IPC. Añadir un módulo = añadir una línea. */
export function registerIpcHandlers({ settings }: IpcDependencies): void {
  registerAppHandlers()
  registerWindowHandlers()
  registerSettingsHandlers(settings)
}
