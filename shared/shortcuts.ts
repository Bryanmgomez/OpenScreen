import { z } from 'zod'

/**
 * Atajos globales configurables. El acelerador se guarda en formato Electron, pero la
 * normalización y los conflictos internos se comprueban aquí, sin importar Electron ni el DOM.
 */

export const SHORTCUT_ACTIONS = [
  'start',
  'pause',
  'resume',
  'stop',
  'toggleMicrophone'
] as const
export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]

export const SHORTCUT_LABELS: Record<ShortcutAction, { es: string; en: string }> = {
  start: { es: 'Iniciar grabación', en: 'Start recording' },
  pause: { es: 'Pausar', en: 'Pause' },
  resume: { es: 'Reanudar', en: 'Resume' },
  stop: { es: 'Detener', en: 'Stop' },
  toggleMicrophone: { es: 'Activar/silenciar micrófono', en: 'Toggle microphone' }
}

export const DEFAULT_SHORTCUT_BINDINGS: Record<ShortcutAction, string> = {
  start: 'CmdOrCtrl+Alt+S',
  pause: 'CmdOrCtrl+Alt+P',
  resume: 'CmdOrCtrl+Alt+R',
  stop: 'CmdOrCtrl+Alt+X',
  toggleMicrophone: 'CmdOrCtrl+Alt+M'
}

export interface ShortcutSettings {
  enabled: boolean
  bindings: Record<ShortcutAction, string>
}

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  enabled: false,
  bindings: { ...DEFAULT_SHORTCUT_BINDINGS }
}

const MODIFIERS = new Map<string, string>([
  ['cmdorctrl', 'CmdOrCtrl'],
  ['commandorcontrol', 'CmdOrCtrl'],
  ['ctrl', 'CmdOrCtrl'],
  ['control', 'CmdOrCtrl'],
  ['cmd', 'CmdOrCtrl'],
  ['command', 'CmdOrCtrl'],
  ['alt', 'Alt'],
  ['option', 'Alt'],
  ['shift', 'Shift'],
  ['meta', 'Meta'],
  ['super', 'Meta']
])

const KEYS = new Set([
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
  'Space', 'Enter', 'Tab', 'Backspace', 'Delete', 'Insert', 'Home', 'End',
  'PageUp', 'PageDown', 'Up', 'Down', 'Left', 'Right', 'Escape'
])

/** Combinaciones que el sistema operativo puede reclamar antes que la aplicación. */
const RESERVED = new Set([
  'CmdOrCtrl+Alt+Delete',
  'CmdOrCtrl+Shift+Escape',
  'CmdOrCtrl+Alt+Escape',
  'CmdOrCtrl+Alt+Shift+Escape',
  'Meta+L',
  'Meta+Shift+Escape'
])

/** Normaliza un acelerador escrito por el usuario. Devuelve `null` si no es seguro. */
export function normalizeAccelerator(value: string): string | null {
  const parts = value.split('+').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2 || parts.length > 4) return null

  const modifiers: string[] = []
  const keyPart = parts[parts.length - 1]
  if (!keyPart) return null

  for (const part of parts.slice(0, -1)) {
    const modifier = MODIFIERS.get(part.toLowerCase())
    if (!modifier || modifiers.includes(modifier)) return null
    modifiers.push(modifier)
  }

  let key: string
  if (/^[a-z]$/i.test(keyPart)) key = keyPart.toUpperCase()
  else if (/^\d$/.test(keyPart)) key = keyPart
  else if (/^f\d{1,2}$/i.test(keyPart)) key = `F${Number(keyPart.slice(1))}`
  else key = keyPart

  if (!KEYS.has(key)) return null
  const normalized = [...modifiers, key].join('+')
  if (RESERVED.has(normalized)) return null
  return normalized
}

/** Extrae un acelerador de un evento de teclado. Las teclas modificadoras solas se ignoran. */
export function acceleratorFromEvent(
  event: {
    key: string
    ctrlKey: boolean
    altKey: boolean
    shiftKey: boolean
    metaKey: boolean
  },
  platform: 'win32' | 'darwin' | 'linux' | 'other'
): string | null {
  const key = event.key
  if (['Control', 'Alt', 'Shift', 'Meta', 'OS', 'AltGraph'].includes(key)) return null

  const primary = platform === 'darwin' ? event.metaKey || event.ctrlKey : event.ctrlKey || event.metaKey
  const parts: string[] = []
  if (primary) parts.push('CmdOrCtrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  const named: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Escape: 'Escape',
    Esc: 'Escape',
    Del: 'Delete',
    Delete: 'Delete'
  }
  const rawKey = named[key] ?? (/^[a-z]$/i.test(key) ? key.toUpperCase() : key)
  parts.push(rawKey)
  return normalizeAccelerator(parts.join('+'))
}

/** Devuelve los pares de acciones que comparten acelerador. */
export function duplicateShortcutActions(bindings: Record<ShortcutAction, string>): ShortcutAction[][] {
  const groups = new Map<string, ShortcutAction[]>()
  for (const action of SHORTCUT_ACTIONS) {
    const normalized = normalizeAccelerator(bindings[action] ?? '')
    if (!normalized) continue
    const group = groups.get(normalized) ?? []
    group.push(action)
    groups.set(normalized, group)
  }
  return [...groups.values()].filter((group) => group.length > 1)
}

const acceleratorSchema = z.string().refine((value) => normalizeAccelerator(value) !== null, {
  message: 'Atajo no válido o reservado por el sistema.'
})

export const shortcutBindingsSchema = z
  .object({
    start: acceleratorSchema,
    pause: acceleratorSchema,
    resume: acceleratorSchema,
    stop: acceleratorSchema,
    toggleMicrophone: acceleratorSchema
  })
  .strict()

export const shortcutSettingsSchema = z
  .object({
    enabled: z.boolean(),
    bindings: shortcutBindingsSchema
  })
  .strict()
  .refine(
    (value) => duplicateShortcutActions(value.bindings).length === 0,
    { message: 'Dos acciones no pueden usar el mismo atajo.' }
  )

/** Igualdad semántica: `Ctrl+Alt+S` y `CmdOrCtrl+Alt+S` son el mismo atajo. */
export function sameAccelerator(left: string, right: string): boolean {
  const first = normalizeAccelerator(left)
  const second = normalizeAccelerator(right)
  return first !== null && first === second
}
