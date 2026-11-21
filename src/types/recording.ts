import type { RecordingFile } from '@shared/recording'

/**
 * Modelo de interfaz de una grabación real. Mantiene los datos verificados en main y solo
 * transforma la fecha a ISO y la ruta a identificador estable de la sesión de interfaz.
 */
export interface RecordingItem extends Omit<RecordingFile, 'path' | 'createdAt'> {
  id: string
  path: string
  /** Fecha ISO 8601. */
  createdAt: string
  /** Data URL generada a partir de un fotograma real del vídeo. */
  thumbnailUrl?: string
}
