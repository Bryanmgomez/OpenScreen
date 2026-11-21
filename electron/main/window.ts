import { app, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../../shared/channels'
import type { Settings } from '../../shared/settings'
import { devServerUrl } from './security/renderer'

const BACKGROUND = { dark: '#0b0d12', light: '#f4f5f7' } as const

/** Color de fondo inicial para evitar un destello blanco antes de que cargue la interfaz. */
function initialBackground(theme: Settings['appearance']['theme']): string {
  const dark = theme === 'system' ? nativeTheme.shouldUseDarkColors : theme === 'dark'
  return dark ? BACKGROUND.dark : BACKGROUND.light
}

export function createMainWindow(settings: Settings): BrowserWindow {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    title: 'OpenScreen',
    backgroundColor: initialBackground(settings.appearance.theme),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: !app.isPackaged
    }
  })

  win.once('ready-to-show', () => win.show())

  const notifyMaximized = (maximized: boolean): void => {
    if (!win.isDestroyed()) win.webContents.send(IPC_CHANNELS.window.maximizedChanged, maximized)
  }
  win.on('maximize', () => notifyMaximized(true))
  win.on('unmaximize', () => notifyMaximized(false))

  const devUrl = devServerUrl()
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
