import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import type {
  RecordingFormat,
  RecordingQuality,
  RecordingState
} from '../../../shared/recording'

/**
 * Lógica pura del motor de grabación. No importa Electron ni MediaRecorder, así que puede
 * probarse en Node. El servicio de `recordingService.ts` se encarga de E/S y del estado.
 */

const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

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

export function normalizeExtension(extension: string): 'webm' | 'mp4' {
  return extension.toLowerCase() === 'mp4' ? 'mp4' : 'webm'
}

const FFMPEG_CRF: Readonly<Record<RecordingQuality, string>> = {
  low: '32',
  balanced: '23',
  high: '18'
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

/** Comandos para FFmpeg siempre como array: nunca se construye un string de shell. */
export function buildFfmpegArgs(options: {
  input: string
  output: string
  quality: RecordingQuality
  format: RecordingFormat
}): string[] {
  if (options.format !== 'mp4') return []
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    options.input,
    '-map',
    '0:v:0',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    FFMPEG_CRF[options.quality],
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-f',
    'mp4',
    '-movflags',
    '+faststart',
    options.output
  ]
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

/** Solo se listan contenedores finalizados; los `.part` se ignoran. */
export function isFinalRecordingFile(name: string): boolean {
  return !isTempFileName(name) && /\.(webm|mp4)$/i.test(name)
}
