import { z } from 'zod'

export const RECORDING_RESOLUTIONS = ['original', '720p', '1080p', '1440p', '4k'] as const
export const recordingResolutionSchema = z.enum(RECORDING_RESOLUTIONS)
export type RecordingResolution = z.infer<typeof recordingResolutionSchema>

export const RECORDING_FPS = [24, 30, 48, 60, 120] as const
export type RecordingFps = (typeof RECORDING_FPS)[number]
export const recordingFpsSchema = z
  .number()
  .int()
  .refine((value): value is RecordingFps => (RECORDING_FPS as readonly number[]).includes(value), {
    message: 'Frecuencia de cuadros no soportada'
  })

export const RECORDING_FORMATS = ['webm', 'mp4', 'mkv'] as const
export const recordingFormatSchema = z.enum(RECORDING_FORMATS)
export type RecordingFormat = z.infer<typeof recordingFormatSchema>

/** `balanced` se etiqueta en la interfaz como «Media» para no romper ajustes guardados. */
export const RECORDING_QUALITIES = ['low', 'balanced', 'high', 'custom'] as const
export const recordingQualitySchema = z.enum(RECORDING_QUALITIES)
export type RecordingQuality = z.infer<typeof recordingQualitySchema>

export const VIDEO_CODECS = ['auto', 'h264', 'h265', 'av1', 'vp8', 'vp9'] as const
export const videoCodecSchema = z.enum(VIDEO_CODECS)
export type VideoCodec = z.infer<typeof videoCodecSchema>

export const HARDWARE_ACCELERATIONS = ['auto', 'cpu', 'nvenc', 'amf', 'qsv'] as const
export const hardwareAccelerationSchema = z.enum(HARDWARE_ACCELERATIONS)
export type HardwareAcceleration = z.infer<typeof hardwareAccelerationSchema>

export const FFMPEG_PRESETS = ['ultrafast', 'veryfast', 'fast', 'medium', 'slow'] as const
export const ffmpegPresetSchema = z.enum(FFMPEG_PRESETS)
export type FfmpegPreset = z.infer<typeof ffmpegPresetSchema>

export const RESOLUTION_SIZES: Readonly<
  Record<RecordingResolution, { width: number; height: number } | null>
> = {
  original: null,
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 }
}

export const QUALITY_BITRATES: Readonly<Record<RecordingQuality, number>> = {
  low: 2_500_000,
  balanced: 6_000_000,
  high: 12_000_000,
  custom: 6_000_000
}

export const FFMPEG_CRF: Readonly<Record<Exclude<RecordingQuality, 'custom'>, string>> = {
  low: '32',
  balanced: '23',
  high: '18'
}

export const encodingPlanSchema = z
  .object({
    format: recordingFormatSchema,
    codec: videoCodecSchema,
    resolution: recordingResolutionSchema,
    fps: recordingFpsSchema,
    quality: recordingQualitySchema,
    hardware: hardwareAccelerationSchema,
    /** Bitrate final de vídeo en bits/s (ya resuelto desde la calidad o desde el valor personalizado). */
    bitrate: z.number().int().min(500_000).max(100_000_000),
    /** CRF explícito; solo se usa en la ruta FFmpeg. `null` = usar el presets de calidad. */
    crf: z.number().int().min(0).max(51).nullable(),
    keyframeInterval: z.number().int().min(1).max(600).nullable(),
    preset: ffmpegPresetSchema.nullable(),
    /** `true` cuando el códec/formato/ajustes exigen pasar por FFmpeg. */
    transcode: z.boolean(),
    /** `true` cuando FFmpeg solo reenvuelve los streams, sin recodificar vídeo. */
    streamCopy: z.boolean(),
    /** Valores realmente entregados por la fuente, nunca los solicitados. */
    /** Valores informados por `track.getSettings()` tras aplicar constraints. */
    actualWidth: z.number().int().positive().nullable(),
    actualHeight: z.number().int().positive().nullable(),
    actualFps: z.number().positive().nullable(),
    /** Cadencia realmente observada en frames entregados; puede ser menor que la solicitada. */
    measuredFps: z.number().positive().nullable()
  })
  .strict()
export type EncodingPlan = z.infer<typeof encodingPlanSchema>

export const encoderAvailabilitySchema = z
  .object({
    available: z.boolean(),
    /** Motivo legible cuando no está disponible; `null` cuando sí lo está. */
    reason: z.string().nullable()
  })
  .strict()
export type EncoderAvailability = z.infer<typeof encoderAvailabilitySchema>

export const encodingCapabilitiesSchema = z
  .object({
    ffmpeg: encoderAvailabilitySchema.extend({
      version: z.string().nullable()
    }),
    formats: z.record(z.string(), encoderAvailabilitySchema),
    codecs: z.record(z.string(), encoderAvailabilitySchema),
    hardware: z.record(z.string(), encoderAvailabilitySchema),
    /** Nombres reales devueltos por `ffmpeg -encoders`. */
    encoderNames: z.array(z.string()),
    /** Valores reales devueltos por `ffmpeg -hwaccels`. */
    hwaccels: z.array(z.string())
  })
  .strict()
export type EncodingCapabilities = z.infer<typeof encodingCapabilitiesSchema>

export const EMPTY_ENCODING_CAPABILITIES: EncodingCapabilities = {
  ffmpeg: {
    available: false,
    reason: 'FFmpeg no está disponible o no se ha podido sondear.',
    version: null
  },
  formats: {},
  codecs: {},
  hardware: {},
  encoderNames: [],
  hwaccels: []
}


export const recorderMimeCapabilitySchema = z
  .object({
    mimeType: z.string(),
    actualMimeType: z.string().nullable(),
    format: recordingFormatSchema,
    codec: videoCodecSchema,
    verified: z.boolean(),
    reason: z.string().nullable()
  })
  .strict()
export type RecorderMimeCapability = z.infer<typeof recorderMimeCapabilitySchema>

export const rendererEncodingCapabilitiesSchema = z
  .object({
    mimeTypes: z.array(recorderMimeCapabilitySchema),
    /** Límites informados por la fuente/función de captura; nunca supuestos. */
    maxWidth: z.number().int().positive().nullable(),
    maxHeight: z.number().int().positive().nullable(),
    maxFps: z.number().positive().nullable(),
    probedAt: z.number()
  })
  .strict()
export type RendererEncodingCapabilities = z.infer<typeof rendererEncodingCapabilitiesSchema>

export const EMPTY_RENDERER_CAPABILITIES: RendererEncodingCapabilities = {
  mimeTypes: [],
  maxWidth: null,
  maxHeight: null,
  maxFps: null,
  probedAt: 0
}

/** Codificadores candidatos que se prueban con `MediaRecorder`. */
export const RECORDER_MIME_CANDIDATES: readonly {
  mimeType: string
  format: RecordingFormat
  codec: Exclude<VideoCodec, 'auto'>
}[] = [
  { mimeType: 'video/webm;codecs=vp9', format: 'webm', codec: 'vp9' },
  { mimeType: 'video/webm;codecs=vp8', format: 'webm', codec: 'vp8' },
  { mimeType: 'video/webm;codecs=av1', format: 'webm', codec: 'av1' },
  { mimeType: 'video/x-matroska;codecs=h264', format: 'mkv', codec: 'h264' },
  { mimeType: 'video/mp4;codecs=avc1.42E01E', format: 'mp4', codec: 'h264' },
  { mimeType: 'video/mp4;codecs=av01', format: 'mp4', codec: 'av1' }
]

/** Un MIME solo es utilizable si la grabación de prueba produjo bytes y un encabezado válido. */
export function verifiedRecorderMime(
  capabilities: RendererEncodingCapabilities,
  format: RecordingFormat,
  codec: Exclude<VideoCodec, 'auto'>
): RecorderMimeCapability | null {
  return (
    capabilities.mimeTypes.find(
      (item) => item.verified && item.format === format && item.codec === codec
    ) ?? null
  )
}

/** Resuelve `auto` a un códec concreto sin inventar soporte. */
export function resolveCodec(preferences: {
  codec: VideoCodec
  format: RecordingFormat
}): Exclude<VideoCodec, 'auto'> {
  return preferences.codec === 'auto' ? defaultCodecFor(preferences.format) : preferences.codec
}

/** Bitrate efectivo: el personalizado gana; el resto usa la tabla de calidad. */
export function resolveBitrate(quality: RecordingQuality, custom: number | null): number {
  if (quality === 'custom' && custom !== null) return custom
  return QUALITY_BITRATES[quality]
}

/**
 * Elige la resolución más alta al alcance real de la fuente. Una petición de 4K sobre una
 * fuente 1080p se degrada a 1080p; nunca se anuncia como 4K.
 */
export function effectiveResolution(
  requested: RecordingResolution,
  width: number | null,
  height: number | null
): RecordingResolution {
  if (!width || !height) return requested
  const candidates: readonly { id: RecordingResolution; width: number; height: number }[] = [
    { id: '4k', width: 3840, height: 2160 },
    { id: '1440p', width: 2560, height: 1440 },
    { id: '1080p', width: 1920, height: 1080 },
    { id: '720p', width: 1280, height: 720 }
  ]
  const requestedSize = RESOLUTION_SIZES[requested]
  if (!requestedSize) return 'original'
  const fits = (size: { width: number; height: number }): boolean =>
    width >= size.width && height >= size.height
  if (!fits(requestedSize)) {
    return candidates.find((candidate) => fits(candidate))?.id ?? 'original'
  }
  return requested
}

/** Escala de FPS segura: 120 exige una fuente que realmente entregue al menos 120 Hz. */
export function effectiveFps(requested: RecordingFps, sourceMaxFps: number | null): RecordingFps {
  if (sourceMaxFps === null || sourceMaxFps >= requested) return requested
  const supported = [...RECORDING_FPS]
    .reverse()
    .find((fps) => fps <= sourceMaxFps + 0.01)
  return supported ?? 24
}

export function availability(
  available: boolean,
  reason: string | null
): EncoderAvailability {
  return { available, reason }
}

/** Comprueba que un plan que exige FFmpeg tenga un codificador realmente detectado. */
export function assertEncodingPlan(
  plan: EncodingPlan,
  capabilities: EncodingCapabilities
): string | null {
  if (!plan.transcode) return null
  if (!capabilities.ffmpeg.available) {
    return 'Esta combinación requiere FFmpeg y no está disponible.'
  }
  if (!capabilities.formats[plan.format]?.available) {
    return `FFmpeg no puede escribir el contenedor ${plan.format}.`
  }
  const codec = resolveCodec({ codec: plan.codec, format: plan.format })
  if (!capabilities.codecs[codec]?.available) {
    return `El códec ${codec} no está disponible en esta instalación de FFmpeg.`
  }
  if (plan.hardware !== 'auto' && plan.hardware !== 'cpu') {
    if (!capabilities.hardware[plan.hardware]?.available) {
      return `La aceleración ${plan.hardware} no superó la prueba real de codificación.`
    }
  }
  return null
}

export const recordingProfileSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(48),
    resolution: recordingResolutionSchema,
    fps: recordingFpsSchema,
    format: recordingFormatSchema,
    codec: videoCodecSchema,
    quality: recordingQualitySchema,
    hardware: hardwareAccelerationSchema,
    bitrate: z.number().int().min(500_000).max(100_000_000).nullable(),
    crf: z.number().int().min(0).max(51).nullable(),
    keyframeInterval: z.number().int().min(1).max(600).nullable(),
    preset: ffmpegPresetSchema.nullable(),
    builtin: z.boolean()
  })
  .strict()
export type RecordingProfile = z.infer<typeof recordingProfileSchema>

/** Perfiles listos para usar; los valores siguen sujetos a las capacidades detectadas. */
export const BUILTIN_PROFILES: readonly RecordingProfile[] = [
  {
    id: 'builtin-rapido',
    name: 'Rápido · 720p30 WebM',
    resolution: '720p',
    fps: 30,
    format: 'webm',
    codec: 'vp9',
    quality: 'low',
    hardware: 'auto',
    bitrate: null,
    crf: null,
    keyframeInterval: null,
    preset: null,
    builtin: true
  },
  {
    id: 'builtin-estandar',
    name: 'Estándar · 1080p30 WebM',
    resolution: '1080p',
    fps: 30,
    format: 'webm',
    codec: 'vp9',
    quality: 'balanced',
    hardware: 'auto',
    bitrate: null,
    crf: null,
    keyframeInterval: null,
    preset: null,
    builtin: true
  },
  {
    id: 'builtin-alta',
    name: 'Alta · original 60 WebM',
    resolution: 'original',
    fps: 60,
    format: 'webm',
    codec: 'vp9',
    quality: 'high',
    hardware: 'auto',
    bitrate: null,
    crf: null,
    keyframeInterval: null,
    preset: null,
    builtin: true
  },
  {
    id: 'builtin-mp4',
    name: 'Compatible · 1080p30 MP4 H.264',
    resolution: '1080p',
    fps: 30,
    format: 'mp4',
    codec: 'h264',
    quality: 'balanced',
    hardware: 'auto',
    bitrate: null,
    crf: null,
    keyframeInterval: null,
    preset: null,
    builtin: true
  }
]

/** Códec con el que se graba directamente cuando el usuario elige `auto`. */
export function defaultCodecFor(format: RecordingFormat): Exclude<VideoCodec, 'auto'> {
  return format === 'webm' ? 'vp9' : 'h264'
}

/** Codificador FFmpeg para un códec y modo de aceleración. `null` si no existe esa ruta. */
export function ffmpegEncoderFor(
  codec: Exclude<VideoCodec, 'auto'>,
  hardware: HardwareAcceleration
): string | null {
  const accelerator = hardware === 'auto' || hardware === 'cpu' ? null : hardware
  const software: Record<Exclude<VideoCodec, 'auto'>, string> = {
    h264: 'libx264',
    h265: 'libx265',
    av1: 'libsvtav1',
    vp8: 'libvpx',
    vp9: 'libvpx-vp9'
  }
  if (!accelerator) return software[codec]

  const hardwareEncoder: Partial<
    Record<HardwareAcceleration, Partial<Record<Exclude<VideoCodec, 'auto'>, string>>>
  > = {
    nvenc: { h264: 'h264_nvenc', h265: 'hevc_nvenc', av1: 'av1_nvenc' },
    amf: { h264: 'h264_amf', h265: 'hevc_amf', av1: 'av1_amf' },
    qsv: { h264: 'h264_qsv', h265: 'hevc_qsv', av1: 'av1_qsv' }
  }
  return hardwareEncoder[accelerator]?.[codec] ?? null
}

/** Argumento `-f` del contenedor; Matroska se escribe con `matroska`, no con `mkv`. */
export function containerFor(format: RecordingFormat): 'webm' | 'mp4' | 'matroska' {
  return format === 'mp4' ? 'mp4' : format === 'mkv' ? 'matroska' : 'webm'
}
