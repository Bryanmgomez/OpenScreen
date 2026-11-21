/**
 * Nombres de canales IPC. Única fuente de verdad compartida por main, preload y renderer.
 * Convención: `<dominio>:<acción>`. Los canales `invoke` son petición/respuesta;
 * los que terminan en `-changed` son eventos main → renderer.
 */
export const IPC_CHANNELS = {
  app: {
    getInfo: 'app:get-info'
  },
  window: {
    minimize: 'window:minimize',
    toggleMaximize: 'window:toggle-maximize',
    close: 'window:close',
    isMaximized: 'window:is-maximized',
    maximizedChanged: 'window:maximized-changed'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update',
    changed: 'settings:changed'
  }
} as const
