import {
  Gauge,
  HardDrive,
  Keyboard,
  Mic,
  Monitor,
  Palette,
  SlidersHorizontal,
  Video,
  type LucideIcon
} from 'lucide-react'

import { PENDING_CONTROLS, type PendingControlDef } from '@/utils/pendingControls'

const C = PENDING_CONTROLS

/** Grupo de controles pendientes dentro de una categoría. */
export interface PendingGroup {
  title: string
  controls: readonly PendingControlDef[]
}

export interface SettingsSectionDef {
  id: string
  label: string
  icon: LucideIcon
  /** Ausente = la sección ya es funcional. */
  pending?: { phase: number; groups: readonly PendingGroup[] }
}

/** Categorías de ajustes definidas en el plan del proyecto. */
export const SETTINGS_SECTIONS: readonly SettingsSectionDef[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  {
    id: 'capture',
    label: 'Captura',
    icon: Monitor,
    pending: { phase: 2, groups: [{ title: 'Fuente y cursor', controls: [C.captureType, C.captureSource, C.cursor] }] }
  },
  {
    id: 'video',
    label: 'Video',
    icon: Video,
    pending: { phase: 4, groups: [{ title: 'Salida de video', controls: [C.resolution, C.fps, C.format, C.quality] }] }
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: Mic,
    pending: {
      phase: 3,
      groups: [
        { title: 'Fuentes', controls: [C.systemAudio, C.microphone, C.separateTracks] },
        { title: 'Dispositivos', controls: [C.inputDevice, C.outputDevice] }
      ]
    }
  },
  {
    id: 'shortcuts',
    label: 'Atajos',
    icon: Keyboard,
    pending: { phase: 2, groups: [{ title: 'Atajos globales', controls: [C.shortcutStart, C.shortcutPause, C.shortcutMute] }] }
  },
  {
    id: 'storage',
    label: 'Almacenamiento',
    icon: HardDrive,
    pending: { phase: 5, groups: [{ title: 'Destino', controls: [C.outputFolder, C.fileName] }] }
  },
  {
    id: 'performance',
    label: 'Rendimiento',
    icon: Gauge,
    pending: { phase: 4, groups: [{ title: 'Codificación', controls: [C.hwAccel, C.encoder, C.priority] }] }
  },
  { id: 'appearance', label: 'Apariencia', icon: Palette }
]
