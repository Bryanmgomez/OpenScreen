import { create } from 'zustand'
import type {
  RecordingFile,
  RecordingLibrarySnapshot,
  RecordingRenameRequest,
  RecordingStorageInfo
} from '@shared/recording'
import { getApi } from '@/services/ipc'
import {
  cachedThumbnail,
  forgetThumbnail,
  generateThumbnails
} from '@/services/thumbnailService'
import { toMessage } from '@/utils/errors'

interface RecordingsState {
  items: RecordingFile[]
  snapshot: RecordingLibrarySnapshot | null
  storage: RecordingStorageInfo | null
  available: boolean
  tempFiles: string[]
  error: string | null
  busy: boolean
  thumbnails: Record<string, string>
  mediaUrls: Record<string, string>
  refresh: () => Promise<void>
  reveal: (path: string) => Promise<void>
  open: (path: string) => Promise<void>
  remove: (path: string) => Promise<void>
  rename: (request: RecordingRenameRequest) => Promise<void>
  cleanupTemp: () => Promise<void>
  getMediaUrl: (path: string) => Promise<string | null>
  prepareMedia: () => Promise<void>
}

const MAX_THUMBNAILS = 24
let requestSequence = 0

/** La biblioteca lee archivos reales: nunca datos de ejemplo ni estados supuestos. */
export const useRecordingsStore = create<RecordingsState>((set, get) => {
  const applySnapshot = (snapshot: RecordingLibrarySnapshot, sequence: number): void => {
    if (sequence !== requestSequence) return
    const validPaths = new Set(snapshot.items.map((item) => item.path))
    set((state) => ({
      items: snapshot.items,
      snapshot,
      storage: snapshot.storage,
      available: snapshot.available && snapshot.error === null,
      tempFiles: snapshot.tempFiles,
      error: snapshot.error,
      busy: false,
      thumbnails: Object.fromEntries(
        Object.entries(state.thumbnails).filter(([path]) => validPaths.has(path))
      ),
      mediaUrls: Object.fromEntries(
        Object.entries(state.mediaUrls).filter(([path]) => validPaths.has(path))
      )
    }))
  }

  const run = async (operation: () => Promise<RecordingLibrarySnapshot>): Promise<boolean> => {
    const sequence = ++requestSequence
    set({ busy: true })
    try {
      applySnapshot(await operation(), sequence)
      return true
    } catch (error) {
      if (sequence !== requestSequence) return false
      set({ error: toMessage(error), busy: false })
      return false
    }
  }

  return {
    items: [],
    snapshot: null,
    storage: null,
    available: false,
    tempFiles: [],
    error: null,
    busy: false,
    thumbnails: {},
    mediaUrls: {},

    refresh: async () => {
      await run(() => getApi().recording.list())
    },

    reveal: async (path) => {
      try {
        await getApi().recording.reveal({ path })
        set({ error: null })
      } catch (error) {
        set({ error: toMessage(error) })
      }
    },

    open: async (path) => {
      try {
        await getApi().recording.open({ path })
        set({ error: null })
      } catch (error) {
        set({ error: toMessage(error) })
      }
    },

    remove: async (path) => {
      if (await run(() => getApi().recording.delete({ path }))) forgetThumbnail(path)
    },

    rename: async (request) => {
      if (await run(() => getApi().recording.rename(request))) forgetThumbnail(request.path)
    },

    cleanupTemp: async () => {
      await run(() => getApi().recording.cleanupTemp())
    },

    getMediaUrl: async (path) => {
      const cached = get().mediaUrls[path]
      if (cached) return cached
      try {
        const url = await getApi().recording.getMediaUrl({ path })
        set((state) => ({ mediaUrls: { ...state.mediaUrls, [path]: url } }))
        return url
      } catch (error) {
        set({ error: toMessage(error) })
        return null
      }
    },

    /** Resuelve las URL y captura miniaturas de las grabaciones recientes que aún no las tienen. */
    prepareMedia: async () => {
      const { items } = get()
      const recent = items.slice(0, MAX_THUMBNAILS)
      const requests: { path: string; src: string }[] = []
      for (const item of recent) {
        const src = await get().getMediaUrl(item.path)
        if (src && !cachedThumbnail(item.path)) requests.push({ path: item.path, src })
      }
      if (requests.length === 0) return
      await generateThumbnails(requests)
      const found: Record<string, string> = {}
      for (const request of requests) {
        const url = cachedThumbnail(request.path)
        if (url) found[request.path] = url
      }
      if (Object.keys(found).length > 0) {
        set((state) => ({ thumbnails: { ...state.thumbnails, ...found } }))
      }
    }
  }
})
