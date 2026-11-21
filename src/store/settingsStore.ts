import { create } from 'zustand'
import type { Unsubscribe } from '@shared/api'
import type { Settings, SettingsPatch } from '@shared/settings'
import { getApi } from '@/services/ipc'
import { toMessage } from '@/utils/errors'

interface SettingsState {
  /** `null` hasta que se cargan los ajustes desde el proceso main. */
  settings: Settings | null
  error: string | null
  init: () => Promise<void>
  update: (patch: SettingsPatch) => Promise<void>
}

let unsubscribe: Unsubscribe | null = null

/** La fuente de verdad de los ajustes es el proceso main; el store es solo un reflejo. */
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  error: null,

  init: async () => {
    try {
      const api = getApi()
      unsubscribe?.()
      unsubscribe = api.settings.onChange((settings) => set({ settings }))
      set({ settings: await api.settings.get(), error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    }
  },

  update: async (patch) => {
    try {
      set({ settings: await getApi().settings.update(patch), error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    }
  }
}))
