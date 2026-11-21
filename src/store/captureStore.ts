import { create } from 'zustand'
import type { Unsubscribe } from '@shared/api'
import type { CaptureRegion, CaptureSnapshot, SourceRef } from '@shared/capture'
import { getApi } from '@/services/ipc'
import { toMessage } from '@/utils/errors'

interface CaptureState {
  /** `null` mientras se consultan las fuentes reales al proceso main. */
  snapshot: CaptureSnapshot | null
  error: string | null
  busy: boolean
  init: () => Promise<void>
  refresh: () => Promise<void>
  selectSource: (ref: SourceRef) => Promise<void>
  setRegion: (region: CaptureRegion) => Promise<void>
  clearSelection: () => Promise<void>
}

let unsubscribeSnapshot: Unsubscribe | null = null

/** Main es la fuente de verdad: aquí solo se refleja la última instantánea recibida. */
export const useCaptureStore = create<CaptureState>((set) => ({
  snapshot: null,
  error: null,
  busy: false,

  init: async () => {
    try {
      const api = getApi()
      unsubscribeSnapshot?.()
      unsubscribeSnapshot = api.capture.onSourcesChange((snapshot) => set({ snapshot }))
      set({ snapshot: await api.capture.getSnapshot(), error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    }
  },

  refresh: async () => {
    set({ busy: true })
    try {
      set({ snapshot: await getApi().capture.getSnapshot(), error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ busy: false })
    }
  },

  selectSource: async (ref) => {
    set({ busy: true })
    try {
      set({ snapshot: await getApi().capture.selectSource(ref), error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ busy: false })
    }
  },

  setRegion: async (region) => {
    set({ busy: true })
    try {
      set({ snapshot: await getApi().capture.setRegion(region), error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ busy: false })
    }
  },

  clearSelection: async () => {
    set({ busy: true })
    try {
      set({ snapshot: await getApi().capture.clearSelection(), error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ busy: false })
    }
  }
}))
