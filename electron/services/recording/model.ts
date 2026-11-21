import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import {
  containerFor,
  ffmpegEncoderFor,
  FFMPEG_CRF,
  resolveBitrate,
  resolveCodec,
  type FfmpegPreset,
  type HardwareAcceleration,
  type RecordingFormat,
  type RecordingFps,
  type RecordingQuality,
  type VideoCodec
} from '../../../shared/encoding'
import {
  normalizedRecordingName,
  recordingFormatForName,
  validateRecordingName,
  type RecordingState
} from '../../../shared/recording'

export { normalizedRecordingName, validateRecordingName }

/**
 * Lógica pura del motor de grabación. No importa Electron ni MediaRecorder, así que puede
 * probarse en Node. El servicio de `recordingService.ts` se encarga de E/S y del estado.
 */

const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g
export const RECORDING_MEDIA_PROTOCOL = 'openscreen-media'
const RECORDING_MEDIA_HOST = 'recording'

/** Convierte cualquier texto (por ejemplo un título de ventana) en un nombre de archivo seguro. */
export function safeFilePart(value: string): string {
  const cleaned = value
    .replace(INVALID_FILE_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
  return cleaned || 'grabacion'
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDatePart(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

export function formatTimePart(date: Date): string {
  return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

/**
 * Genera el nombre base a partir de una plantilla. Soporta `{source}`, `{date}`, `{time}`
 * y `{ext}`. La plantilla se sanea completa para que no pueda escapar de la carpeta elegida.
 */
export function buildRecordingName(options: {
  template: string
  sourceName: string
  date: Date
  extension: string
}): string {
  const extension = normalizeExtension(options.extension)
  const replaced = options.template
    .replace(/\{source\}/gi, safeFilePart(options.sourceName))
    .replace(/\{date\}/gi, formatDatePart(options.date))
    .replace(/\{time\}/gi, formatTimePart(options.date))
    .replace(/\{ext\}/gi, `.${extension}`)

  const safe = safeFilePart(replaced).replace(/\.+/g, '.')
  return safe.toLowerCase().endsWith(`.${extension}`) ? safe : `${safe}.${extension}`
}

export function withUniqueSuffix(name: string, ordinal: number): string {
  if (ordinal <= 1) return name
  const extension = extname(name)
  const stem = extension ? name.slice(0, -extension.length) : name
  return `${stem}-${ordinal}${extension}`
}

export function normalizeExtension(extension: string): RecordingFormat {
  const value = extension.toLowerCase()
  return value === 'mp4' || value === 'mkv' ? value : 'webm'
}

/** MediaRecorder solo puede iniciar desde inactivo (o tras un error ya limpiado). */
export function canStart(state: RecordingState): boolean {
  return state === 'idle' || state === 'error'
}

export function canPause(state: RecordingState): boolean {
  return state === 'recording'
}

export function canResume(state: RecordingState): boolean {
  return state === 'paused'
}

export function canFinish(state: RecordingState): boolean {
  return state === 'recording' || state === 'paused'
}

export interface FfmpegArgsOptions {
  input: string
  output: string
  format: RecordingFormat
  quality: RecordingQuality
  /** Vídeo + pistas independientes, en este orden: micrófono, sistema. */
  audioInputs?: readonly string[]
  codec?: VideoCodec
  hardware?: HardwareAcceleration
  bitrate?: number
  crf?: number | null
  keyframeInterval?: number | null
  preset?: FfmpegPreset | null
  /** Tamaño y cadencia finales cuando la fuente no entrega lo solicitado. */
  width?: number | null
  height?: number | null
  fps?: RecordingFps | null
}

function isHardwareEncoder(encoder: string): boolean {
  return /_(nvenc|amf|qsv)$/.test(encoder)
}

function presetArgs(encoder: string, preset: FfmpegPreset | null | undefined): string[] {
  if (!preset || isHardwareEncoder(encoder)) return []
  if (encoder === 'libsvtav1') {
    const values: Record<FfmpegPreset, string> = {
      ultrafast: '12',
      veryfast: '10',
      fast: '8',
      medium: '6',
      slow: '3'
    }
    return ['-preset', values[preset]]
  }
  if (encoder === 'libvpx' || encoder === 'libvpx-vp9') {
    const values: Record<FfmpegPreset, string> = {
      ultrafast: '8',
      veryfast: '6',
      fast: '4',
      medium: '2',
      slow: '0'
    }
    return ['-deadline', 'good', '-cpu-used', values[preset]]
  }
  return ['-preset', preset]
}

function qualityArgs(options: FfmpegArgsOptions, encoder: string): string[] {
  // Los codificadores de hardware no aceptan CRF: se les entrega un bitrate explícito.
  if (isHardwareEncoder(encoder)) {
    return ['-b:v', String(resolveBitrate(options.quality, options.bitrate ?? null))]
  }
  if (options.crf !== null && options.crf !== undefined) {
    return encoder.startsWith('libvpx')
      ? ['-crf', String(options.crf), '-b:v', '0']
      : ['-crf', String(options.crf)]
  }
  if (options.bitrate !== undefined && options.quality === 'custom') {
    return ['-b:v', String(options.bitrate)]
  }
  if (options.quality === 'custom') {
    return ['-crf', FFMPEG_CRF.balanced]
  }
  return ['-crf', FFMPEG_CRF[options.quality]]
}

/**
 * Comandos para FFmpeg siempre como array: nunca se construye un string de shell.
 * WebM sin nuevos parámetros ni pistas independientes no se recodifica: se copia el stream.
 */
export function buildFfmpegArgs(options: FfmpegArgsOptions): string[] {
  const audioInputs = options.audioInputs ?? []
  const wantsScaling = Boolean(options.width && options.height)
  const wantsFps = options.fps !== null && options.fps !== undefined
  const wantsEncoder =
    options.codec !== undefined ||
    options.hardware !== undefined ||
    options.bitrate !== undefined ||
    (options.crf !== undefined && options.crf !== null) ||
    (options.keyframeInterval !== undefined && options.keyframeInterval !== null) ||
    (options.preset !== undefined && options.preset !== null)
  // WebM sin pistas independientes ya sale de MediaRecorder: no se recodifica nada.
  if (
    options.format === 'webm' &&
    audioInputs.length === 0 &&
    !wantsScaling &&
    !wantsFps &&
    !wantsEncoder
  ) {
    return []
  }

  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    options.input,
    ...audioInputs.flatMap((path) => ['-i', path]),
    '-map',
    '0:v:0'
  ]

  if (audioInputs.length > 0) {
    audioInputs.forEach((_path, index) => args.push('-map', `${index + 1}:a:0`))
    args.push('-metadata:s:a:0', 'title=Micrófono')
    if (audioInputs.length > 1) args.push('-metadata:s:a:1', 'title=Audio del sistema')
  } else {
    args.push('-map', '0:a?')
  }

  const filters: string[] = []
  if (wantsScaling) filters.push(`scale=${options.width}:${options.height}:flags=lanczos`)
  if (wantsFps) filters.push(`fps=${options.fps}`)
  if (filters.length > 0) args.push('-vf', filters.join(','))

  const needsVideoEncode =
    options.format === 'mp4' || wantsEncoder || wantsScaling || wantsFps
  if (needsVideoEncode) {
    const codec = resolveCodec({
      codec: options.codec ?? 'auto',
      format: options.format
    })
    const hardware = options.hardware === 'auto' || !options.hardware ? 'cpu' : options.hardware
    const encoder = ffmpegEncoderFor(codec, hardware) ?? ffmpegEncoderFor(codec, 'cpu')
    if (!encoder) throw new Error(`No hay un codificador FFmpeg conocido para ${codec}.`)
    args.push('-c:v', encoder, ...presetArgs(encoder, options.preset))
    args.push(...qualityArgs(options, encoder))
    if (options.keyframeInterval !== null && options.keyframeInterval !== undefined) {
      args.push('-g', String(options.keyframeInterval))
    }
    args.push('-pix_fmt', 'yuv420p')
  } else {
    // WebM/Matroska con parámetros por defecto conserva Opus y vídeo: cero pérdida generacional.
    args.push('-c', 'copy')
  }

  if (options.format === 'mp4') {
    args.push('-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart')
  } else {
    args.push('-c:a', 'copy')
  }

  args.push('-f', containerFor(options.format), options.output)
  return args
}

export function isTempFileName(name: string): boolean {
  return name.endsWith('.part')
}

export function tempPathFor(finalPath: string): string {
  return `${finalPath}.part`
}

/** Metadatos mínimos para que la biblioteca pueda mostrar la duración real. */
export function metadataPathFor(finalPath: string): string {
  return `${finalPath}.openscreen.json`
}

/** Pista independiente: WebM con Opus, codificada por MediaRecorder en el renderer. */
export function audioTrackPathFor(finalPath: string, kind: 'microphone' | 'system'): string {
  const extension = extname(finalPath)
  const stem = extension ? finalPath.slice(0, -extension.length) : finalPath
  return `${stem}.${kind}.webm`
}

export function audioTempPathFor(finalPath: string, kind: 'microphone' | 'system'): string {
  return `${audioTrackPathFor(finalPath, kind)}.part`
}

export function displayNameFor(path: string): string {
  return basename(path)
}

/** Resuelve una carpeta configurable; las relativas se interpretan dentro de Vídeos. */
export function resolveOutputDir(configured: string | null, videosDir: string): string {
  if (!configured || !configured.trim()) return resolve(videosDir)
  const value = configured.trim()
  return isAbsolute(value) ? resolve(value) : resolve(videosDir, value)
}

/** Evita que el renderer pueda borrar/revelar archivos fuera de la carpeta de grabaciones. */
export function isPathInside(parent: string, child: string): boolean {
  const parentPath = resolve(parent)
  const childPath = resolve(child)
  if (parentPath === childPath) return true
  const rel = relative(parentPath, childPath)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel) && !rel.split(sep).includes('..')
}

/** Un archivo de pista independiente no es una grabación por sí sola. */
export function isAudioTrackFileName(name: string): boolean {
  return /\.(microphone|system)\.webm$/i.test(name)
}

/** Solo se listan contenedores finalizados; los `.part` y las pistas independientes se ignoran. */
export function isFinalRecordingFile(name: string): boolean {
  return (
    !isTempFileName(name) &&
    !isAudioTrackFileName(name) &&
    /\.(webm|mp4|mkv)$/i.test(name)
  )
}

/** Solo los temporales generados por OpenScreen pueden ser limpiados automáticamente. */
export function isManagedTempFileName(name: string): boolean {
  if (!isTempFileName(name)) return false
  const withoutPart = name.slice(0, -'.part'.length)
  return (
    /\.(webm|mp4|mkv)$/i.test(withoutPart) ||
    isAudioTrackFileName(withoutPart) ||
    /\.ffmpeg$/i.test(withoutPart)
  )
}

/** MIME declarado por el contenedor. No pretende haber inspeccionado los bytes. */
export function mimeTypeForRecordingName(name: string): string {
  const format = recordingFormatForName(name)
  if (format === 'mp4') return 'video/mp4'
  if (format === 'mkv') return 'video/x-matroska'
  return 'video/webm'
}

/** URL de esquema privado. El path se codifica como un único segmento. */
export function mediaUrlFor(path: string): string {
  return `${RECORDING_MEDIA_PROTOCOL}://${RECORDING_MEDIA_HOST}/${encodeURIComponent(path)}`
}

/** Devuelve el path original solo si la URL pertenece estrictamente a nuestro esquema. */
export function pathFromMediaUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== `${RECORDING_MEDIA_PROTOCOL}:`) return null
    if (parsed.host !== RECORDING_MEDIA_HOST || parsed.search || parsed.hash) return null
    if (!parsed.pathname.startsWith('/')) return null
    const encoded = parsed.pathname.slice(1)
    if (!encoded) return null
    const decoded = decodeURIComponent(encoded)
    return decoded || null
  } catch {
    return null
  }
}
