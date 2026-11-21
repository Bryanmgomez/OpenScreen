import type { CaptureSnapshot } from '@shared/capture'
import {
  assertEncodingPlan,
  effectiveFps,
  effectiveResolution,
  QUALITY_BITRATES,
  RECORDING_FPS,
  RECORDING_RESOLUTIONS,
  RECORDER_MIME_CANDIDATES,
  RESOLUTION_SIZES,
  resolveBitrate,
  VIDEO_CODECS,
  resolveCodec,
  verifiedRecorderMime,
  type EncodingCapabilities,
  type EncodingPlan,
  type RecordingFormat,
  type RecordingQuality,
  type RecordingResolution,
  type RendererEncodingCapabilities,
  type VideoCodec
} from '@shared/encoding'
import type { Settings } from '@shared/settings'

export interface CaptureLimits {
  width: number | null
  height: number | null
  fps: number | null
}

export interface BuildPlanInput {
  preferences: Settings['recording']
  limits: CaptureLimits
  actual: { width: number | null; height: number | null; fps: number | null; measuredFps: number | null }
  renderer: RendererEncodingCapabilities
  ffmpeg: EncodingCapabilities
}

export interface PlanResult {
  plan: EncodingPlan
  mimeType: string
  warnings: string[]
}

export const RESOLUTION_OPTIONS: readonly { value: RecordingResolution; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '1440p' },
  { value: '4k', label: '4K' }
]

export const FPS_OPTIONS: readonly { value: string; label: string }[] = [
  ...RECORDING_FPS.map((fps) => ({ value: String(fps), label: `${fps} fps` }))
]

export function captureLimits(snapshot: CaptureSnapshot | null): CaptureLimits {
  const selected = snapshot?.selection
  if (!selected) return { width: null, height: null, fps: null }
  const source = snapshot?.sources.find((item) => item.id === selected.id && item.kind === selected.kind)
  return {
    width: source?.width ?? selected.width ?? null,
    height: source?.height ?? selected.height ?? null,
    fps: source?.refreshRate ?? snapshot?.displays.find((display) => display.id === Number(source?.displayId))?.refreshRate ?? null
  }
}

export function codecOptions(
  format: RecordingFormat,
  renderer: RendererEncodingCapabilities,
  ffmpeg: EncodingCapabilities
): { value: VideoCodec; label: string; reason: string | null }[] {
  const labels: Record<VideoCodec, string> = {
    auto: 'Automático',
    h264: 'H.264',
    h265: 'H.265 / HEVC',
    av1: 'AV1',
    vp8: 'VP8',
    vp9: 'VP9'
  }
  return (['auto', 'h264', 'h265', 'av1', 'vp8', 'vp9'] as const).map((codec) => {
    if (codec === 'auto') return { value: codec, label: labels[codec], reason: null }
    const native = RECORDER_MIME_CANDIDATES.some(
      (item) => item.format === format && item.codec === codec && verifiedRecorderMime(renderer, format, codec)
    )
    const encoded = ffmpeg.codecs[codec]?.available === true && ffmpeg.formats[format]?.available === true
    const available = native || encoded
    return {
      value: codec,
      label: labels[codec],
      reason: available
        ? null
        : native
          ? null
          : `Sin soporte verificado para ${format}.`
    }
  })
}

export function hardwareOptions(
  ffmpeg: EncodingCapabilities
): { value: Settings['recording']['hardware']; label: string; reason: string | null }[] {
  const labels = {
    auto: 'Automático',
    cpu: 'CPU',
    nvenc: 'NVIDIA NVENC',
    amf: 'AMD AMF',
    qsv: 'Intel Quick Sync'
  } as const
  return (['auto', 'cpu', 'nvenc', 'amf', 'qsv'] as const).map((mode) => {
    const available = mode === 'auto' || ffmpeg.hardware[mode]?.available === true
    return {
      value: mode,
      label: labels[mode],
      reason: available ? null : (ffmpeg.hardware[mode]?.reason ?? 'No detectado.')
    }
  })
}

export function qualityOptions(): { value: RecordingQuality; label: string }[] {
  return [
    { value: 'low', label: 'Baja' },
    { value: 'balanced', label: 'Media' },
    { value: 'high', label: 'Alta' },
    { value: 'custom', label: 'Personalizada' }
  ]
}

export function formatOptions(
  renderer: RendererEncodingCapabilities,
  ffmpeg: EncodingCapabilities
): { value: RecordingFormat; label: string; reason: string | null }[] {
  const labels: Record<RecordingFormat, string> = {
    webm: 'WebM (nativo)',
    mp4: 'MP4',
    mkv: 'MKV / Matroska'
  }
  return (['webm', 'mp4', 'mkv'] as const).map((format) => {
    const native = renderer.mimeTypes.some((item) => item.verified && item.format === format)
    const encoded = ffmpeg.formats[format]?.available === true
    return {
      value: format,
      label: labels[format],
      reason: native || encoded ? null : 'Sin codificador verificado; instala FFmpeg.'
    }
  })
}

export function resolutionOptions(
  limits: CaptureLimits,
  ffmpeg: EncodingCapabilities
): { value: RecordingResolution; label: string; reason: string | null }[] {
  return RECORDING_RESOLUTIONS.map((id) => {
    const size = RESOLUTION_SIZES[id]
    const needsUpscale = Boolean(
      size && (limits.width === null || limits.height === null || limits.width < size.width || limits.height < size.height)
    )
    const available = !needsUpscale || ffmpeg.ffmpeg.available
    return {
      value: id,
      label: id === '4k' ? '4K' : id === 'original' ? 'Original' : id.replace('p', 'p'),
      reason: available
        ? null
        : `La fuente no entrega este tamaño; requiere escalado con FFmpeg (${limits.width ?? '?'}×${limits.height ?? '?'}).`
    }
  })
}

export function fpsOptions(
  limits: CaptureLimits,
  renderer: RendererEncodingCapabilities
): { value: string; label: string; reason: string | null }[] {
  const maxKnown = Math.min(
    limits.fps ?? Number.POSITIVE_INFINITY,
    renderer.maxFps ?? Number.POSITIVE_INFINITY
  )
  return FPS_OPTIONS.map((option) => {
    const fps = Number(option.value)
    const available = fps <= maxKnown + 0.01
    return {
      ...option,
      reason: available
        ? null
        : `No hay evidencia de que la fuente entregue ${fps} fps (máximo conocido: ${Number.isFinite(maxKnown) ? maxKnown : 'desconocido'}).`
    }
  })
}

function hasAdvancedParams(preferences: Settings['recording']): boolean {
  return (
    preferences.quality === 'custom' &&
    (preferences.crf !== null || preferences.keyframeInterval !== null || preferences.preset !== null)
  )
}

/** Construye el plan final. Lanza si la combinación elegida no fue verificada. */
export function buildEncodingPlan(input: BuildPlanInput): PlanResult {
  const { preferences, limits, actual, renderer, ffmpeg } = input
  const warnings: string[] = []
  const requestedResolution = effectiveResolution(preferences.resolution, limits.width, limits.height)
  const requestedFps = effectiveFps(preferences.fps, limits.fps)
  if (requestedResolution !== preferences.resolution) {
    warnings.push(
      `Resolución reducida a ${requestedResolution}: la fuente entrega ${actual.width ?? limits.width ?? '?'}×${actual.height ?? limits.height ?? '?'}.`
    )
  }
  if (requestedFps !== preferences.fps) {
    warnings.push(`FPS reducido a ${requestedFps}: la fuente no alcanza ${preferences.fps}.`)
  }
  if (actual.measuredFps !== null && actual.measuredFps + 3 < requestedFps) {
    warnings.push(
      `El equipo entregó ~${actual.measuredFps.toFixed(1)} fps; el archivo se genera a ${requestedFps} fps.`
    )
  }

  let codec = resolveCodec({ codec: preferences.codec, format: preferences.format })
  // Un valor persistido puede haber dejado de estar verificado: se degrada a un códec probado.
  let nativeCodec = verifiedRecorderMime(renderer, preferences.format, codec)
  if (!nativeCodec) {
    const alternative = VIDEO_CODECS.find(
      (candidate) =>
        candidate !== 'auto' &&
        candidate !== codec &&
        verifiedRecorderMime(renderer, preferences.format, candidate) !== null
    )
    if (alternative && alternative !== 'auto') {
      warnings.push(`El códec ${codec} no superó la prueba real; se usa ${alternative}.`)
      codec = alternative
      nativeCodec = verifiedRecorderMime(renderer, preferences.format, codec)
    }
  }
  const advanced = hasAdvancedParams(preferences)
  const needsHardware = preferences.hardware !== 'auto' && preferences.hardware !== 'cpu'
  const sizeMismatch = Boolean(
    preferences.resolution !== 'original' &&
    actual.width !== null &&
    actual.height !== null &&
    (() => {
      const target = RESOLUTION_SIZES[preferences.resolution]?.height
      return target !== undefined && actual.height < target
    })()
  )
  const canNative =
    Boolean(nativeCodec) &&
    !advanced &&
    !needsHardware &&
    !sizeMismatch &&
    (preferences.quality !== 'custom' || preferences.bitrate !== null)

  const transcode = !canNative
  // MKV puede reenvueltar el WebM de MediaRecorder sin tocar el vídeo; MP4 no siempre.
  const streamCopy =
    transcode &&
    !advanced &&
    !needsHardware &&
    preferences.quality !== 'custom' &&
    (preferences.format === 'mkv' || (preferences.format === 'webm' && !sizeMismatch))
  let mimeType: string
  if (canNative && nativeCodec) {
    mimeType = nativeCodec.actualMimeType ?? nativeCodec.mimeType
  } else {
    const intermediate =
      verifiedRecorderMime(renderer, 'webm', codec) ??
      verifiedRecorderMime(renderer, 'webm', 'vp9') ??
      verifiedRecorderMime(renderer, 'webm', 'vp8') ??
      verifiedRecorderMime(renderer, 'webm', 'av1')
    if (!intermediate) {
      throw new Error(
        'MediaRecorder no produjo ningún contenedor WebM válido en la prueba real; no se puede grabar.'
      )
    }
    mimeType = intermediate.actualMimeType ?? intermediate.mimeType
  }

  const plan: EncodingPlan = {
    format: preferences.format,
    codec,
    resolution: requestedResolution,
    fps: requestedFps,
    quality: preferences.quality,
    hardware: preferences.hardware,
    bitrate: resolveBitrate(preferences.quality, preferences.bitrate),
    crf: preferences.crf,
    keyframeInterval: preferences.keyframeInterval,
    preset: preferences.preset,
    transcode,
    streamCopy,
    actualWidth: actual.width,
    actualHeight: actual.height,
    actualFps: actual.fps,
    measuredFps: actual.measuredFps
  }

  if (transcode) {
    const problem = assertEncodingPlan(plan, ffmpeg)
    if (problem) throw new Error(`${problem} Prueba otra combinación o usa WebM nativo.`)
  }

  return { plan, mimeType, warnings }
}

/** Bitrate usado por MediaRecorder: en la ruta FFmpeg se sube para no degradar el máster. */
export function recorderBitrate(plan: EncodingPlan): number {
  if (!plan.transcode) return plan.bitrate
  return Math.max(plan.bitrate, QUALITY_BITRATES.high)
}
