import { create } from 'zustand'
import {
  DEFAULT_AUDIO_SETTINGS,
  type AudioDevice,
  type AudioSettings,
  type AudioSupport,
  type AudioTrackKind,
  type AudioTrackSettings
} from '@shared/audio'
import { getApi } from '@/services/ipc'
import { getAudioLevels, setAudioGain } from '@/audio/audioEngine'
import { useSettingsStore } from '@/store/settingsStore'
import { toMessage } from '@/utils/errors'

type Levels = Record<AudioTrackKind, number>

interface AudioState {
  support: AudioSupport | null
  devices: AudioDevice[]
  levels: Levels
  error: string | null
  requesting: boolean
  init: () => Promise<void>
  refreshDevices: (requestPermission?: boolean) => Promise<void>
  updateTrack: (kind: AudioTrackKind, patch: Partial<AudioTrackSettings>) => Promise<void>
  updateSystem: (patch: Partial<AudioSettings['system']>) => Promise<void>
  setSeparateTracks: (enabled: boolean) => Promise<void>
  pollLevels: () => void
}

let unsubscribeDevices: (() => void) | null = null

function fallbackLabel(device: MediaDeviceInfo, index: number): string {
  if (device.label) return device.label
  return device.kind === 'audioinput' ? `Entrada ${index + 1}` : 'Dispositivo'
}

function toAudioDevice(device: MediaDeviceInfo, index: number): AudioDevice {
  return {
    id: device.deviceId,
    label: fallbackLabel(device, index),
    groupId: device.groupId || null,
    kind: 'audioinput'
  }
}

/**
 * Reflejo de los dispositivos reales y de los ajustes de audio. El motor (`audioEngine`) es
 * quien posee los tracks; aquí solo se enumeran, se persisten preferencias y se muestran niveles.
 */
export const useAudioStore = create<AudioState>((set, get) => ({
  support: null,
  devices: [],
  levels: { microphone: 0, system: 0 },
  error: null,
  requesting: false,

  init: async () => {
    try {
      const support = await getApi().audio.getSupport()
      set({ support, error: null })
      await get().refreshDevices(false)
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
        unsubscribeDevices?.()
        const onDeviceChange = (): void => {
          void get().refreshDevices(false)
        }
        navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
        unsubscribeDevices = () =>
          navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
      }
    } catch (error) {
      set({ error: toMessage(error) })
    }
  },

  refreshDevices: async (requestPermission = false) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      set({ error: 'Este entorno no permite enumerar dispositivos de audio.' })
      return
    }
    set({ requesting: requestPermission })
    try {
      if (requestPermission) {
        // Se pide una sola vez para obtener etiquetas reales; el track se libera al instante.
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        probe.getTracks().forEach((track) => track.stop())
      }
      const devices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => toAudioDevice(device, index))
      const settings = useSettingsStore.getState().settings?.audio
      const missing: string[] = []
      if (settings?.microphone.deviceId && !devices.some((d) => d.id === settings.microphone.deviceId)) {
        missing.push('micrófono')
      }
      if (
        settings?.system.mode === 'device' &&
        settings.system.deviceId &&
        !devices.some((d) => d.id === settings.system.deviceId)
      ) {
        missing.push('audio del sistema')
      }
      set({
        devices,
        error: missing.length ? `Desconectado: ${missing.join(' y ')}. Elige otro dispositivo.` : null
      })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ requesting: false })
    }
  },

  updateTrack: async (kind, patch) => {
    const current = useSettingsStore.getState().settings?.audio ?? DEFAULT_AUDIO_SETTINGS
    if (kind === 'microphone') {
      const microphone = { ...current.microphone, ...patch }
      setAudioGain('microphone', microphone)
      await useSettingsStore.getState().update({ audio: { microphone } })
      return
    }
    const system = { ...current.system, ...patch }
    setAudioGain('system', system)
    await useSettingsStore.getState().update({ audio: { system } })
  },

  updateSystem: async (patch) => {
    const current = useSettingsStore.getState().settings?.audio ?? DEFAULT_AUDIO_SETTINGS
    const system = { ...current.system, ...patch }
    setAudioGain('system', system)
    await useSettingsStore.getState().update({ audio: { system } })
  },

  setSeparateTracks: async (enabled) => {
    await useSettingsStore.getState().update({ audio: { separateTracks: enabled } })
  },

  pollLevels: () => set({ levels: getAudioLevels() })
}))

export function disposeAudioStore(): void {
  unsubscribeDevices?.()
  unsubscribeDevices = null
}
