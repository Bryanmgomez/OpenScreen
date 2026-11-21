import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { SettingsService } from '../services/settings/settingsService'
import { registerIpcHandlers } from './ipc'
import { applySessionSecurity, applyWebContentsHardening } from './security/session'
import { createMainWindow } from './window'

// Debe fijarse antes de `ready`: determina la carpeta de datos del usuario (userData).
app.setName('OpenScreen')

// Una sola instancia: evita ventanas duplicadas y, más adelante, grabaciones simultáneas accidentales.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  const openMainWindow = (settings: SettingsService): void => {
    mainWindow = createMainWindow(settings.get())
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }

  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  applyWebContentsHardening()

  app
    .whenReady()
    .then(async () => {
      applySessionSecurity()

      const settings = new SettingsService(join(app.getPath('userData'), 'settings.json'))
      await settings.load()
      registerIpcHandlers({ settings })
      openMainWindow(settings)

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) openMainWindow(settings)
      })
    })
    .catch((error: unknown) => {
      console.error('[OpenScreen] Error fatal al iniciar:', error)
      app.exit(1)
    })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
