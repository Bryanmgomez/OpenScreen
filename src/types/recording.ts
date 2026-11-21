/** Modelo de interfaz de una grabación. Lo poblará el servicio de almacenamiento. */
export interface RecordingItem {
  id: string
  name: string
  durationMs: number
  /** Fecha ISO 8601. */
  createdAt: string
  /** URL de la miniatura; si falta se muestra un marcador. */
  thumbnailUrl?: string
}
