import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'node:path'
import { AudioService } from '../services/audio/audioService'
import { resolveSystemAudioGrant } from '../services/audio/model'
import { CaptureService } from '../services/capture/captureService'
import { FfmpegService } from '../services/recording/ffmpegService'
import { RecordingService } from '../services/recording/recordingService'
import { SettingsService } from '../services/settings/settingsService'
import { registerIpcHandlers } from './ipc'
import { applySessionSecurity, applyWebContentsHardening } from './security/session'
import { createMainWindow } from './window'

// Debe fijarse antes de `ready`: determina la carpeta de datos del usuario (userData).
app.setName('OpenScreen')

// Una sola instancia: evita ventanas duplicadas y grabaciones simultáneas accidentales.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null
  let quitting = false

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
      const audioService = new AudioService()
      const capture = new CaptureService(settings)
      const ffmpeg = new FfmpegService(() => settings.get().recording.ffmpegPath)
      const recording = new RecordingService({
        settings,
        capture,
        getVideosPath: () => app.getPath('videos'),
        getAudioSupport: () => audioService.getSupport(),
        ffmpeg,
        reveal: (path) => shell.showItemInFolder(path),
        open: (path) => {
          void shell.openPath(path)
        }
      })
      registerIpcHandlers({ settings, audio: audioService, capture, recording })
      capture.startWatching()
      app.on('before-quit', (event) => {
        if (quitting) return
        // La finalización del archivo es asíncrona: hay que esperarla antes de salir.
        event.preventDefault()
        quitting = true
        capture.stopWatching()
        void recording.dispose().finally(() => {
          app.quit()
        })
      })

      /**
       * `getDisplayMedia` no permite seleccionar fuente por `deviceId` (spec). El renderer
       * pide un stream y main concede exactamente la fuente que el usuario eligió.
       * Si la referencia caducó, se deniega en lugar de capturar otra cosa.
       */
      session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
        try {
          const source = await capture.resolveSelectedSource()
          if (!source) return callback(null)
          const support = audioService.getSupport()
          const systemAudio = resolveSystemAudioGrant({
            platform: support.platform,
            requested: request.audioRequested,
            support: support.systemAudio,
            settings: settings.get().audio
          })
          callback({
            video: source,
            ...(systemAudio ? { audio: systemAudio } : {})
          })
        } catch {
          callback(null)
        }
      })

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
