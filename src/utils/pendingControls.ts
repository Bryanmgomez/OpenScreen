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
  resolution: { id: 'resolution', label: 'Resolución', kind: 'select', phase: 4, options: opts('Original', '1080p', '720p') },
  fps: { id: 'fps', label: 'FPS', kind: 'select', phase: 4, options: opts('30', '60') },
  shortcutStart: { id: 'shortcutStart', label: 'Iniciar / detener', kind: 'shortcut', phase: 2 },
  shortcutPause: { id: 'shortcutPause', label: 'Pausar / reanudar', kind: 'shortcut', phase: 2 },
  shortcutMute: { id: 'shortcutMute', label: 'Silenciar micrófono', kind: 'shortcut', phase: 3 },
  hwAccel: { id: 'hwAccel', label: 'Aceleración por hardware', kind: 'switch', phase: 4 },
  encoder: { id: 'encoder', label: 'Codificador preferido', kind: 'select', phase: 4, options: opts('Automático') },
  priority: { id: 'priority', label: 'Prioridad de proceso', kind: 'select', phase: 4, options: opts('Normal', 'Alta') }
} as const satisfies Record<string, PendingControlDef>
