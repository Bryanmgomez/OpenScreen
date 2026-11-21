import type {
  CaptureRegion,
  CaptureSnapshot,
  SourceRef
} from './capture'
import type { Settings, SettingsPatch } from './settings'

/** Función que cancela una suscripción a un evento del proceso main. */
export type Unsubscribe = () => void

export type PlatformName = 'win32' | 'darwin' | 'linux' | 'other'

/** Información real del entorno en el que se ejecuta la aplicación. */
export interface AppInfo {
  name: string
  version: string
  platform: PlatformName
  arch: string
  electron: string
  chrome: string
  node: string
  userDataPath: string
  isPackaged: boolean
}

/**
 * Contrato de la API que el preload expone en `window.openscreen`.
 * Es la única superficie por la que el renderer puede hablar con el proceso main.
 * Cada método corresponde a un canal IPC validado en main (ver docs/ipc.md).
 */
export interface OpenScreenApi {
  app: {
    getInfo(): Promise<AppInfo>
  }
  window: {
    minimize(): Promise<void>
    /** Devuelve el estado de maximizado resultante. */
    toggleMaximize(): Promise<boolean>
    close(): Promise<void>
    isMaximized(): Promise<boolean>
    onMaximizedChange(listener: (maximized: boolean) => void): Unsubscribe
  }
  settings: {
    get(): Promise<Settings>
    update(patch: SettingsPatch): Promise<Settings>
    onChange(listener: (settings: Settings) => void): Unsubscribe
  }
  /** Detección y selección de fuentes reales (monitores, ventanas y región). */
  capture: {
    getSnapshot(): Promise<CaptureSnapshot>
    selectSource(ref: SourceRef): Promise<CaptureSnapshot>
    setRegion(region: CaptureRegion): Promise<CaptureSnapshot>
    clearSelection(): Promise<CaptureSnapshot>
    onSourcesChange(listener: (snapshot: CaptureSnapshot) => void): Unsubscribe
  }
}
