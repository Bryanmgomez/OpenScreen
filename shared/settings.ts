import { z } from 'zod'
import { captureRegionSchema, sourceRefSchema } from './capture'

/**
 * Esquema de ajustes persistentes.
 *
 * - Lo que se lee de disco se interpreta de forma tolerante: cada campo inválido o ausente
 *   cae a su valor por defecto, de modo que un archivo corrupto o de una versión anterior
 *   nunca impide arrancar la aplicación.
 * - Lo que llega por IPC (`settingsPatchSchema`) es estricto: se rechaza cualquier clave
 *   desconocida o valor fuera de rango.
 */

export const THEMES = ['dark', 'light', 'system'] as const
export const themeSchema = z.enum(THEMES)
export type Theme = z.infer<typeof themeSchema>

const appearanceSchema = z.object({
  theme: themeSchema.catch('dark'),
  reduceMotion: z.boolean().catch(false)
})

/**
 * La fuente elegida se guarda como referencia, nunca como fuente viva: al reaplicarla se
 * comprueba que siga existiendo (los ids de `desktopCapturer` no son estables).
 */
const captureSettingsSchema = z
  .object({
    source: sourceRefSchema.nullable().catch(null),
    region: captureRegionSchema.nullable().catch(null)
  })
  .catch({ source: null, region: null })

export const settingsSchema = z.object({
  schemaVersion: z.literal(1).catch(1),
  appearance: appearanceSchema.catch({ theme: 'dark', reduceMotion: false }),
  capture: captureSettingsSchema
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  appearance: { theme: 'dark', reduceMotion: false },
  capture: { source: null, region: null }
}

/** Actualización parcial recibida por IPC. Estricta: no admite claves desconocidas. */
export const settingsPatchSchema = z
  .object({
    appearance: z
      .object({
        theme: themeSchema.optional(),
        reduceMotion: z.boolean().optional()
      })
      .strict()
      .optional(),
    capture: z
      .object({
        source: sourceRefSchema.nullable().optional(),
        region: captureRegionSchema.nullable().optional()
      })
      .strict()
      .optional()
  })
  .strict()

export type SettingsPatch = z.infer<typeof settingsPatchSchema>

/** Interpreta datos de origen no confiable (archivo en disco) y devuelve ajustes válidos. */
export function parseStoredSettings(raw: unknown): Settings {
  return settingsSchema.catch(DEFAULT_SETTINGS).parse(raw)
}

/** Aplica una actualización parcial sin mutar los ajustes actuales. */
export function mergeSettings(current: Settings, patch: SettingsPatch): Settings {
  return {
    ...current,
    appearance: {
      theme: patch.appearance?.theme ?? current.appearance.theme,
      reduceMotion: patch.appearance?.reduceMotion ?? current.appearance.reduceMotion
    },
    capture: {
      source: patch.capture?.source !== undefined ? patch.capture.source : current.capture.source,
      region: patch.capture?.region !== undefined ? patch.capture.region : current.capture.region
    }
  }
}
