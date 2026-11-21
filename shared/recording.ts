import { z } from 'zod'
import { sourceRefSchema } from './capture'

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

export const RECORDING_QUALITIES = ['low', 'balanced', 'high'] as const
export const recordingQualitySchema = z.enum(RECORDING_QUALITIES)
export type RecordingQuality = z.infer<typeof recordingQualitySchema>

export const RECORDING_FORMATS = ['webm', 'mp4'] as const
export const recordingFormatSchema = z.enum(RECORDING_FORMATS)
export type RecordingFormat = z.infer<typeof recordingFormatSchema>

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
    createdAt: z.number()
  })
  .strict()
export type RecordingFile = z.infer<typeof recordingFileSchema>

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
  error: z.string().nullable(),
  lastRecording: recordingFileSchema.nullable()
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
  error: null,
  lastRecording: null
}

export const recordingBeginRequestSchema = z
  .object({
    source: sourceRefSchema,
    options: recordingOptionsSchema,
    mimeType: z.string().min(1),
    extension: z.enum(['webm', 'mp4'])
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

/** Bitrate de vídeo por calidad. Se usa tanto al crear MediaRecorder como al transcodificar. */
export const QUALITY_BITRATES: Readonly<Record<RecordingQuality, number>> = {
  low: 2_500_000,
  balanced: 6_000_000,
  high: 12_000_000
}

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
