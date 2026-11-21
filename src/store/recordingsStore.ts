import { create } from 'zustand'
import type { RecordingFile, RecordingList } from '@shared/recording'
import { getApi } from '@/services/ipc'
import { toMessage } from '@/utils/errors'

interface RecordingsState {
  items: RecordingList
  error: string | null
  busy: boolean
  refresh: () => Promise<void>
  reveal: (path: string) => Promise<void>
  open: (path: string) => Promise<void>
  remove: (path: string) => Promise<void>
}

/** La biblioteca lee los archivos reales de la carpeta configurada, no datos de ejemplo. */
export const useRecordingsStore = create<RecordingsState>((set) => ({
  items: [],
  error: null,
  busy: false,

  refresh: async () => {
    set({ busy: true })
    try {
      set({ items: await getApi().recording.list(), error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ busy: false })
    }
  },

  reveal: async (path) => {
    try {
      await getApi().recording.reveal({ path })
    } catch (error) {
      set({ error: toMessage(error) })
    }
  },

  open: async (path) => {
    try {
      await getApi().recording.open({ path })
    } catch (error) {
      set({ error: toMessage(error) })
    }
  },

  remove: async (path) => {
    set({ busy: true })
    try {
      const items: RecordingFile[] = await getApi().recording.delete({ path })
      set({ items, error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ busy: false })
    }
  }
}))
