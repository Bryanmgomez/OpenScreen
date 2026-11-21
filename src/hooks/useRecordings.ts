import type { RecordingItem } from '@/types/recording'

interface RecordingsState {
  /** `false` mientras no exista el servicio de almacenamiento. */
  available: boolean
  items: readonly RecordingItem[]
}

/**
 * Punto único de acceso a las grabaciones. Aún no hay backend (servicio `storage`),
 * así que no devuelve nada; cuando exista, solo hay que cambiar este hook.
 */
export function useRecordings(): RecordingsState {
  return { available: false, items: [] }
}
