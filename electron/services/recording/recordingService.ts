import { randomUUID } from 'node:crypto'
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
  type FileHandle
} from 'node:fs/promises'
import { resolve } from 'node:path'
import type { CaptureSnapshot, SourceRef } from '../../../shared/capture'
import type {
  RecordingBeginRequest,
  RecordingChunk,
  RecordingFile,
  RecordingFinishRequest,
  RecordingFormat,
  RecordingList,
  RecordingQuality,
  RecordingSessionRequest,
  RecordingStatus
} from '../../../shared/recording'
import type { SettingsService } from '../settings/settingsService'
import {
  buildRecordingName,
  canFinish,
  canPause,
  canResume,
  canStart,
  isFinalRecordingFile,
  isPathInside,
  metadataPathFor,
  normalizeExtension,
  resolveOutputDir,
  tempPathFor,
  withUniqueSuffix
} from './model'

export interface FfmpegPort {
  isAvailable(): Promise<boolean>
  transcode(options: {
    input: string
    output: string
    format: RecordingFormat
    quality: RecordingQuality
  }): Promise<void>
}

export interface CapturePort {
  getSnapshot(): Promise<CaptureSnapshot>
}

export interface RecordingServiceOptions {
  settings: SettingsService
  capture: CapturePort
  getVideosPath: () => string
  now?: () => number
  ffmpeg?: FfmpegPort
  reveal?: (path: string) => void
  open?: (path: string) => void
}

const EMPTY_STATUS: RecordingStatus = {
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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido al grabar.'
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Dueño del estado de grabación y de los archivos. El renderer solo informa de los eventos
 * del MediaRecorder; aquí se decide si una acción es válida, se escriben los chunks y se
 * publica el estado. Esto evita grabaciones duplicadas y estados inconsistentes.
 */
export class RecordingService {
  private readonly now: () => number
  private readonly ffmpeg: FfmpegPort
  private readonly revealFile: (path: string) => void
  private readonly openFile: (path: string) => void
  private readonly listeners = new Set<(status: RecordingStatus) => void>()
  private status: RecordingStatus = { ...EMPTY_STATUS }
  private handle: FileHandle | null = null
  private expectedChunk = 0
  private currentFormat: RecordingFormat = 'webm'
  private transcodePath: string | null = null

  constructor(private readonly options: RecordingServiceOptions) {
    this.now = options.now ?? Date.now
    this.ffmpeg = options.ffmpeg ?? {
      isAvailable: async () => false,
      transcode: async () => undefined
    }
    this.revealFile = options.reveal ?? (() => undefined)
    this.openFile = options.open ?? (() => undefined)
  }

  getStatus(): RecordingStatus {
    return { ...this.status }
  }

  onStatusChange(listener: (status: RecordingStatus) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getOutputDir(): string {
    return resolveOutputDir(this.options.settings.get().recording.outputDir, this.options.getVideosPath())
  }

  async checkFfmpeg(): Promise<boolean> {
    return this.ffmpeg.isAvailable()
  }

  /** Reserva la sesión y crea el archivo temporal. Falla si ya hay una grabación activa. */
  async begin(request: RecordingBeginRequest): Promise<RecordingStatus> {
    if (!canStart(this.status.state)) {
      throw new Error('Ya hay una grabación en curso. Termínala antes de empezar otra.')
    }
    if (normalizeExtension(request.extension) !== request.options.format) {
      throw new Error('La extensión no coincide con el formato elegido.')
    }
    if (request.options.format === 'mp4' && !(await this.ffmpeg.isAvailable())) {
      throw new Error('MP4 requiere FFmpeg. Instálalo o elige WebM.')
    }

    const snapshot = await this.options.capture.getSnapshot()
    if (
      !snapshot.selectionAvailable ||
      snapshot.selection?.id !== request.source.id ||
      snapshot.selection?.kind !== request.source.kind
    ) {
      throw new Error('La fuente seleccionada ya no está disponible. Vuelve a elegirla.')
    }

    const finalPath = await this.reservePath(request)
    const tempPath = tempPathFor(finalPath)

    this.handle = await open(tempPath, 'w')
    this.expectedChunk = 0
    this.currentFormat = request.options.format
    this.transcodePath = null
    this.status = {
      ...EMPTY_STATUS,
      state: 'recording',
      sessionId: randomUUID(),
      source: request.source,
      startedAt: this.now(),
      outputPath: finalPath,
      tempPath,
      mimeType: request.mimeType
    }
    this.emit()
    return this.getStatus()
  }

  async pause(): Promise<RecordingStatus> {
    if (!canPause(this.status.state)) throw new Error('Solo se puede pausar una grabación activa.')
    this.status = { ...this.status, state: 'paused', pausedAt: this.now() }
    this.emit()
    return this.getStatus()
  }

  async resume(): Promise<RecordingStatus> {
    if (!canResume(this.status.state)) throw new Error('La grabación no está pausada.')
    const pausedAt = this.status.pausedAt
    const pausedMs = this.status.pausedMs + (pausedAt === null ? 0 : Math.max(0, this.now() - pausedAt))
    this.status = { ...this.status, state: 'recording', pausedAt: null, pausedMs }
    this.emit()
    return this.getStatus()
  }

  /** Escribe un chunk en orden. Los eventos desordenados se rechazan en lugar de corromper el vídeo. */
  async appendChunk(chunk: RecordingChunk): Promise<RecordingStatus> {
    if (!this.status.sessionId || chunk.sessionId !== this.status.sessionId) {
      throw new Error('El chunk pertenece a otra grabación.')
    }
    if (!canFinish(this.status.state) || !this.handle) {
      throw new Error('La grabación no está recibiendo datos.')
    }
    if (chunk.index !== this.expectedChunk) {
      throw new Error(`Chunk fuera de orden: se esperaba ${this.expectedChunk} y llegó ${chunk.index}.`)
    }

    await this.handle.write(chunk.data)
    this.expectedChunk += 1
    this.status = {
      ...this.status,
      bytesWritten: this.status.bytesWritten + chunk.data.byteLength
    }
    this.emit()
    return this.getStatus()
  }

  /** Cierra, finaliza el contenedor y publica la grabación terminada. */
  async finish(request: RecordingFinishRequest): Promise<RecordingStatus> {
    if (!this.status.sessionId || request.sessionId !== this.status.sessionId) {
      throw new Error('No hay una grabación activa con esa sesión.')
    }
    if (!canFinish(this.status.state) || !this.handle) {
      throw new Error('La grabación no se puede finalizar desde este estado.')
    }
    if (this.status.bytesWritten === 0) {
      await this.failActive(new Error('La grabación no produjo datos.'))
      throw new Error('La grabación no produjo datos.')
    }

    const tempPath = this.status.tempPath
    const finalPath = this.status.outputPath
    if (!tempPath || !finalPath) throw new Error('Faltan rutas de la grabación.')

    await this.handle.close()
    this.handle = null

    try {
      if (this.currentFormat === 'mp4') {
        this.transcodePath = `${finalPath}.ffmpeg.part`
        await this.ffmpeg.transcode({
          input: tempPath,
          output: this.transcodePath,
          format: 'mp4',
          quality: this.options.settings.get().recording.quality
        })
        await rename(this.transcodePath, finalPath)
        this.transcodePath = null
        await rm(tempPath, { force: true })
      } else {
        await rename(tempPath, finalPath)
      }

      const info = await stat(finalPath)
      await writeFile(
        metadataPathFor(finalPath),
        JSON.stringify({
          durationMs: request.durationMs,
          mimeType: this.currentFormat === 'mp4' ? 'video/mp4' : (this.status.mimeType ?? 'video/webm')
        }),
        'utf8'
      )
      const file: RecordingFile = {
        path: finalPath,
        name: finalPath.split(/[\\/]/).pop() ?? 'grabacion.webm',
        size: info.size,
        mimeType: this.currentFormat === 'mp4' ? 'video/mp4' : (this.status.mimeType ?? 'video/webm'),
        durationMs: request.durationMs,
        createdAt: this.now()
      }
      this.status = { ...EMPTY_STATUS, lastRecording: file }
      this.emit()
      return this.getStatus()
    } catch (error) {
      await this.failActive(error)
      throw error
    }
  }

  /** Cancela y borra el temporal. No deja el motor en estado `recording`. */
  async cancel(request: RecordingSessionRequest): Promise<RecordingStatus> {
    if (!this.status.sessionId || request.sessionId !== this.status.sessionId) {
      throw new Error('No hay una grabación activa con esa sesión.')
    }
    await this.cleanupActive()
    this.status = { ...EMPTY_STATUS }
    this.emit()
    return this.getStatus()
  }

  /** Llamado al salir: nunca deja un archivo a medias ni un handle abierto. */
  async dispose(): Promise<void> {
    if (!this.status.sessionId) return
    await this.cleanupActive()
    this.status = { ...EMPTY_STATUS }
    this.emit()
  }

  async list(): Promise<RecordingList> {
    let entries
    try {
      entries = await readdir(this.getOutputDir(), { withFileTypes: true })
    } catch {
      return []
    }

    const files: RecordingFile[] = []
    for (const entry of entries) {
      if (!entry.isFile() || !isFinalRecordingFile(entry.name)) continue
      const path = resolve(this.getOutputDir(), entry.name)
      try {
        const info = await stat(path)
        files.push({
          path,
          name: entry.name,
          size: info.size,
          mimeType: entry.name.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/webm',
          durationMs: await this.readDuration(path),
          createdAt: info.mtimeMs
        })
      } catch {
        // El archivo pudo borrarse mientras se enumeraba; se ignora.
      }
    }
    return files.sort((a, b) => b.createdAt - a.createdAt)
  }

  async reveal(path: string): Promise<void> {
    const target = this.safePath(path)
    if (!(await exists(target))) throw new Error('El archivo ya no existe.')
    this.revealFile(target)
  }

  async open(path: string): Promise<void> {
    const target = this.safePath(path)
    if (!(await exists(target))) throw new Error('El archivo ya no existe.')
    this.openFile(target)
  }

  async delete(path: string): Promise<RecordingList> {
    const target = this.safePath(path)
    await unlink(target)
    await rm(metadataPathFor(target), { force: true })
    return this.list()
  }

  private async reservePath(request: RecordingBeginRequest): Promise<string> {
    const dir = this.getOutputDir()
    await mkdir(dir, { recursive: true })
    const source: SourceRef = request.source
    const date = new Date(this.now())

    for (let ordinal = 1; ordinal <= 999; ordinal += 1) {
      const name = withUniqueSuffix(
        buildRecordingName({
          template: this.options.settings.get().recording.fileNameTemplate,
          sourceName: source.name,
          date,
          extension: request.extension
        }),
        ordinal
      )
      const candidate = resolve(dir, name)
      if (!(await exists(candidate)) && !(await exists(tempPathFor(candidate)))) {
        return candidate
      }
    }
    throw new Error('No se encontró un nombre de archivo libre.')
  }

  private async readDuration(path: string): Promise<number> {
    try {
      const raw: unknown = JSON.parse(await readFile(metadataPathFor(path), 'utf8'))
      if (typeof raw === 'object' && raw !== null && 'durationMs' in raw) {
        const value = (raw as { durationMs?: unknown }).durationMs
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
      }
    } catch {
      // Grabaciones anteriores pueden no tener metadatos; se muestra duración desconocida.
    }
    return 0
  }

  private safePath(path: string): string {
    const target = resolve(path)
    if (!isPathInside(this.getOutputDir(), target)) {
      throw new Error('La ruta está fuera de la carpeta de grabaciones.')
    }
    return target
  }

  private async cleanupActive(): Promise<void> {
    if (this.handle) {
      await this.handle.close().catch(() => undefined)
      this.handle = null
    }
    const paths = [this.status.tempPath, this.transcodePath].filter(
      (value): value is string => Boolean(value)
    )
    for (const path of paths) await rm(path, { force: true }).catch(() => undefined)
    this.expectedChunk = 0
    this.transcodePath = null
  }

  private async failActive(error: unknown): Promise<void> {
    const lastRecording = this.status.lastRecording
    await this.cleanupActive()
    this.status = { ...EMPTY_STATUS, state: 'error', error: messageOf(error), lastRecording }
    this.emit()
  }

  private emit(): void {
    const status = this.getStatus()
    for (const listener of this.listeners) listener(status)
  }
}
