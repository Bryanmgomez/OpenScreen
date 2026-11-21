import { create } from 'zustand'
import type { Unsubscribe } from '@shared/api'
import type {
  DiagnosticsSnapshot,
  HardwareInfo,
  ShortcutTriggerPayload,
  ShortcutsStatus,
  SystemCapabilities
} from '@shared/system'
import { getApi } from '@/services/ipc'
import { toMessage } from '@/utils/errors'

interface SystemState {
  capabilities: SystemCapabilities | null
  hardware: HardwareInfo | null
  shortcuts: ShortcutsStatus | null
  diagnostics: DiagnosticsSnapshot | null
  error: string | null
  releasing: boolean
  init: () => Promise<void>
  refreshDiagnostics: () => Promise<void>
  releaseResources: () => Promise<void>
  onShortcut: (listener: (payload: ShortcutTriggerPayload) => void) => Unsubscribe
}

let unsubscribeShortcut: Unsubscribe | null = null
let unsubscribeError: Unsubscribe | null = null

/** Reflejo de las capacidades reales y del diagnóstico informado por main. */
export const useSystemStore = create<SystemState>((set, get) => ({
  capabilities: null,
  hardware: null,
  shortcuts: null,
  diagnostics: null,
  error: null,
  releasing: false,

  init: async () => {
    try {
      const api = getApi()
      unsubscribeShortcut?.()
      unsubscribeError?.()
      unsubscribeShortcut = api.system.onShortcutTriggered(() => undefined)
      unsubscribeError = api.system.onError((item) => {
        const current = get().diagnostics
        if (!current) return
        set({
          diagnostics: {
            ...current,
            errors: [item, ...current.errors.filter((error) => error.id !== item.id)].slice(0, 50),
            generatedAt: Date.now()
          }
        })
      })
      const [capabilities, hardware, shortcuts, diagnostics] = await Promise.all([
        api.system.getCapabilities(),
        api.system.getHardwareInfo(),
        api.system.getShortcutsStatus(),
        api.system.getDiagnostics()
      ])
      set({ capabilities, hardware, shortcuts, diagnostics, error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    }
  },

  refreshDiagnostics: async () => {
    try {
      const [diagnostics, shortcuts, hardware] = await Promise.all([
        getApi().system.getDiagnostics(),
        getApi().system.getShortcutsStatus(),
        getApi().system.getHardwareInfo()
      ])
      set({ diagnostics, shortcuts, hardware, error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    }
  },

  releaseResources: async () => {
    set({ releasing: true })
    try {
      await getApi().system.releaseResources()
      await get().refreshDiagnostics()
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ releasing: false })
    }
  },

  onShortcut: (listener) => getApi().system.onShortcutTriggered(listener)
}))

