import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_AUDIO_SETTINGS, type AudioSupport } from '@shared/audio'
import type { CaptureSnapshot, SourceRef } from '@shared/capture'
import type {
  EncodingCapabilities,
  EncodingPlan,
  RecordingFormat
} from '@shared/encoding'
import type { RecordingBeginRequest, RecordingFile } from '@shared/recording'
import { SettingsService } from '../electron/services/settings/settingsService'
import { RecordingService, type FfmpegPort } from '../electron/services/recording/recordingService'
import {
  audioTrackPathFor,
  metadataPathFor,
  tempPathFor,
  type FfmpegArgsOptions
} from '../electron/services/recording/model'

const source: SourceRef = {
  id: 'screen:1',
  kind: 'screen',
  name: 'Monitor principal',
  displayId: '1',
  width: 1920,
  height: 1080
}

const options = {
  showCursor: true,
  quality: 'balanced',
  format: 'webm'
} as const

const audioSupport: AudioSupport = {
  platform: 'win32',
  microphonePermission: 'granted',
  systemAudio: 'available',
  systemMethod: 'electron-loopback',
  notes: []
}

function encodingPlan(format: RecordingFormat): EncodingPlan {
  return {
    format,
    codec: format === 'webm' ? 'vp9' : 'h264',
    resolution: 'original',
    fps: 30,
    quality: 'balanced',
    hardware: 'cpu',
    bitrate: 6_000_000,
    crf: null,
    keyframeInterval: null,
    preset: null,
    transcode: format !== 'webm',
    streamCopy: false,
    actualWidth: 1920,
    actualHeight: 1080,
    actualFps: 30,
    measuredFps: 29.8
  }
}

function beginRequest(format: RecordingFormat = 'webm'): RecordingBeginRequest {
  return {
    source,
    options: { ...options, format },
    audio: structuredClone(DEFAULT_AUDIO_SETTINGS),
    encoding: encodingPlan(format),
    mimeType: format === 'mp4' ? 'video/mp4' : 'video/webm;codecs=vp8',
    extension: format
  }
}

function capturePort(): { getSnapshot: () => Promise<CaptureSnapshot> } {
  return {
    getSnapshot: async () =>
      ({
        selection: source,
        selectionAvailable: true
      }) as CaptureSnapshot
  }
}

type TranscodeFn = (options: FfmpegArgsOptions) => Promise<void>

function fakeCapabilities(): EncodingCapabilities {
  const ok = { available: true, reason: null }
  return {
    ffmpeg: { ...ok, version: 'test-1.0' },
    formats: { webm: ok, mp4: ok, mkv: ok },
    codecs: { h264: ok, h265: ok, av1: ok, vp8: ok, vp9: ok, auto: ok },
    hardware: { auto: ok, cpu: ok, nvenc: ok, amf: ok, qsv: ok },
    encoderNames: [],
    hwaccels: []
  }
}

function fakeFfmpeg(transcode: TranscodeFn = vi.fn(async () => undefined)): FfmpegPort & { transcode: TranscodeFn } {
  return {
    isAvailable: async () => true,
    transcode,
    getEncodingCapabilities: async () => fakeCapabilities()
  }
}

describe('RecordingService (integración con archivos reales)', () => {
  let root: string
  let videos: string
  let settings: SettingsService
  let now: number

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'openscreen-recording-'))
    videos = join(root, 'videos')
    settings = new SettingsService(join(root, 'settings.json'))
    await settings.load()
    await settings.update({ recording: { outputDir: videos, fileNameTemplate: 'Prueba-{date}-{time}' } })
    await mkdir(videos, { recursive: true })
    now = new Date(2026, 10, 20, 12, 30, 45).getTime()
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function createService(ffmpeg: FfmpegPort = fakeFfmpeg()): RecordingService {
    return new RecordingService({
      settings,
      capture: capturePort(),
      getVideosPath: () => videos,
      getAudioSupport: () => audioSupport,
      now: () => now,
      ffmpeg
    })
  }

  async function finishOne(service: RecordingService, withAudio = false): Promise<RecordingFile> {
    const begun = await service.begin(beginRequest())
    const sessionId = begun.sessionId as string
    await service.appendChunk({ sessionId, index: 0, data: new Uint8Array([1, 2, 3]) })
    if (withAudio) {
      await service.appendAudio({ sessionId, track: 'microphone', index: 0, data: new Uint8Array([9]) })
    }
    const finished = await service.finish({
      sessionId,
      durationMs: 3000,
      mimeType: begun.mimeType as string
    })
    return finished.lastRecording as RecordingFile
  }

  it('escribe chunks en orden, finaliza el contenedor y guarda metadatos reales', async () => {
    const service = createService()
    const begun = await service.begin(beginRequest())

    expect(begun.state).toBe('recording')
    expect(begun.sessionId).toBeTruthy()
    expect(begun.outputPath).toContain(videos)
    expect(begun.tempPath).toBe(tempPathFor(begun.outputPath as string))
    expect(await readdir(videos)).toEqual([begun.tempPath?.split(/[\\/]/).pop()])

    await expect(
      service.appendChunk({
        sessionId: begun.sessionId as string,
        index: 1,
        data: new Uint8Array([5, 6])
      })
    ).rejects.toThrow(/Chunk fuera de orden/)

    await service.appendChunk({
      sessionId: begun.sessionId as string,
      index: 0,
      data: new Uint8Array([1, 2, 3])
    })
    await service.appendChunk({
      sessionId: begun.sessionId as string,
      index: 1,
      data: new Uint8Array([4, 5])
    })

    const finished = await service.finish({
      sessionId: begun.sessionId as string,
      durationMs: 4321,
      mimeType: 'video/webm;codecs=vp8'
    })

    expect(finished.state).toBe('idle')
    expect(finished.lastRecording?.name.endsWith('.webm')).toBe(true)
    expect(finished.lastRecording?.durationMs).toBe(4321)
    expect(new Uint8Array(await readFile(finished.lastRecording?.path as string))).toEqual(
      new Uint8Array([1, 2, 3, 4, 5])
    )
    expect(await readFile(metadataPathFor(finished.lastRecording?.path as string), 'utf8')).toContain(
      '4321'
    )
    expect(await readdir(videos)).toHaveLength(2)

    const list = await service.list()
    expect(list.items).toHaveLength(1)
    expect(list.items[0]?.durationMs).toBe(4321)
    expect(list.items[0]?.metadataStatus).toBe('ok')
    expect(list.items[0]?.actualWidth).toBe(1920)
    expect(list.items[0]?.actualFps).toBe(30)

    await service.delete(list.items[0]?.path as string)
    expect((await service.list()).items).toHaveLength(0)
    expect(await readdir(videos)).toHaveLength(0)
  })

  it('impide grabaciones duplicadas y rechaza chunks de otras sesiones', async () => {
    const service = createService()
    const first = await service.begin(beginRequest())

    await expect(service.begin(beginRequest())).rejects.toThrow(/Ya hay una grabación en curso/)
    await expect(
      service.appendChunk({
        sessionId: 'otra-sesion',
        index: 0,
        data: new Uint8Array([1])
      })
    ).rejects.toThrow(/otra grabación/)

    await service.cancel({ sessionId: first.sessionId as string })
    expect(service.getStatus().state).toBe('idle')
    expect(await readdir(videos)).toHaveLength(0)
  })

  it('descuenta el tiempo en pausa y limpia el temporal al cancelar', async () => {
    const service = createService()
    const begun = await service.begin(beginRequest())

    now += 1000
    await service.pause()
    now += 5000
    const paused = service.getStatus()
    expect(paused.state).toBe('paused')
    await service.resume()
    const resumed = service.getStatus()
    expect(resumed.state).toBe('recording')
    expect(resumed.pausedMs).toBe(5000)

    now += 1000
    expect(resumed.startedAt).toBe(begun.startedAt)
    await service.cancel({ sessionId: begun.sessionId as string })
    expect(service.getStatus().state).toBe('idle')
    expect(await readdir(videos)).toHaveLength(0)
  })

  it('usa FFmpeg de verdad para MP4 y elimina el temporal después de transcodificar', async () => {
    const transcode: TranscodeFn = vi.fn(async ({ output }) => {
      await writeFile(output, Buffer.from('MP4-FINAL'))
    })
    const service = createService(fakeFfmpeg(transcode))
    const begun = await service.begin(beginRequest('mp4'))
    await service.appendChunk({
      sessionId: begun.sessionId as string,
      index: 0,
      data: new Uint8Array([1])
    })
    const finished = await service.finish({
      sessionId: begun.sessionId as string,
      durationMs: 1500,
      mimeType: 'video/mp4'
    })

    expect(transcode).toHaveBeenCalledOnce()
    expect(finished.lastRecording?.mimeType).toBe('video/mp4')
    expect(await readFile(finished.lastRecording?.path as string, 'utf8')).toBe('MP4-FINAL')
    expect(await readdir(videos)).toHaveLength(2)
  })

  it('libera el handle y borra el temporal si se interrumpe la aplicación', async () => {
    const service = createService()
    await service.begin(beginRequest())
    expect(await readdir(videos)).toHaveLength(1)

    await service.dispose()

    expect(service.getStatus().state).toBe('idle')
    expect(await readdir(videos)).toHaveLength(0)
  })

  it('no permite borrar archivos fuera de la carpeta configurada', async () => {
    const service = createService()
    const outside = resolve(root, 'fuera.webm')
    await writeFile(outside, 'no tocar')

    await expect(service.delete(outside)).rejects.toThrow(/fuera de la carpeta/)
    expect(await readFile(outside, 'utf8')).toBe('no tocar')
  })

  it('rechaza MP4 cuando no hay FFmpeg disponible', async () => {
    const service = createService({ isAvailable: async () => false, transcode: async () => undefined })
    await expect(service.begin(beginRequest('mp4'))).rejects.toThrow(/requiere FFmpeg/i)
    expect(service.getStatus().state).toBe('idle')
  })

  it('guarda micrófono y sistema en pistas Opus/WebM independientes', async () => {
    const service = createService({ isAvailable: async () => false, transcode: async () => undefined })
    const begun = await service.begin(beginRequest())
    const sessionId = begun.sessionId as string

    await service.appendChunk({ sessionId, index: 0, data: new Uint8Array([1, 2, 3]) })
    await service.appendAudio({ sessionId, track: 'microphone', index: 0, data: new Uint8Array([10]) })
    await service.appendAudio({ sessionId, track: 'system', index: 0, data: new Uint8Array([20]) })
    await expect(
      service.appendAudio({ sessionId, track: 'microphone', index: 2, data: new Uint8Array([30]) })
    ).rejects.toThrow(/fuera de orden/)

    const finished = await service.finish({ sessionId, durationMs: 2000, mimeType: begun.mimeType as string })
    expect(finished.lastRecording?.tracks.map((track) => track.kind)).toEqual([
      'microphone',
      'system'
    ])
    expect(finished.audio.sidecars).toHaveLength(2)

    const files = await readdir(videos)
    expect(files.some((name) => /\.microphone\.webm$/.test(name))).toBe(true)
    expect(files.some((name) => /\.system\.webm$/.test(name))).toBe(true)
    expect(files.some((name) => /\.part$/.test(name))).toBe(false)

    const list = await service.list()
    expect(list.items).toHaveLength(1)
    const raw: unknown = JSON.parse(
      await readFile(metadataPathFor(finished.lastRecording?.path as string), 'utf8')
    )
    expect(raw).toMatchObject({ durationMs: 2000, tracks: [{ kind: 'microphone' }, { kind: 'system' }] })
  })

  it('expone metadatos verificados y marca como desconocidos los sidecar ausentes o corruptos', async () => {
    const service = createService()
    const file = await finishOne(service)
    const snapshot = await service.list()

    expect(snapshot.items[0]).toMatchObject({
      durationMs: 3000,
      metadataStatus: 'ok',
      format: 'webm',
      codec: 'vp9',
      actualWidth: 1920,
      actualHeight: 1080,
      actualFps: 30,
      measuredFps: 29.8
    })
    expect(snapshot.available).toBe(true)
    expect(snapshot.error).toBeNull()

    await rm(metadataPathFor(file.path))
    const missing = await service.list()
    expect(missing.items[0]).toMatchObject({
      durationMs: null,
      metadataStatus: 'missing',
      encoding: null
    })

    await writeFile(metadataPathFor(file.path), '{ roto', 'utf8')
    const invalid = await service.list()
    expect(invalid.items[0]?.metadataStatus).toBe('invalid')
  })

  it('renombra vídeo, pista y sidecar actualizando las rutas internas', async () => {
    const service = createService({ isAvailable: async () => false, transcode: async () => undefined })
    const file = await finishOne(service, true)
    const oldTrackPath = audioTrackPathFor(file.path, 'microphone')
    const renamed = await service.rename(file.path, 'Captura final.webm')

    expect(renamed.items).toHaveLength(1)
    const newPath = renamed.items[0]?.path as string
    expect(basename(newPath)).toBe('Captura final.webm')
    expect(renamed.items[0]?.tracks[0]?.path).toBe(audioTrackPathFor(newPath, 'microphone'))
    expect(await readFile(newPath)).toBeInstanceOf(Buffer)
    expect(await readFile(audioTrackPathFor(newPath, 'microphone'))).toBeInstanceOf(Buffer)

    const raw: unknown = JSON.parse(await readFile(metadataPathFor(newPath), 'utf8'))
    expect(raw).toMatchObject({
      version: 1,
      tracks: [{ kind: 'microphone', name: 'Captura final.microphone.webm' }]
    })
    expect((raw as { tracks: { path: string }[] }).tracks[0]?.path).toBe(
      audioTrackPathFor(newPath, 'microphone')
    )
    await expect(readFile(oldTrackPath)).rejects.toThrow()

    await expect(service.rename(newPath, 'Captura final.webm')).resolves.toBeDefined()
    const second = await finishOne(service)
    await expect(service.rename(second.path, 'Captura final.webm')).rejects.toThrow(/Ya existe/)
  })

  it('limpia solo temporales huérfanos y respeta el temporal de la sesión activa', async () => {
    const service = createService()
    const stale = join(videos, 'antigua.webm.part')
    const staleAudio = join(videos, 'antigua.microphone.webm.part')
    const personal = join(videos, 'notas.txt')
    await writeFile(stale, 'basura')
    await writeFile(staleAudio, 'basura')
    await writeFile(personal, 'no tocar')
    const begun = await service.begin(beginRequest())

    const after = await service.cleanupTempFiles()
    await expect(readFile(stale)).rejects.toThrow()
    await expect(readFile(staleAudio)).rejects.toThrow()
    expect(await readFile(personal, 'utf8')).toBe('no tocar')
    expect(await readFile(begun.tempPath as string)).toBeInstanceOf(Buffer)
    expect(after.tempFiles).toContain(basename(begun.tempPath as string))

    await service.cancel({ sessionId: begun.sessionId as string })
  })

  it('comprueba disponibilidad real de la carpeta configurada', async () => {
    const service = createService()
    const info = await service.getStorageInfo()
    expect(info).toMatchObject({
      outputDir: videos,
      exists: true,
      writable: true,
      available: true,
      reason: null
    })
    expect(info.freeBytes).not.toBeNull()

    await rm(videos, { recursive: true, force: true })
    const missing = await service.getStorageInfo()
    expect(missing.available).toBe(false)
    expect(missing.reason).toMatch(/no existe/)

    const snapshot = await service.list()
    expect(snapshot.available).toBe(false)
    expect(snapshot.items).toEqual([])
  })

  it('entrega URLs privadas solo para grabaciones terminadas dentro de la carpeta', async () => {
    const service = createService()
    const file = await finishOne(service)
    const url = await service.getMediaUrl(file.path)
    expect(url).toContain('openscreen-media://recording/')

    const outside = resolve(root, 'fuera.webm')
    await writeFile(outside, 'no tocar')
    await expect(service.getMediaUrl(outside)).rejects.toThrow(/fuera de la carpeta/)
    await expect(service.getMediaUrl(metadataPathFor(file.path))).rejects.toThrow(
      /grabación terminada/
    )
  })

  it('no borra archivos arbitrarios aunque el sidecar esté manipulado', async () => {
    const service = createService()
    const file = await finishOne(service)
    const victim = join(videos, 'victima.txt')
    await writeFile(victim, 'no tocar')
    await writeFile(
      metadataPathFor(file.path),
      JSON.stringify({
        version: 1,
        durationMs: 3000,
        mimeType: 'video/webm',
        tracks: [
          {
            kind: 'microphone',
            path: victim,
            name: 'victima.txt',
            mimeType: 'audio/webm;codecs=opus'
          }
        ]
      }),
      'utf8'
    )

    await service.delete(file.path)
    expect(await readFile(victim, 'utf8')).toBe('no tocar')
  })
})
