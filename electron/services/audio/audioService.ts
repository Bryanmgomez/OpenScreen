import { systemPreferences } from 'electron'
import type { AudioPermission, AudioPlatform, AudioSupport } from '../../../shared/audio'

function platformName(): AudioPlatform {
  const value = process.platform
  return value === 'win32' || value === 'darwin' || value === 'linux' ? value : 'other'
}

function microphonePermission(platform: AudioPlatform): AudioPermission {
  if (platform !== 'win32' && platform !== 'darwin') return 'unsupported'
  try {
    const status = systemPreferences.getMediaAccessStatus('microphone')
    return status === 'not-determined' ||
      status === 'granted' ||
      status === 'denied' ||
      status === 'restricted'
      ? status
      : 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Fuente de verdad de las capacidades de audio. Windows se declara compatible porque el loopback
 * se verificó con audio real (tono de 440 Hz capturado desde el escritorio, RMS > 0 en la pista
 * Opus/WebM generada por la app). macOS y Linux siguen sin ofrecer captura nativa: allí el usuario
 * debe enrutar el sonido a un dispositivo virtual, que no ha sido verificado por OpenScreen.
 */
export class AudioService {
  getSupport(): AudioSupport {
    const platform = platformName()
    const notes =
      platform === 'win32'
        ? [
            'Captura del sistema verificada en Windows con Electron loopback (loopbackWithMute): se grabó un tono real y su pista Opus/WebM contiene audio.',
            'El resultado depende de la configuración de audio de Windows; las pistas independientes se guardan como Opus/WebM y FFmpeg puede unirlas en un contenedor.'
          ]
        : [
            'Electron no expone loopback del sistema en esta plataforma.',
            'Puedes enrutar el audio a un dispositivo virtual y elegirlo en modo «Dispositivo»; no verificado por OpenScreen.'
          ]

    return {
      platform,
      microphonePermission: microphonePermission(platform),
      systemAudio: platform === 'win32' ? 'available' : 'unavailable',
      systemMethod: platform === 'win32' ? 'electron-loopback' : 'none',
      notes
    }
  }
}
