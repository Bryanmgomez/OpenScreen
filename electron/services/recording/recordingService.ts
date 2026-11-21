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
import {
  assertEncodingPlan,
  EMPTY_ENCODING_CAPABILITIES,
  RESOLUTION_SIZES,
  type EncodingCapabilities,
  type EncodingPlan
} from '../../../shared/encoding'
import type {
  AudioSupport,
  AudioTrackFile,
  AudioTrackKind
} from '../../../shared/audio'
import type { CaptureSnapshot, SourceRef } from '../../../shared/capture'
import type {
  RecordingAudioChunk,
  RecordingAudioState,
  RecordingBeginRequest,
  RecordingChunk,
  RecordingFile,
  RecordingFinishRequest,
  RecordingFormat,
  RecordingList,
  RecordingSessionRequest,
  RecordingStatus
} from '../../../shared/recording'
import {
  EMPTY_RECORDING_AUDIO_STATUS,
  type RecordingAudioStatus
} from '../../../shared/recording'
import type { SettingsService } from '../settings/settingsService'
import {
  audioTempPathFor,
  audioTrackPathFor,
  buildRecordingName,
  canFinish,
  canPause,
  canResume,
  canStart,
  type FfmpegArgsOptions,
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
  transcode(options: FfmpegArgsOptions): Promise<void>
  getEncodingCapabilities?(): Promise<EncodingCapabilities>
}

export interface CapturePort {
  getSnapshot(): Promise<CaptureSnapshot>
}

export interface RecordingServiceOptions {
  settings: SettingsService
  capture: CapturePort
  getVideosPath: () => string
  getAudioSupport: () => AudioSupport
  now?: () => number
  ffmpeg?: FfmpegPort
  reveal?: (path: string) => void
  open?: (path: string) => void
}

const AUDIO_TRACKS: readonly AudioTrackKind[] = ['microphone', 'system']

function emptyAudioStatus(): RecordingAudioStatus {
  return {
    support: { ...EMPTY_RECORDING_AUDIO_STATUS.support, notes: [...EMPTY_RECORDING_AUDIO_STATUS.support.notes] },
    microphone: { ...EMPTY_RECORDING_AUDIO_STATUS.microphone },
    system: { ...EMPTY_RECORDING_AUDIO_STATUS.system },
    separateTracks: EMPTY_RECORDING_AUDIO_STATUS.separateTracks,
    sidecars: []
  }
}

function emptyStatus(): RecordingStatus {
  return {
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
    audio: emptyAudioStatus()
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido al grabar.'
}

function mimeTypeForFile(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.mkv')) return 'video/x-matroska'
  return 'video/webm'
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
 * Dueño del estado de grabación y de los archivos. El renderer informa de los eventos del
 * MediaRecorder y del estado de cada pista de audio; aquí se decide si una acción es válida,
 * se escriben los chunks y se publica el estado. Esto evita grabaciones duplicadas y estados
 * inconsistentes.
 */
export class RecordingService {
  private readonly now: () => number
  private readonly ffmpeg: FfmpegPort
  private readonly revealFile: (path: string) => void
  private readonly openFile: (path: string) => void
  private readonly listeners = new Set<(status: RecordingStatus) => void>()
  private status: RecordingStatus = emptyStatus()
  private handle: FileHandle | null = null
  private expectedChunk = 0
  private currentFormat: RecordingFormat = 'webm'
  private currentPlan: EncodingPlan | null = null
  private transcodePath: string | null = null
  private readonly audioHandles: Partial<Record<AudioTrackKind, FileHandle>> = {}
  private readonly expectedAudioChunk: Partial<Record<AudioTrackKind, number>> = {}
  private readonly audioTemps: Partial<Record<AudioTrackKind, string>> = {}

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
    return { ...this.status, audio: { ...this.status.audio, sidecars: [...this.status.audio.sidecars] } }
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

  /** Codificadores y formatos detectados de verdad; nunca una lista estimada. */
  async getEncodingCapabilities(): Promise<EncodingCapabilities> {
    return (await this.ffmpeg.getEncodingCapabilities?.()) ?? EMPTY_ENCODING_CAPABILITIES
  }

  /** Reserva la sesión y crea el archivo temporal. Falla si ya hay una grabación activa. */
  async begin(request: RecordingBeginRequest): Promise<RecordingStatus> {
    if (!canStart(this.status.state)) {
      throw new Error('Ya hay una grabación en curso. Termínala antes de empezar otra.')
    }
    if (
      normalizeExtension(request.extension) !== request.options.format ||
      request.encoding.format !== request.options.format
    ) {
      throw new Error('La extensión, el formato y el plan de codificación no coinciden.')
    }
    const ffmpegNeeded = request.encoding.transcode
    if (ffmpegNeeded) {
      const capabilities = await this.getEncodingCapabilities()
      const problem = assertEncodingPlan(request.encoding, capabilities)
      if (problem) throw new Error(problem)
      if (!(await this.ffmpeg.isAvailable())) {
        throw new Error('La combinación elegida requiere FFmpeg. Instálalo o elige WebM nativo.')
      }
    }

    const support = this.options.getAudioSupport()
    if (
      request.audio.system.enabled &&
      request.audio.system.mode === 'auto' &&
      support.systemAudio === 'unavailable'
    ) {
      throw new Error(
        'La captura automática del audio del sistema no está disponible en esta plataforma. Elige un dispositivo virtual en modo «Dispositivo» o desactiva esa pista.'
      )
    }
    if (request.audio.system.enabled && request.audio.system.mode === 'device' && !request.audio.system.deviceId) {
      throw new Error('Selecciona el dispositivo virtual que transporta el audio del sistema.')
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

    // Los archivos de pistas se crean solo cuando llega el primer chunk: una grabación sin
    // audio no deja temporales vacíos.
    this.expectedChunk = 0
    this.currentFormat = request.options.format
    this.currentPlan = request.encoding
    this.transcodePath = null
    const audio = emptyAudioStatus()
    audio.support = support
    audio.separateTracks = request.audio.separateTracks
    audio.microphone = {
      kind: 'microphone',
      enabled: request.audio.microphone.enabled,
      active: false,
      deviceId: request.audio.microphone.deviceId,
      label: null,
      error: null
    }
    audio.system = {
      kind: 'system',
      enabled: request.audio.system.enabled,
      active: false,
      deviceId: request.audio.system.deviceId,
      label: null,
      error: null
    }

    this.status = {
      ...emptyStatus(),
      state: 'recording',
      sessionId: randomUUID(),
      source: request.source,
      startedAt: this.now(),
      outputPath: finalPath,
      tempPath,
      mimeType: request.mimeType,
      encoding: request.encoding,
      audio
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

  /** Escribe un chunk de vídeo en orden. Los eventos desordenados se rechazan. */
  async appendChunk(chunk: RecordingChunk): Promise<RecordingStatus> {
    this.assertSession(chunk.sessionId)
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

  /** Escribe un chunk de una pista de audio independiente, también en orden. */
  async appendAudio(chunk: RecordingAudioChunk): Promise<RecordingStatus> {
    this.assertSession(chunk.sessionId)
    if (!canFinish(this.status.state) || !this.status.audio.separateTracks || !this.status.audio[chunk.track].enabled) {
      throw new Error(`La pista ${chunk.track} no está recibiendo datos.`)
    }
    const expected = this.expectedAudioChunk[chunk.track] ?? 0
    if (chunk.index !== expected) {
      throw new Error(`Chunk de ${chunk.track} fuera de orden: se esperaba ${expected} y llegó ${chunk.index}.`)
    }

    let handle = this.audioHandles[chunk.track]
    if (!handle) {
      const finalPath = this.status.outputPath
      if (!finalPath) throw new Error('Falta la ruta de la grabación.')
      const path = audioTempPathFor(finalPath, chunk.track)
      handle = await open(path, 'w')
      this.audioHandles[chunk.track] = handle
      this.audioTemps[chunk.track] = path
    }

    await handle.write(chunk.data)
    this.expectedAudioChunk[chunk.track] = expected + 1
    return this.getStatus()
  }

  /** El renderer informa de desconexiones y errores sin tumbar toda la grabación. */
  async reportAudioState(state: RecordingAudioState): Promise<RecordingStatus> {
    this.assertSession(state.sessionId)
    const current = state.track === 'microphone' ? this.status.audio.microphone : this.status.audio.system
    const updated = {
      ...current,
      active: state.active,
      label: state.label,
      error: state.error
    }
    this.status = {
      ...this.status,
      audio: {
        ...this.status.audio,
        [state.track]: updated
      }
    }
    this.emit()
    return this.getStatus()
  }

  /** Cierra, finaliza el contenedor y publica la grabación terminada. */
  async finish(request: RecordingFinishRequest): Promise<RecordingStatus> {
    this.assertSession(request.sessionId)
    if (!canFinish(this.status.state) || !this.handle) {
      throw new Error('La grabación no se puede finalizar desde este estado.')
    }
    if (this.status.bytesWritten === 0) {
      const error = new Error('La grabación no produjo datos.')
      await this.failActive(error)
      throw error
    }

    const tempPath = this.status.tempPath
    const finalPath = this.status.outputPath
    if (!tempPath || !finalPath) throw new Error('Faltan rutas de la grabación.')

    await this.handle.close()
    this.handle = null

    try {
      const tracks = await this.finishAudioTracks(finalPath)
      const plan = this.currentPlan
      const ffmpegNeeded = plan?.transcode ?? tracks.length > 0
      if (ffmpegNeeded) {
        if (!(await this.ffmpeg.isAvailable())) {
          // En WebM las pistas ya están guardadas como archivos Opus independientes.
          if (this.currentFormat === 'webm' && !plan?.transcode) {
            await rename(tempPath, finalPath)
            return this.publishFinished(finalPath, request.durationMs, tracks)
          }
          throw new Error('La codificación elegida requiere FFmpeg. Instálalo o elige WebM nativo.')
        }
        const targetSize = plan ? RESOLUTION_SIZES[plan.resolution] : null
        const needsScale = Boolean(
          !plan?.streamCopy &&
            plan &&
            targetSize &&
            (plan.actualWidth !== targetSize.width || plan.actualHeight !== targetSize.height)
        )
        const needsFpsChange = Boolean(
          !plan?.streamCopy &&
            plan &&
            plan.actualFps !== null &&
            Math.abs(plan.actualFps - plan.fps) > 1
        )
        this.transcodePath = `${finalPath}.ffmpeg.part`
        await this.ffmpeg.transcode({
          input: tempPath,
          output: this.transcodePath,
          format: this.currentFormat,
          quality: plan?.quality ?? 'balanced',
          ...(plan?.streamCopy
            ? {}
            : {
                codec: plan?.codec,
                hardware: plan?.hardware,
                bitrate: plan?.bitrate,
                crf: plan?.crf,
                keyframeInterval: plan?.keyframeInterval,
                preset: plan?.preset
              }),
          width: needsScale && targetSize ? targetSize.width : null,
          height: needsScale && targetSize ? targetSize.height : null,
          fps: needsFpsChange ? plan?.fps : null,
          audioInputs: tracks.map((track) => track.path)
        })
        await rename(this.transcodePath, finalPath)
        this.transcodePath = null
        await rm(tempPath, { force: true })
      } else {
        await rename(tempPath, finalPath)
      }

      return await this.publishFinished(finalPath, request.durationMs, tracks)
    } catch (error) {
      await this.failActive(error)
      throw error
    }
  }

  /** Cancela y borra los temporales. No deja el motor en estado `recording`. */
  async cancel(request: RecordingSessionRequest): Promise<RecordingStatus> {
    if (!this.status.sessionId || request.sessionId !== this.status.sessionId) {
      throw new Error('No hay una grabación activa con esa sesión.')
    }
    await this.cleanupActive()
    this.status = emptyStatus()
    this.emit()
    return this.getStatus()
  }

  /** Llamado al salir: nunca deja un archivo a medias ni un handle abierto. */
  async dispose(): Promise<void> {
    if (!this.status.sessionId) return
    await this.cleanupActive()
    this.status = emptyStatus()
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
          mimeType: mimeTypeForFile(entry.name),
          durationMs: await this.readDuration(path),
          createdAt: info.mtimeMs,
          tracks: await this.readTracks(path)
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
    const metadata = await this.readTracks(target)
    await unlink(target)
    for (const track of metadata) {
      await rm(track.path, { force: true }).catch(() => undefined)
    }
    await rm(metadataPathFor(target), { force: true })
    return this.list()
  }

  private assertSession(sessionId: string): void {
    if (!this.status.sessionId) throw new Error('No hay una grabación activa con esa sesión.')
    if (sessionId !== this.status.sessionId) {
      throw new Error('La sesión pertenece a otra grabación.')
    }
  }

  private async publishFinished(
    finalPath: string,
    durationMs: number,
    tracks: AudioTrackFile[]
  ): Promise<RecordingStatus> {
    const info = await stat(finalPath)
    const mimeType = this.currentFormat === 'webm'
      ? (this.status.mimeType ?? 'video/webm')
      : mimeTypeForFile(finalPath)
    await writeFile(
      metadataPathFor(finalPath),
      JSON.stringify({ durationMs, mimeType, tracks, encoding: this.currentPlan }),
      'utf8'
    )
    const file: RecordingFile = {
      path: finalPath,
      name: finalPath.split(/[\\/]/).pop() ?? 'grabacion.webm',
      size: info.size,
      mimeType,
      durationMs,
      createdAt: this.now(),
      tracks
    }
    this.status = {
      ...emptyStatus(),
      lastRecording: file,
      audio: {
        ...this.status.audio,
        microphone: { ...this.status.audio.microphone, active: false },
        system: { ...this.status.audio.system, active: false },
        sidecars: [...tracks]
      }
    }
    this.emit()
    return this.getStatus()
  }

  private async finishAudioTracks(finalPath: string): Promise<AudioTrackFile[]> {
    const tracks: AudioTrackFile[] = []
    await this.closeAudioHandles()

    for (const kind of AUDIO_TRACKS) {
      const temp = this.audioTemps[kind]
      if (!temp) continue
      if (!(await exists(temp))) continue
      const info = await stat(temp)
      if (info.size === 0) {
        await rm(temp, { force: true })
        continue
      }
      const path = audioTrackPathFor(finalPath, kind)
      await rename(temp, path)
      tracks.push({
        kind,
        path,
        name: path.split(/[\\/]/).pop() ?? `${kind}.webm`,
        mimeType: 'audio/webm;codecs=opus'
      })
    }
    return tracks
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
      const candidates = [
        candidate,
        tempPathFor(candidate),
        ...(request.audio.separateTracks
          ? AUDIO_TRACKS.flatMap((kind) => [
              audioTrackPathFor(candidate, kind),
              audioTempPathFor(candidate, kind)
            ])
          : [])
      ]
      const conflicts = await Promise.all(candidates.map((path) => exists(path)))
      if (!conflicts.some(Boolean)) return candidate
    }
    throw new Error('No se encontró un nombre de archivo libre.')
  }

  private async readDuration(path: string): Promise<number> {
    const metadata = await this.readMetadata(path)
    const value = metadata?.durationMs
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
  }

  private async readTracks(path: string): Promise<AudioTrackFile[]> {
    const metadata = await this.readMetadata(path)
    if (!Array.isArray(metadata?.tracks)) return []
    const dir = this.getOutputDir()
    return metadata.tracks.filter((track: unknown): track is AudioTrackFile => {
      if (typeof track !== 'object' || track === null) return false
      const value = track as Partial<AudioTrackFile>
      return (
        (value.kind === 'microphone' || value.kind === 'system') &&
        typeof value.path === 'string' &&
        typeof value.name === 'string' &&
        typeof value.mimeType === 'string' &&
        isPathInside(dir, value.path)
      )
    })
  }

  private async readMetadata(path: string): Promise<Record<string, unknown> | null> {
    try {
      const raw: unknown = JSON.parse(await readFile(metadataPathFor(path), 'utf8'))
      return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null
    } catch {
      return null
    }
  }

  private safePath(path: string): string {
    const target = resolve(path)
    if (!isPathInside(this.getOutputDir(), target)) {
      throw new Error('La ruta está fuera de la carpeta de grabaciones.')
    }
    return target
  }

  private async closeAudioHandles(): Promise<void> {
    for (const kind of AUDIO_TRACKS) {
      const handle = this.audioHandles[kind]
      if (!handle) continue
      await handle.close().catch(() => undefined)
      delete this.audioHandles[kind]
    }
  }

  private async cleanupActive(): Promise<void> {
    if (this.handle) {
      await this.handle.close().catch(() => undefined)
      this.handle = null
    }
    await this.closeAudioHandles()
    const paths = [
      this.status.tempPath,
      this.transcodePath,
      ...AUDIO_TRACKS.map((kind) => this.audioTemps[kind])
    ].filter((value): value is string => Boolean(value))
    for (const path of paths) await rm(path, { force: true }).catch(() => undefined)
    this.expectedChunk = 0
    for (const kind of AUDIO_TRACKS) delete this.expectedAudioChunk[kind]
    for (const kind of AUDIO_TRACKS) delete this.audioTemps[kind]
    this.transcodePath = null
  }

  private async failActive(error: unknown): Promise<void> {
    const lastRecording = this.status.lastRecording
    const audio = this.status.audio
    await this.cleanupActive()
    this.status = { ...emptyStatus(), state: 'error', error: messageOf(error), lastRecording, audio }
    this.emit()
  }

  private emit(): void {
    const status = this.getStatus()
    for (const listener of this.listeners) listener(status)
  }
}
