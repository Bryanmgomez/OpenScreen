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
  },
  capture: {
    getSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.capture.getSnapshot),
    selectSource: (ref) => ipcRenderer.invoke(IPC_CHANNELS.capture.selectSource, ref),
    setRegion: (region) => ipcRenderer.invoke(IPC_CHANNELS.capture.setRegion, region),
    clearSelection: () => ipcRenderer.invoke(IPC_CHANNELS.capture.clearSelection),
    onSourcesChange: (listener) => subscribe(IPC_CHANNELS.capture.sourcesChanged, listener)
  },
  recording: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.recording.getStatus),
    begin: (request) => ipcRenderer.invoke(IPC_CHANNELS.recording.begin, request),
    pause: () => ipcRenderer.invoke(IPC_CHANNELS.recording.pause),
    resume: () => ipcRenderer.invoke(IPC_CHANNELS.recording.resume),
    appendChunk: (chunk) => ipcRenderer.invoke(IPC_CHANNELS.recording.appendChunk, chunk),
    finish: (request) => ipcRenderer.invoke(IPC_CHANNELS.recording.finish, request),
    cancel: (request) => ipcRenderer.invoke(IPC_CHANNELS.recording.cancel, request),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.recording.list),
    reveal: (request) => ipcRenderer.invoke(IPC_CHANNELS.recording.reveal, request),
    open: (request) => ipcRenderer.invoke(IPC_CHANNELS.recording.open, request),
    delete: (request) => ipcRenderer.invoke(IPC_CHANNELS.recording.delete, request),
    pickOutputDir: () => ipcRenderer.invoke(IPC_CHANNELS.recording.pickOutputDir),
    checkFfmpeg: () => ipcRenderer.invoke(IPC_CHANNELS.recording.checkFfmpeg),
    onStatusChange: (listener) => subscribe(IPC_CHANNELS.recording.statusChanged, listener)
  }
}

contextBridge.exposeInMainWorld('openscreen', api)
