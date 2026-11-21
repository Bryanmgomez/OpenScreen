import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHORTCUT_BINDINGS,
  acceleratorFromEvent,
  duplicateShortcutActions,
  normalizeAccelerator,
  sameAccelerator,
  shortcutSettingsSchema
} from '@shared/shortcuts'

describe('normalizeAccelerator', () => {
  it('normaliza alias de modificadores y teclas', () => {
    expect(normalizeAccelerator('ctrl+alt+s')).toBe('CmdOrCtrl+Alt+S')
    expect(normalizeAccelerator('Control+Option+p')).toBe('CmdOrCtrl+Alt+P')
    expect(normalizeAccelerator('CmdOrCtrl+F12')).toBe('CmdOrCtrl+F12')
    expect(normalizeAccelerator('Shift+Space')).toBe('Shift+Space')
  })

  it('rechaza teclas sueltas, modificadores duplicados y combinaciones reservadas', () => {
    expect(normalizeAccelerator('S')).toBeNull()
    expect(normalizeAccelerator('Ctrl+Control+S')).toBeNull()
    expect(normalizeAccelerator('CmdOrCtrl+Alt+Delete')).toBeNull()
    expect(normalizeAccelerator('Meta+L')).toBeNull()
    expect(normalizeAccelerator('Ctrl+Invented')).toBeNull()
  })

  it('detecta equivalencias semánticas sin inventar igualdades', () => {
    expect(sameAccelerator('Ctrl+Alt+S', 'CmdOrCtrl+Alt+S')).toBe(true)
    expect(sameAccelerator('Ctrl+Alt+S', 'Ctrl+Shift+S')).toBe(false)
    expect(sameAccelerator('bad', 'bad')).toBe(false)
  })
})

describe('acceleratorFromEvent', () => {
  const base = {
    key: 's',
    ctrlKey: true,
    altKey: true,
    shiftKey: false,
    metaKey: false
  }

  it('convierte eventos reales de Windows y macOS', () => {
    expect(acceleratorFromEvent(base, 'win32')).toBe('CmdOrCtrl+Alt+S')
    expect(
      acceleratorFromEvent(
        { key: 'm', ctrlKey: false, altKey: true, shiftKey: false, metaKey: true },
        'darwin'
      )
    ).toBe('CmdOrCtrl+Alt+M')
  })

  it('ignora modificadores sueltos y teclas no admitidas', () => {
    expect(
      acceleratorFromEvent({ ...base, key: 'Shift', ctrlKey: false, altKey: false }, 'win32')
    ).toBeNull()
    expect(acceleratorFromEvent({ ...base, key: 'Unidentified' }, 'win32')).toBeNull()
  })
})

describe('shortcutSettingsSchema', () => {
  it('acepta las combinaciones por defecto', () => {
    expect(
      shortcutSettingsSchema.safeParse({ enabled: false, bindings: DEFAULT_SHORTCUT_BINDINGS }).success
    ).toBe(true)
  })

  it('rechaza colisiones internas y combinaciones reservadas', () => {
    expect(
      shortcutSettingsSchema.safeParse({
        enabled: true,
        bindings: { ...DEFAULT_SHORTCUT_BINDINGS, pause: 'Ctrl+Alt+S' }
      }).success
    ).toBe(false)
    expect(
      shortcutSettingsSchema.safeParse({
        enabled: true,
        bindings: { ...DEFAULT_SHORTCUT_BINDINGS, stop: 'CmdOrCtrl+Alt+Delete' }
      }).success
    ).toBe(false)
  })

  it('agrupa acciones duplicadas y claves desconocidas', () => {
    expect(
      duplicateShortcutActions({
        ...DEFAULT_SHORTCUT_BINDINGS,
        resume: 'Ctrl+Alt+S'
      })
    ).toContainEqual(['start', 'resume'])
    expect(
      shortcutSettingsSchema.safeParse({
        enabled: true,
        bindings: { ...DEFAULT_SHORTCUT_BINDINGS, extra: 'Ctrl+Alt+E' }
      }).success
    ).toBe(false)
  })
})
