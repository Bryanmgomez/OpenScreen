import { app, BrowserWindow, dialog, session, shell } from 'electron'
import { join } from 'node:path'
import { AudioService } from '../services/audio/audioService'
import { resolveSystemAudioGrant } from '../services/audio/model'
import type { Settings } from '../../shared/settings'
import { CaptureService } from '../services/capture/captureService'
import { FfmpegService } from '../services/recording/ffmpegService'
import { RecordingService } from '../services/recording/recordingService'
import { SettingsService } from '../services/settings/settingsService'
import { SystemService } from '../services/system/systemService'
import { registerIpcHandlers } from './ipc'
import {
  registerRecordingMediaProtocol,
  registerRecordingMediaScheme
} from './mediaProtocol'
import { applySessionSecurity, applyWebContentsHardening } from './security/session'
import { createTrayIcon } from './trayIcon'
import { createMainWindow } from './window'

// Debe fijarse antes de `ready`: determina la carpeta de datos del usuario (userData)
// y registra el esquema privado usado por el reproductor y las miniaturas.
app.setName('OpenScreen')
registerRecordingMediaScheme()

// Una sola instancia: evita ventanas duplicadas y grabaciones simultáneas accidentales.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null
  let quitting = false
  let initialWindowShown = false

  const showMainWindow = (settings: SettingsService): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      return
    }
    mainWindow = createMainWindow(settings.get(), {
      startMinimized: !initialWindowShown && settings.get().general.startMinimized
    })
    initialWindowShown = true
    mainWindow.on('closed', () => {
      mainWindow = null
    })
    mainWindow.on('close', (event) => {
      if (quitting) return
      if (!settings.get().general.minimizeOnClose) return
      event.preventDefault()
      mainWindow?.hide()
    })
  }

  // Se asigna dentro de `whenReady`; `second-instance` puede llegar antes de que termine.
  let readySettings: SettingsService | null = null

  app.on('second-instance', () => {
    const settings = readySettings
    if (settings) showMainWindow(settings)
  })

  applyWebContentsHardening()

  app
    .whenReady()
    .then(async () => {
      applySessionSecurity()

      const settings = new SettingsService(join(app.getPath('userData'), 'settings.json'))
      await settings.load()
      readySettings = settings
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
      const system = new SystemService({
        settings,
        getResourceCounts: () => ({
          ...recording.getResourceCounts(),
          activeFfmpegProcesses: ffmpeg.activeProcessCount
        }),
        terminateManagedMediaProcesses: () => {
          ffmpeg.terminateProcesses()
        },
        getTrayIcon: () => createTrayIcon(),
        onTrayShow: () => showMainWindow(settings),
        // `before-quit` es el único lugar que marca `quitting` y ejecuta la limpieza.
        onTrayQuit: () => app.quit()
      })
      system.installErrorHandlers()
      system.applySettings(settings.get())
      const trayRequired = (value: Settings): boolean =>
        value.general.minimizeOnClose || value.general.startMinimized
      let lastTrayRequired = trayRequired(settings.get())
      settings.onChange((next) => {
        system.applySettings(next)
        // Sin bandeja, una ventana oculta quedaría inaccesible: la mostramos al desactivar
        // la preferencia que la mantenía oculta.
        if (lastTrayRequired && !trayRequired(next) && mainWindow?.isVisible() === false) {
          mainWindow.show()
        }
        lastTrayRequired = trayRequired(next)
      })

      registerIpcHandlers({ settings, audio: audioService, capture, recording, system })
      registerRecordingMediaProtocol(() => recording.getOutputDir())
      capture.startWatching()

      // Aviso real solo cuando una grabación termina; se ignora el `lastRecording` restaurado.
      let notifiedPath = recording.getStatus().lastRecording?.path ?? null
      recording.onStatusChange((status) => {
        if (status.state !== 'idle' || !status.lastRecording) return
        if (status.lastRecording.path === notifiedPath) return
        notifiedPath = status.lastRecording.path
        system.notifyCompletion('Grabación completada', status.lastRecording.name)
      })

      app.on('before-quit', (event) => {
        if (quitting) return
        event.preventDefault()
        quitting = true
        capture.stopWatching()
        system.dispose()
        ffmpeg.terminateProcesses()
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

      showMainWindow(settings)

      app.on('activate', () => {
        showMainWindow(settings)
      })
    })
    .catch((error: unknown) => {
      console.error('[OpenScreen] Error fatal al iniciar:', error)
      void dialog.showErrorBox(
        'OpenScreen',
        error instanceof Error ? error.message : 'No se pudo iniciar la aplicación.'
      )
      app.exit(1)
    })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
