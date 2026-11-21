import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  parseStoredSettings,
  settingsPatchSchema
} from '@shared/settings'

describe('parseStoredSettings', () => {
  it('devuelve los valores por defecto ante datos no válidos', () => {
    expect(parseStoredSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseStoredSettings('texto')).toEqual(DEFAULT_SETTINGS)
    expect(parseStoredSettings(42)).toEqual(DEFAULT_SETTINGS)
  })

  it('usa tema oscuro por defecto', () => {
    expect(DEFAULT_SETTINGS.appearance.theme).toBe('dark')
  })

  it('conserva los campos válidos y repara solo los inválidos', () => {
    const result = parseStoredSettings({
      schemaVersion: 1,
      appearance: { theme: 'rosa', reduceMotion: true }
    })
    expect(result.appearance.theme).toBe('dark')
    expect(result.appearance.reduceMotion).toBe(true)
  })

  it('completa los campos que faltan', () => {
    const result = parseStoredSettings({ appearance: { theme: 'light' } })
    expect(result.appearance).toEqual({ theme: 'light', reduceMotion: false })
  })
})

describe('settingsPatchSchema', () => {
  it('acepta actualizaciones parciales válidas', () => {
    expect(settingsPatchSchema.safeParse({}).success).toBe(true)
    expect(settingsPatchSchema.safeParse({ appearance: { theme: 'light' } }).success).toBe(true)
    expect(settingsPatchSchema.safeParse({ appearance: { reduceMotion: true } }).success).toBe(true)
    expect(
      settingsPatchSchema.safeParse({
        audio: { microphone: { muted: true }, system: { mode: 'device' }, separateTracks: false }
      }).success
    ).toBe(true)
  })

  it('rechaza valores fuera de rango', () => {
    expect(settingsPatchSchema.safeParse({ appearance: { theme: 'neon' } }).success).toBe(false)
    expect(settingsPatchSchema.safeParse({ appearance: { reduceMotion: 'sí' } }).success).toBe(false)
  })

  it('rechaza claves desconocidas', () => {
    expect(settingsPatchSchema.safeParse({ hack: true }).success).toBe(false)
    expect(settingsPatchSchema.safeParse({ appearance: { theme: 'dark', extra: 1 } }).success).toBe(
      false
    )
    expect(settingsPatchSchema.safeParse({ audio: { microphone: { volume: 3 } } }).success).toBe(
      false
    )
  })

  it('rechaza argumentos que no son objetos', () => {
    expect(settingsPatchSchema.safeParse(undefined).success).toBe(false)
    expect(settingsPatchSchema.safeParse('dark').success).toBe(false)
  })
})

describe('mergeSettings', () => {
  it('aplica el cambio sin mutar el original', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { appearance: { theme: 'light' } })
    expect(merged.appearance.theme).toBe('light')
    expect(merged.appearance.reduceMotion).toBe(false)
    expect(DEFAULT_SETTINGS.appearance.theme).toBe('dark')
  })

  it('combina ajustes parciales de audio sin perder los demás campos', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      audio: {
        microphone: { muted: true },
        system: { mode: 'device', deviceId: 'cable-1' }
      }
    })
    expect(merged.audio.microphone).toMatchObject({
      muted: true,
      volume: DEFAULT_SETTINGS.audio.microphone.volume,
      deviceId: DEFAULT_SETTINGS.audio.microphone.deviceId
    })
    expect(merged.audio.system).toMatchObject({
      mode: 'device',
      deviceId: 'cable-1',
      muteOnCapture: DEFAULT_SETTINGS.audio.system.muteOnCapture
    })
    expect(merged.audio.separateTracks).toBe(true)
    expect(DEFAULT_SETTINGS.audio.microphone.muted).toBe(false)
  })
})
