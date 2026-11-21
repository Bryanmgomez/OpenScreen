export type PhaseStatus = 'done' | 'next' | 'planned'

export interface Phase {
  number: number
  title: string
  status: PhaseStatus
}

/** Hoja de ruta del proyecto (ver README.md). Actualizar al cerrar cada fase. */
export const PHASES: readonly Phase[] = [
  { number: 1, title: 'Fundación', status: 'done' },
  { number: 2, title: 'Captura', status: 'next' },
  { number: 3, title: 'Audio', status: 'planned' },
  { number: 4, title: 'Codificación', status: 'planned' },
  { number: 5, title: 'Gestión', status: 'planned' },
  { number: 6, title: 'Distribución', status: 'planned' }
]

export const PHASE_STATUS_LABEL: Record<PhaseStatus, string> = {
  done: 'Completada',
  next: 'Siguiente',
  planned: 'Planificada'
}
