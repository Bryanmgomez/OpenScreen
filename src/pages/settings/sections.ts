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
import type { MessageKey } from '@/i18n'

export interface SettingsSectionDef {
  id: string
  labelKey: MessageKey
  icon: LucideIcon
}

/** Categorías de ajustes. Todas las secciones listadas son funcionales. */
export const SETTINGS_SECTIONS: readonly SettingsSectionDef[] = [
  { id: 'general', labelKey: 'settings.sections.general', icon: SlidersHorizontal },
  { id: 'capture', labelKey: 'settings.sections.capture', icon: Monitor },
  { id: 'video', labelKey: 'settings.sections.video', icon: Video },
  { id: 'audio', labelKey: 'settings.sections.audio', icon: Mic },
  { id: 'shortcuts', labelKey: 'settings.sections.shortcuts', icon: Keyboard },
  { id: 'storage', labelKey: 'settings.sections.storage', icon: HardDrive },
  { id: 'performance', labelKey: 'settings.sections.performance', icon: Gauge },
  { id: 'appearance', labelKey: 'settings.sections.appearance', icon: Palette }
]
