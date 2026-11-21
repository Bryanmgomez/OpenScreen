import type {
  AudioPlatform,
  AudioSettings,
  AudioSystemSupport
} from '../../../shared/audio'

/** Decide qué fuente de audio del sistema puede conceder main. Nunca inventa loopback. */
export function resolveSystemAudioGrant(input: {
  platform: AudioPlatform
  requested: boolean
  support: AudioSystemSupport
  settings: AudioSettings
}): 'loopback' | 'loopbackWithMute' | null {
  const { system } = input.settings
  if (!input.requested || !system.enabled || system.mode !== 'auto') return null
  if (input.platform !== 'win32' || input.support === 'unavailable') return null
  return system.muteOnCapture ? 'loopbackWithMute' : 'loopback'
}
