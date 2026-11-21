import { useEffect, useMemo } from 'react'
import type { RecordingFile, RecordingStorageInfo } from '@shared/recording'
import type { RecordingItem } from '@/types/recording'
import { getApi } from '@/services/ipc'
import { useRecordingsStore } from '@/store/recordingsStore'
import { useSettingsStore } from '@/store/settingsStore'

interface RecordingsState {
  available: boolean
  busy: boolean
  error: string | null
  items: readonly RecordingItem[]
  /** Datos tal como los validó main; útil para ordenar y filtrar sin perder tipos. */
  files: readonly RecordingFile[]
  thumbnails: Readonly<Record<string, string>>
  storage: RecordingStorageInfo | null
  tempFiles: readonly string[]
  refresh: () => Promise<void>
  reveal: (path: string) => Promise<void>
  open: (path: string) => Promise<void>
  remove: (path: string) => Promise<void>
  rename: (path: string, name: string) => Promise<void>
  cleanupTemp: () => Promise<void>
  getMediaUrl: (path: string) => Promise<string | null>
}

/** Punto único de acceso a las grabaciones reales listadas por el proceso main. */
export function useRecordings(): RecordingsState {
  const files = useRecordingsStore((state) => state.items)
  const thumbnails = useRecordingsStore((state) => state.thumbnails)
  const storage = useRecordingsStore((state) => state.storage)
  const tempFiles = useRecordingsStore((state) => state.tempFiles)
  const available = useRecordingsStore((state) => state.available)
  const busy = useRecordingsStore((state) => state.busy)
  const error = useRecordingsStore((state) => state.error)
  const refresh = useRecordingsStore((state) => state.refresh)
  const reveal = useRecordingsStore((state) => state.reveal)
  const open = useRecordingsStore((state) => state.open)
  const remove = useRecordingsStore((state) => state.remove)
  const renameFile = useRecordingsStore((state) => state.rename)
  const cleanupTemp = useRecordingsStore((state) => state.cleanupTemp)
  const getMediaUrl = useRecordingsStore((state) => state.getMediaUrl)
  const prepareMedia = useRecordingsStore((state) => state.prepareMedia)
  const outputDir = useSettingsStore((state) => state.settings?.recording.outputDir ?? null)

  useEffect(() => {
    void refresh()
  }, [refresh, outputDir])

  useEffect(() => {
    return getApi().recording.onStatusChange((status) => {
      if (status.state === 'idle' && status.lastRecording) void refresh()
    })
  }, [refresh])

  const mediaKey = files.map((file) => `${file.path}:${file.size}`).join('|')
  useEffect(() => {
    void prepareMedia()
    // `mediaKey` identifica de forma estable el conjunto de archivos que necesita miniaturas.
  }, [prepareMedia, mediaKey])

  const items = useMemo<RecordingItem[]>(
    () =>
      files.map((file) => ({
        ...file,
        id: file.path,
        path: file.path,
        createdAt: new Date(file.createdAt).toISOString(),
        thumbnailUrl: thumbnails[file.path]
      })),
    [files, thumbnails]
  )

  return {
    available,
    busy,
    error,
    items,
    files,
    thumbnails,
    storage,
    tempFiles,
    refresh,
    reveal,
    open,
    remove,
    rename: async (path, name) => renameFile({ path, name }),
    cleanupTemp,
    getMediaUrl
  }
}
