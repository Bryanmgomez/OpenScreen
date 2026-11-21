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

/** Qué llegará en una sección todavía no implementada. */
export interface PendingInfo {
  phase: number
  items: readonly string[]
}

export interface SettingsSectionDef {
  id: string
  label: string
  icon: LucideIcon
  /** Ausente = la sección ya es funcional. */
  pending?: PendingInfo
}

/** Categorías de ajustes definidas en el plan del proyecto. */
export const SETTINGS_SECTIONS: readonly SettingsSectionDef[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  {
    id: 'capture',
    label: 'Captura',
    icon: Monitor,
    pending: {
      phase: 2,
      items: ['Cursor visible u oculto', 'Fuente por defecto', 'Comportamiento ante cambios de pantalla']
    }
  },
  {
    id: 'video',
    label: 'Video',
    icon: Video,
    pending: {
      phase: 4,
      items: ['Resolución y FPS', 'Formato y códec', 'Calidad, bitrate y opciones avanzadas']
    }
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: Mic,
    pending: {
      phase: 3,
      items: ['Dispositivos de entrada y salida', 'Volumen independiente', 'Pistas separadas']
    }
  },
  {
    id: 'shortcuts',
    label: 'Atajos',
    icon: Keyboard,
    pending: { phase: 2, items: ['Iniciar, pausar y detener', 'Silenciar micrófono', 'Atajos configurables'] }
  },
  {
    id: 'storage',
    label: 'Almacenamiento',
    icon: HardDrive,
    pending: {
      phase: 5,
      items: ['Carpeta de destino', 'Nombres automáticos', 'Archivos temporales y espacio libre']
    }
  },
  {
    id: 'performance',
    label: 'Rendimiento',
    icon: Gauge,
    pending: { phase: 4, items: ['Aceleración por hardware', 'Codificador preferido', 'Prioridad de proceso'] }
  },
  { id: 'appearance', label: 'Apariencia', icon: Palette }
]
