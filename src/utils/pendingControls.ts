/**
 * Catálogo de controles cuyo backend aún no existe. Se muestran deshabilitados y marcados
 * como pendientes, sin valores ni resultados simulados. Al implementar cada fase, el control
 * se saca de aquí y se conecta a su ajuste real.
 */
export type PendingKind = 'switch' | 'select' | 'segmented' | 'shortcut' | 'path'

export interface PendingControlDef {
  id: string
  label: string
  description?: string
  kind: PendingKind
  phase: number
  options?: readonly { value: string; label: string }[]
}

const opts = (...labels: string[]) => labels.map((label) => ({ value: label, label }))

export const PENDING_CONTROLS = {
  captureType: {
    id: 'captureType',
    label: 'Tipo de captura',
    kind: 'segmented',
    phase: 2,
    options: opts('Pantalla', 'Ventana', 'Región')
  },
  captureSource: {
    id: 'captureSource',
    label: 'Fuente',
    description: 'Monitor o ventana a grabar.',
    kind: 'select',
    phase: 2,
    options: []
  },
  cursor: { id: 'cursor', label: 'Mostrar cursor', description: 'Incluye el puntero en la grabación.', kind: 'switch', phase: 2 },
  resolution: { id: 'resolution', label: 'Resolución', kind: 'select', phase: 4, options: opts('Original', '1080p', '720p') },
  fps: { id: 'fps', label: 'FPS', kind: 'select', phase: 4, options: opts('30', '60') },
  format: { id: 'format', label: 'Formato', kind: 'select', phase: 4, options: opts('MP4', 'WebM') },
  quality: { id: 'quality', label: 'Calidad', kind: 'select', phase: 4, options: opts('Alta', 'Media', 'Baja') },
  systemAudio: { id: 'systemAudio', label: 'Audio del sistema', kind: 'switch', phase: 3 },
  microphone: { id: 'microphone', label: 'Micrófono', kind: 'switch', phase: 3 },
  inputDevice: { id: 'inputDevice', label: 'Dispositivo de entrada', kind: 'select', phase: 3, options: [] },
  outputDevice: { id: 'outputDevice', label: 'Dispositivo de salida', kind: 'select', phase: 3, options: [] },
  separateTracks: { id: 'separateTracks', label: 'Pistas separadas', description: 'Sistema y micrófono en pistas independientes.', kind: 'switch', phase: 3 },
  shortcutStart: { id: 'shortcutStart', label: 'Iniciar / detener', kind: 'shortcut', phase: 2 },
  shortcutPause: { id: 'shortcutPause', label: 'Pausar / reanudar', kind: 'shortcut', phase: 2 },
  shortcutMute: { id: 'shortcutMute', label: 'Silenciar micrófono', kind: 'shortcut', phase: 3 },
  outputFolder: { id: 'outputFolder', label: 'Carpeta de destino', description: 'Dónde se guardan las grabaciones.', kind: 'path', phase: 5 },
  fileName: { id: 'fileName', label: 'Nombre de archivo', description: 'Plantilla para nombres automáticos.', kind: 'path', phase: 5 },
  hwAccel: { id: 'hwAccel', label: 'Aceleración por hardware', kind: 'switch', phase: 4 },
  encoder: { id: 'encoder', label: 'Codificador preferido', kind: 'select', phase: 4, options: opts('Automático') },
  priority: { id: 'priority', label: 'Prioridad de proceso', kind: 'select', phase: 4, options: opts('Normal', 'Alta') }
} as const satisfies Record<string, PendingControlDef>
