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
  },
  capture: {
    getSnapshot: 'capture:get-snapshot',
    selectSource: 'capture:select-source',
    setRegion: 'capture:set-region',
    clearSelection: 'capture:clear-selection',
    sourcesChanged: 'capture:sources-changed'
  },
  audio: {
    getSupport: 'audio:get-support'
  },
  recording: {
    getStatus: 'recording:get-status',
    begin: 'recording:begin',
    pause: 'recording:pause',
    resume: 'recording:resume',
    appendChunk: 'recording:append-chunk',
    appendAudio: 'recording:append-audio',
    audioState: 'recording:audio-state',
    finish: 'recording:finish',
    cancel: 'recording:cancel',
    list: 'recording:list',
    reveal: 'recording:reveal',
    open: 'recording:open',
    delete: 'recording:delete',
    rename: 'recording:rename',
    cleanupTemp: 'recording:cleanup-temp',
    getStorageInfo: 'recording:get-storage-info',
    getMediaUrl: 'recording:get-media-url',
    pickOutputDir: 'recording:pick-output-dir',
    checkFfmpeg: 'recording:check-ffmpeg',
    getEncodingCapabilities: 'recording:get-encoding-capabilities',
    statusChanged: 'recording:status-changed'
  }
} as const
