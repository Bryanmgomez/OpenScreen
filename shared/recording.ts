import { z } from 'zod'
import {
  audioSettingsSchema,
  audioSupportSchema,
  audioTrackFileSchema,
  audioTrackKindSchema,
  audioTrackRuntimeSchema
} from './audio'
import { sourceRefSchema } from './capture'
import {
  encodingPlanSchema,
  recordingFormatSchema,
  recordingQualitySchema,
  type RecordingFormat
} from './encoding'

export {
  recordingFormatSchema,
  recordingQualitySchema,
  QUALITY_BITRATES,
  type RecordingFormat,
  type RecordingQuality
} from './encoding'

/**
 * Contrato del motor de grabación. El estado autoritativo vive en main: el renderer solo
 * envía eventos del `MediaRecorder` y refleja lo que main decide. Así se impiden grabaciones
 * duplicadas aunque se pulsen varios botones o se abra la página dos veces.
 */

export const RECORDING_STATES = [
  'idle',
  'starting',
  'recording',
  'paused',
  'stopping',
  'error'
] as const
export const recordingStateSchema = z.enum(RECORDING_STATES)
export type RecordingState = z.infer<typeof recordingStateSchema>

export const recordingOptionsSchema = z
  .object({
    showCursor: z.boolean(),
    quality: recordingQualitySchema,
    format: recordingFormatSchema
  })
  .strict()
export type RecordingOptions = z.infer<typeof recordingOptionsSchema>

export const recordingFileSchema = z
  .object({
    path: z.string(),
    name: z.string(),
    size: z.number().int().nonnegative(),
    mimeType: z.string(),
    durationMs: z.number().nonnegative(),
    createdAt: z.number(),
    tracks: z.array(audioTrackFileSchema)
  })
  .strict()
export type RecordingFile = z.infer<typeof recordingFileSchema>

export const recordingAudioStatusSchema = z
  .object({
    support: audioSupportSchema,
    microphone: audioTrackRuntimeSchema,
    system: audioTrackRuntimeSchema,
    separateTracks: z.boolean(),
    sidecars: z.array(audioTrackFileSchema)
  })
  .strict()
export type RecordingAudioStatus = z.infer<typeof recordingAudioStatusSchema>

export const EMPTY_RECORDING_AUDIO_STATUS: RecordingAudioStatus = {
  support: {
    platform: 'other',
    microphonePermission: 'unknown',
    systemAudio: 'unavailable',
    systemMethod: 'none',
    notes: []
  },
  microphone: {
    kind: 'microphone',
    enabled: false,
    active: false,
    deviceId: null,
    label: null,
    error: null
  },
  system: {
    kind: 'system',
    enabled: false,
    active: false,
    deviceId: null,
    label: null,
    error: null
  },
  separateTracks: true,
  sidecars: []
}

export const recordingStatusSchema = z.object({
  state: recordingStateSchema,
  sessionId: z.string().nullable(),
  source: sourceRefSchema.nullable(),
  startedAt: z.number().nullable(),
  pausedAt: z.number().nullable(),
  pausedMs: z.number().nonnegative(),
  bytesWritten: z.number().int().nonnegative(),
  outputPath: z.string().nullable(),
  tempPath: z.string().nullable(),
  mimeType: z.string().nullable(),
  /** Plan aplicado, con los valores realmente obtenidos de la fuente. */
  encoding: encodingPlanSchema.nullable(),
  error: z.string().nullable(),
  lastRecording: recordingFileSchema.nullable(),
  audio: recordingAudioStatusSchema
})
export type RecordingStatus = z.infer<typeof recordingStatusSchema>

export const EMPTY_RECORDING_STATUS: RecordingStatus = {
  state: 'idle',
  sessionId: null,
  source: null,
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  bytesWritten: 0,
  outputPath: null,
  tempPath: null,
  mimeType: null,
  encoding: null,
  error: null,
  lastRecording: null,
  audio: EMPTY_RECORDING_AUDIO_STATUS
}

export const recordingBeginRequestSchema = z
  .object({
    source: sourceRefSchema,
    options: recordingOptionsSchema,
    audio: audioSettingsSchema,
    /** Plan de codificación resuelto por el renderer y validado por main. */
    encoding: encodingPlanSchema,
    mimeType: z.string().min(1),
    extension: recordingFormatSchema
  })
  .strict()
export type RecordingBeginRequest = z.infer<typeof recordingBeginRequestSchema>

export const recordingChunkSchema = z
  .object({
    sessionId: z.string().min(1),
    index: z.number().int().nonnegative(),
    data: z.custom<Uint8Array>((value) => value instanceof Uint8Array, 'Se esperaba Uint8Array')
  })
  .strict()
export type RecordingChunk = z.infer<typeof recordingChunkSchema>

/** Chunk de una pista de audio independiente (Opus dentro de WebM). */
export const recordingAudioChunkSchema = z
  .object({
    sessionId: z.string().min(1),
    track: audioTrackKindSchema,
    index: z.number().int().nonnegative(),
    data: z.custom<Uint8Array>((value) => value instanceof Uint8Array, 'Se esperaba Uint8Array')
  })
  .strict()
export type RecordingAudioChunk = z.infer<typeof recordingAudioChunkSchema>

/** El renderer informa de cada fuente de audio: conseguida, desconectada o con error. */
export const recordingAudioStateSchema = z
  .object({
    sessionId: z.string().min(1),
    track: audioTrackKindSchema,
    active: z.boolean(),
    label: z.string().nullable(),
    error: z.string().nullable()
  })
  .strict()
export type RecordingAudioState = z.infer<typeof recordingAudioStateSchema>

export const recordingFinishRequestSchema = z
  .object({
    sessionId: z.string().min(1),
    durationMs: z.number().nonnegative(),
    mimeType: z.string().min(1)
  })
  .strict()
export type RecordingFinishRequest = z.infer<typeof recordingFinishRequestSchema>

export const recordingSessionRequestSchema = z
  .object({ sessionId: z.string().min(1) })
  .strict()
export type RecordingSessionRequest = z.infer<typeof recordingSessionRequestSchema>

export const recordingFilePathSchema = z
  .object({ path: z.string().min(1) })
  .strict()
export type RecordingFilePath = z.infer<typeof recordingFilePathSchema>

export const recordingListSchema = z.array(recordingFileSchema)
export type RecordingList = z.infer<typeof recordingListSchema>

/** Elige un MIME type realmente soportado; nunca inventa uno. */
export function chooseRecorderMimeType(
  supported: readonly string[],
  format: RecordingFormat
): string | null {
  const preferences =
    format === 'mp4'
      ? ['video/mp4;codecs=h264', 'video/mp4;codecs=avc1', 'video/mp4']
      : [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm'
        ]

  for (const preferred of preferences) {
    if (supported.includes(preferred)) return preferred
  }

  const family = format === 'mp4' ? 'video/mp4' : 'video/webm'
  return supported.find((type) => type.startsWith(family)) ?? null
}

/** Tiempo activo, descontando el tiempo en pausa. */
export function elapsedMs(status: {
  startedAt: number | null
  pausedAt: number | null
  pausedMs: number
}, now = Date.now()): number {
  if (status.startedAt === null) return 0
  const pausedNow = status.pausedAt === null ? 0 : Math.max(0, now - status.pausedAt)
  return Math.max(0, now - status.startedAt - status.pausedMs - pausedNow)
}
