import type { OpenScreenApi } from '@shared/api'

declare global {
  interface Window {
    /** Expuesta por el preload. Puede faltar si la página se abre fuera de Electron. */
    openscreen?: OpenScreenApi
  }
}

export {}
