import { describe, expect, it } from 'vitest'
import { DEFAULT_AUDIO_SETTINGS } from '@shared/audio'
import { gainFor, trackLabel } from '@shared/audio'
import { resolveSystemAudioGrant } from '../electron/services/audio/model'
import {
  audioStateLabel,
  chooseAudioMimeType,
  isAudible,
  microphoneConstraints,
  virtualDeviceConstraints
} from '../src/audio/model'

describe('modelo de audio', () => {
  it('solo concede loopback en Windows y respeta muteOnCapture', () => {
    const settings = structuredClone(DEFAULT_AUDIO_SETTINGS)
    expect(
      resolveSystemAudioGrant({
        platform: 'win32',
        requested: true,
        support: 'available',
        settings
      })
    ).toBe('loopbackWithMute')

    settings.system.muteOnCapture = false
    expect(
      resolveSystemAudioGrant({
        platform: 'win32',
        requested: true,
        support: 'available',
        settings
      })
    ).toBe('loopback')

    // El valor `experimental` sigue concediéndose en Windows, pero no en otras plataformas.
    expect(
      resolveSystemAudioGrant({
        platform: 'win32',
        requested: true,
        support: 'experimental',
        settings
      })
    ).toBe('loopback')
    expect(
      resolveSystemAudioGrant({
        platform: 'darwin',
        requested: true,
        support: 'available',
        settings
      })
    ).toBeNull()
    expect(
      resolveSystemAudioGrant({
        platform: 'win32',
        requested: false,
        support: 'available',
        settings
      })
    ).toBeNull()
    expect(
      resolveSystemAudioGrant({
        platform: 'win32',
        requested: true,
        support: 'unavailable',
        settings
      })
    ).toBeNull()
  })

  it('elige un códec real y desactiva el procesamiento de voz en dispositivos virtuales', () => {
    expect(chooseAudioMimeType((type) => type === 'audio/webm;codecs=opus')).toBe(
      'audio/webm;codecs=opus'
    )
    expect(chooseAudioMimeType(() => false)).toBeNull()
    expect(microphoneConstraints('mic-1')).toMatchObject({
      deviceId: { exact: 'mic-1' },
      echoCancellation: true
    })
    expect(virtualDeviceConstraints('loopback-1')).toMatchObject({
      deviceId: { exact: 'loopback-1' },
      echoCancellation: false,
      noiseSuppression: false
    })
    expect(audioStateLabel('system')).toBe('Audio del sistema')
  })

  it('calcula ganancia y etiquetas sin inventar dispositivos', () => {
    expect(gainFor({ volume: 1.5, muted: false })).toBe(1.5)
    expect(gainFor({ volume: 1.5, muted: true })).toBe(0)
    expect(isAudible({ enabled: true, deviceId: null, volume: 0.5, muted: false })).toBe(true)
    expect(isAudible({ enabled: true, deviceId: null, volume: 0, muted: false })).toBe(false)
    expect(
      trackLabel('microphone', [], null)
    ).toBe('Micrófono predeterminado')
    expect(
      trackLabel(
        'system',
        [{ id: 'a', label: 'Cable A', groupId: null, kind: 'audioinput' }],
        'a'
      )
    ).toBe('Cable A')
    expect(
      trackLabel('system', [], 'desconocido')
    ).toBe('Dispositivo sin nombre')
  })
})
