import { BrowserWindow } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../../shared/channels'
import { settingsPatchSchema } from '../../../shared/settings'
import type { SettingsService } from '../../services/settings/settingsService'
import { handle } from './register'

export function registerSettingsHandlers(settings: SettingsService): void {
  handle(IPC_CHANNELS.settings.get, z.undefined(), () => settings.get())
  handle(IPC_CHANNELS.settings.update, settingsPatchSchema, (patch) => settings.update(patch))

  // Cualquier cambio (venga de donde venga) se notifica a todas las ventanas abiertas.
  settings.onChange((next) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(IPC_CHANNELS.settings.changed, next)
    }
  })
}
