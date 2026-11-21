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
  videoCodecSchema,
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

/**
 * Sidecar `.openscreen.json`. La versión es opcional para poder leer grabaciones de sesiones
 * anteriores; cualquier campo desconocido se conserva al renombrar.
 */
export const RECORDING_METADATA_VERSION = 1
export const recordingMetadataSchema = z
  .object({
    version: z.number().int().positive().nullable().optional(),
    durationMs: z.number().nonnegative().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    tracks: z.array(audioTrackFileSchema).optional(),
    encoding: encodingPlanSchema.nullable().optional()
  })
  .passthrough()
export type RecordingMetadata = z.infer<typeof recordingMetadataSchema>

export const RECORDING_METADATA_STATUSES = ['ok', 'missing', 'invalid'] as const
export const recordingMetadataStatusSchema = z.enum(RECORDING_METADATA_STATUSES)
export type RecordingMetadataStatus = z.infer<typeof recordingMetadataStatusSchema>

/**
 * Archivo de la biblioteca. Los datos que no pudieron verificarse son `null` y se etiquetan
 * con `metadataStatus`; nunca se rellena un valor supuesto para mostrarlo como real.
 */
export const recordingFileSchema = z
  .object({
    path: z.string(),
    name: z.string(),
    size: z.number().int().nonnegative(),
    mimeType: z.string(),
    format: recordingFormatSchema,
    durationMs: z.number().nonnegative().nullable(),
    createdAt: z.number(),
    tracks: z.array(audioTrackFileSchema),
    metadataStatus: recordingMetadataStatusSchema,
    codec: videoCodecSchema.nullable(),
    actualWidth: z.number().int().positive().nullable(),
    actualHeight: z.number().int().positive().nullable(),
    actualFps: z.number().positive().nullable(),
    measuredFps: z.number().positive().nullable(),
    encoding: encodingPlanSchema.nullable()
  })
  .strict()
export type RecordingFile = z.infer<typeof recordingFileSchema>

/** Formato declarado por la extensión del contenedor final. */
export function recordingFormatForName(name: string): RecordingFormat {
  const lower = name.toLowerCase()
  if (lower.endsWith('.mp4')) return 'mp4'
  if (lower.endsWith('.mkv')) return 'mkv'
  return 'webm'
}

const INVALID_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index).toLowerCase() : ''
}

/** Validación compartida por main y renderer antes de renombrar un archivo real. */
export function validateRecordingName(name: string, currentExtension: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Escribe un nombre para la grabación.'
  if (trimmed === '.' || trimmed === '..') return 'Ese nombre no es válido.'
  if (INVALID_NAME_CHARS.test(trimmed)) {
    return 'El nombre no puede contener separadores ni los caracteres < > : " / \\ | ? *.'
  }
  if (/[. ]$/.test(trimmed)) return 'El nombre no puede terminar en punto ni en espacio.'
  const expected = `.${recordingFormatForName(`archivo.${currentExtension}`)}`
  const extension = extensionOf(trimmed)
  if (extension !== expected) return `La extensión debe ser ${expected}.`
  const stem = trimmed.slice(0, -extension.length)
  if (!stem.trim()) return 'Escribe un nombre antes de la extensión.'
  if (RESERVED_NAMES.test(stem)) return 'Ese nombre está reservado por Windows.'
  if (stem.length > 180) return 'El nombre es demasiado largo.'
  return null
}

/** Sanea el tronco del nombre conservando la extensión validada. */
export function normalizedRecordingName(name: string): string {
  const extension = extensionOf(name)
  const stem = extension ? name.slice(0, -extension.length) : name
  const cleaned = stem
    .replace(INVALID_NAME_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
  return `${cleaned || 'grabacion'}${extension}`
}

export const recordingStorageInfoSchema = z
  .object({
    outputDir: z.string(),
    exists: z.boolean(),
    writable: z.boolean(),
    available: z.boolean(),
    freeBytes: z.number().int().nonnegative().nullable(),
    reason: z.string().nullable()
  })
  .strict()
export type RecordingStorageInfo = z.infer<typeof recordingStorageInfoSchema>

/** Respuesta única de listado/renombrado/borrado/limpieza: siempre coherente y completa. */
export const recordingLibrarySnapshotSchema = z
  .object({
    items: z.array(recordingFileSchema),
    outputDir: z.string(),
    available: z.boolean(),
    error: z.string().nullable(),
    tempFiles: z.array(z.string()),
    storage: recordingStorageInfoSchema,
    generatedAt: z.number()
  })
  .strict()
export type RecordingLibrarySnapshot = z.infer<typeof recordingLibrarySnapshotSchema>

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

/** El nuevo nombre llega completo (con extensión); main valida que sea seguro y único. */
export const recordingRenameRequestSchema = z
  .object({
    path: z.string().min(1),
    name: z.string().min(1)
  })
  .strict()
export type RecordingRenameRequest = z.infer<typeof recordingRenameRequestSchema>

export const recordingListSchema = z.array(recordingFileSchema)
export type RecordingList = z.infer<typeof recordingListSchema>

export const RECORDING_SORTS = ['date', 'name', 'duration', 'size'] as const
export const recordingSortSchema = z.enum(RECORDING_SORTS)
export type RecordingSort = z.infer<typeof recordingSortSchema>

export const RECORDING_PERIODS = ['all', 'today', '7d', '30d'] as const
export const recordingPeriodSchema = z.enum(RECORDING_PERIODS)
export type RecordingPeriod = z.infer<typeof recordingPeriodSchema>

export interface RecordingLibraryFilter {
  query: string
  format: RecordingFormat | 'all'
  period: RecordingPeriod
  sort: RecordingSort
  direction: 'asc' | 'desc'
}

function compareUnknownLast<T>(
  left: T | null,
  right: T | null,
  compare: (a: T, b: T) => number,
  factor: number
): number {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return compare(left, right) * factor
}

/**
 * Filtro y orden puros de la biblioteca. Lo desconocido siempre va al final, también cuando
 * el usuario elige orden ascendente, para no mezclar datos inventados con datos verificados.
 */
export function filterAndSortRecordings(
  items: readonly RecordingFile[],
  filter: RecordingLibraryFilter,
  now = Date.now()
): RecordingFile[] {
  const query = filter.query.trim().toLocaleLowerCase('es')
  const dayMs = 86_400_000
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const periodStart =
    filter.period === 'today'
      ? startOfToday.getTime()
      : filter.period === '7d'
        ? now - 7 * dayMs
        : filter.period === '30d'
          ? now - 30 * dayMs
          : null

  const filtered = items.filter((item) => {
    if (query && !item.name.toLocaleLowerCase('es').includes(query)) return false
    if (filter.format !== 'all' && item.format !== filter.format) return false
    if (periodStart !== null && item.createdAt < periodStart) return false
    return true
  })

  const factor = filter.direction === 'asc' ? 1 : -1
  return [...filtered].sort((a, b) => {
    let comparison: number
    if (filter.sort === 'name') {
      comparison = a.name.localeCompare(b.name, 'es', { numeric: true })
    } else if (filter.sort === 'date') {
      comparison = a.createdAt - b.createdAt
    } else if (filter.sort === 'duration') {
      return compareUnknownLast(a.durationMs, b.durationMs, (x, y) => x - y, factor)
    } else {
      comparison = a.size - b.size
    }
    return comparison * factor
  })
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
