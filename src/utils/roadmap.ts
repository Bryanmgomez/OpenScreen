export type PhaseStatus = 'done' | 'next' | 'planned'

export interface Phase {
  number: number
  title: string
  status: PhaseStatus
}

/** Hoja de ruta del proyecto (ver README.md). Actualizar al cerrar cada fase. */
export const PHASES: readonly Phase[] = [
  { number: 1, title: 'Fundación', status: 'done' },
  { number: 2, title: 'Captura', status: 'done' },
  { number: 3, title: 'Audio', status: 'done' },
  { number: 4, title: 'Codificación', status: 'done' },
  { number: 5, title: 'Gestión', status: 'done' },
  { number: 6, title: 'Configuración y rendimiento', status: 'done' },
  { number: 7, title: 'Distribución', status: 'planned' }
]

export const PHASE_STATUS_LABEL: Record<PhaseStatus, string> = {
  done: 'Completada',
  next: 'Siguiente',
  planned: 'Planificada'
}
