import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { AudioSupport } from '@shared/audio'
import type { CaptureSnapshot } from '@shared/capture'
import { SettingsService } from '../electron/services/settings/settingsService'
import { RecordingService } from '../electron/services/recording/recordingService'

const REAL_FILE = 'D:\\Video\\OpenScreen-20261120-232338.webm'
const realAvailable = existsSync(REAL_FILE)
const describeReal = realAvailable ? describe : describe.skip

const audioSupport: AudioSupport = {
  platform: 'win32',
  microphonePermission: 'granted',
  systemAudio: 'available',
  systemMethod: 'electron-loopback',
  notes: []
}

/** Validación con el artefacto real de la Sesión 05; se omite si no está en esta máquina. */
describeReal('grabación WebM real', () => {
  let root: string

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true })
  })

  it('lee el contenedor y sus metadatos sin inventar resolución ni cadencia', async () => {
    root = await mkdtemp(join(tmpdir(), 'openscreen-real-'))
    const videosDir = dirname(REAL_FILE)
    const settings = new SettingsService(join(root, 'settings.json'))
    await settings.load()
    await settings.update({ recording: { outputDir: videosDir } })
    const service = new RecordingService({
      settings,
      capture: {
        getSnapshot: async () => ({ selectionAvailable: false, selection: null }) as CaptureSnapshot
      },
      getVideosPath: () => videosDir,
      getAudioSupport: () => audioSupport
    })

    const snapshot = await service.list()
    const found = snapshot.items.find((item) => item.name === basename(REAL_FILE))
    expect(found).toBeDefined()
    expect(found).toMatchObject({
      durationMs: 3190,
      metadataStatus: 'ok',
      format: 'webm',
      codec: 'vp9',
      actualWidth: 1280,
      actualHeight: 720,
      actualFps: 24
    })
    expect(found?.measuredFps).toBeCloseTo(23.7, 1)
    expect(found?.size).toBeGreaterThan(1000)

    const header = new Uint8Array(await readFile(REAL_FILE)).subarray(0, 4)
    expect(Array.from(header)).toEqual([0x1a, 0x45, 0xdf, 0xa3])

    const url = await service.getMediaUrl(REAL_FILE)
    expect(url).toContain('openscreen-media://recording/')
  })
})
