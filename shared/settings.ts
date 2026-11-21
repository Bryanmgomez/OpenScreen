import { z } from 'zod'
import {
  audioSettingsSchema,
  audioTrackSettingsSchema,
  DEFAULT_AUDIO_SETTINGS
} from './audio'
import { captureRegionSchema, sourceRefSchema } from './capture'
import { recordingFormatSchema, recordingQualitySchema } from './recording'

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

const DEFAULT_RECORDING_SETTINGS = {
  // `null` = carpeta de vídeos del sistema, resuelta en main.
  outputDir: null as string | null,
  showCursor: true,
  quality: 'balanced' as z.infer<typeof recordingQualitySchema>,
  format: 'webm' as z.infer<typeof recordingFormatSchema>,
  fileNameTemplate: 'OpenScreen-{date}-{time}',
  // `null` = buscar `ffmpeg` en PATH; si se indica, debe ser un ejecutable real.
  ffmpegPath: null as string | null
}

const recordingSettingsSchema = z
  .object({
    outputDir: z.string().nullable().catch(DEFAULT_RECORDING_SETTINGS.outputDir),
    showCursor: z.boolean().catch(DEFAULT_RECORDING_SETTINGS.showCursor),
    quality: recordingQualitySchema.catch(DEFAULT_RECORDING_SETTINGS.quality),
    format: recordingFormatSchema.catch(DEFAULT_RECORDING_SETTINGS.format),
    fileNameTemplate: z.string().min(1).catch(DEFAULT_RECORDING_SETTINGS.fileNameTemplate),
    ffmpegPath: z.string().nullable().catch(DEFAULT_RECORDING_SETTINGS.ffmpegPath)
  })
  .catch(DEFAULT_RECORDING_SETTINGS)

export const settingsSchema = z.object({
  schemaVersion: z.literal(1).catch(1),
  appearance: appearanceSchema.catch({ theme: 'dark', reduceMotion: false }),
  capture: captureSettingsSchema,
  recording: recordingSettingsSchema,
  audio: audioSettingsSchema.catch(structuredClone(DEFAULT_AUDIO_SETTINGS))
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  appearance: { theme: 'dark', reduceMotion: false },
  capture: { source: null, region: null },
  recording: { ...DEFAULT_RECORDING_SETTINGS },
  audio: structuredClone(DEFAULT_AUDIO_SETTINGS)
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
      .optional(),
    recording: z
      .object({
        outputDir: z.string().nullable().optional(),
        showCursor: z.boolean().optional(),
        quality: recordingQualitySchema.optional(),
        format: recordingFormatSchema.optional(),
        fileNameTemplate: z.string().min(1).optional(),
        ffmpegPath: z.string().nullable().optional()
      })
      .strict()
      .optional(),
    audio: z
      .object({
        microphone: audioTrackSettingsSchema.partial().optional(),
        system: audioSettingsSchema.shape.system.partial().optional(),
        separateTracks: z.boolean().optional()
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
    },
    recording: {
      outputDir:
        patch.recording?.outputDir !== undefined
          ? patch.recording.outputDir
          : current.recording.outputDir,
      showCursor:
        patch.recording?.showCursor !== undefined
          ? patch.recording.showCursor
          : current.recording.showCursor,
      quality: patch.recording?.quality !== undefined
        ? patch.recording.quality
        : current.recording.quality,
      format: patch.recording?.format !== undefined
        ? patch.recording.format
        : current.recording.format,
      fileNameTemplate:
        patch.recording?.fileNameTemplate !== undefined
          ? patch.recording.fileNameTemplate
          : current.recording.fileNameTemplate,
      ffmpegPath:
        patch.recording?.ffmpegPath !== undefined
          ? patch.recording.ffmpegPath
          : current.recording.ffmpegPath
    },
    audio: {
      microphone: {
        ...current.audio.microphone,
        ...patch.audio?.microphone
      },
      system: {
        ...current.audio.system,
        ...patch.audio?.system
      },
      separateTracks: patch.audio?.separateTracks ?? current.audio.separateTracks
    }
  }
}
