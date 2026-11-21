import { useEffect } from 'react'
import type { RecordingItem } from '@/types/recording'
import { useRecordingsStore } from '@/store/recordingsStore'

interface RecordingsState {
  available: boolean
  busy: boolean
  error: string | null
  items: readonly RecordingItem[]
  reveal: (path: string) => Promise<void>
  open: (path: string) => Promise<void>
  remove: (path: string) => Promise<void>
}

/** Punto único de acceso a las grabaciones reales listadas por el proceso main. */
export function useRecordings(): RecordingsState {
  const { items, error, busy, refresh, reveal, open, remove } = useRecordingsStore()

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    available: true,
    busy,
    error,
    items: items.map((file) => ({
      id: file.path,
      name: file.name,
      durationMs: file.durationMs,
      createdAt: new Date(file.createdAt).toISOString()
    })),
    reveal,
    open,
    remove
  }
}
