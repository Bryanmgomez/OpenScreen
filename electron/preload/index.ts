import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { OpenScreenApi, Unsubscribe } from '../../shared/api'
import { IPC_CHANNELS } from '../../shared/channels'

/**
 * Preload: único puente entre el renderer (React) y el proceso main.
 *
 * Reglas:
 * - No se expone `ipcRenderer` ni ningún módulo de Node; solo funciones concretas.
 * - Los listeners de eventos reciben únicamente el dato, nunca el objeto `event` de Electron.
 * - La validación real de los argumentos ocurre en main (ver electron/main/ipc/register.ts).
 */
function subscribe<T>(channel: string, listener: (value: T) => void): Unsubscribe {
  const wrapped = (_event: IpcRendererEvent, value: T): void => listener(value)
  ipcRenderer.on(channel, wrapped)
  return () => {
    ipcRenderer.removeListener(channel, wrapped)
  }
}

const api: OpenScreenApi = {
  app: {
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.app.getInfo)
  },
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.window.minimize),
    toggleMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.window.toggleMaximize),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.window.close),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.window.isMaximized),
    onMaximizedChange: (listener) => subscribe(IPC_CHANNELS.window.maximizedChanged, listener)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settings.get),
    update: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settings.update, patch),
    onChange: (listener) => subscribe(IPC_CHANNELS.settings.changed, listener)
  }
}

contextBridge.exposeInMainWorld('openscreen', api)
