import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CaptureSnapshot, SourceRef } from '@shared/capture'
import type {
  RecordingBeginRequest,
  RecordingFormat,
  RecordingQuality
} from '@shared/recording'
import { SettingsService } from '../electron/services/settings/settingsService'
import { RecordingService, type FfmpegPort } from '../electron/services/recording/recordingService'
import { metadataPathFor, tempPathFor } from '../electron/services/recording/model'

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

function beginRequest(format: RecordingFormat = 'webm'): RecordingBeginRequest {
  return {
    source,
    options: { ...options, format },
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

type TranscodeFn = (options: {
  input: string
  output: string
  format: RecordingFormat
  quality: RecordingQuality
}) => Promise<void>

function fakeFfmpeg(transcode: TranscodeFn = vi.fn(async () => undefined)): FfmpegPort & { transcode: TranscodeFn } {
  return { isAvailable: async () => true, transcode }
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
      now: () => now
      , ffmpeg
    })
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
    expect(list).toHaveLength(1)
    expect(list[0]?.durationMs).toBe(4321)

    await service.delete(list[0]?.path as string)
    expect(await service.list()).toHaveLength(0)
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
    await expect(service.begin(beginRequest('mp4'))).rejects.toThrow(/MP4 requiere FFmpeg/)
    expect(service.getStatus().state).toBe('idle')
  })
})
