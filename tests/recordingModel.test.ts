import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  audioTempPathFor,
  audioTrackPathFor,
  buildFfmpegArgs,
  buildRecordingName,
  canFinish,
  canPause,
  canResume,
  canStart,
  isAudioTrackFileName,
  isFinalRecordingFile,
  isPathInside,
  metadataPathFor,
  normalizeExtension,
  resolveOutputDir,
  safeFilePart,
  tempPathFor,
  withUniqueSuffix
} from '../electron/services/recording/model'
import {
  chooseRecorderMimeType,
  elapsedMs,
  QUALITY_BITRATES
} from '@shared/recording'

describe('modelo de grabación', () => {
  it('sanea nombres de fuentes y plantillas sin permitir rutas relativas', () => {
    expect(safeFilePart('  Informe: 2026/11 <final>  ')).toBe('Informe- 2026-11 -final-')
    expect(safeFilePart('')).toBe('grabacion')

    const name = buildRecordingName({
      template: '../../{source}-{date}-{time}',
      sourceName: 'Ventana: prueba?',
      date: new Date(2026, 10, 20, 9, 5, 3),
      extension: 'webm'
    })
    expect(name).not.toMatch(/[\\/]/)
    expect(name).toContain('20261120-090503')
    expect(name.endsWith('.webm')).toBe(true)
  })

  it('respeta {ext} y añade sufijos sin romper la extensión', () => {
    const name = buildRecordingName({
      template: 'Captura{ext}',
      sourceName: 'Pantalla 1',
      date: new Date(2026, 0, 2, 3, 4, 5),
      extension: 'mp4'
    })
    expect(name).toBe('Captura.mp4')
    expect(withUniqueSuffix(name, 1)).toBe('Captura.mp4')
    expect(withUniqueSuffix(name, 2)).toBe('Captura-2.mp4')
    expect(normalizeExtension('MP4')).toBe('mp4')
    expect(normalizeExtension('mov')).toBe('webm')
  })

  it('elige MIME types soportados y calcula el tiempo activo sin pausas', () => {
    expect(chooseRecorderMimeType(['video/webm;codecs=vp8', 'video/webm'], 'webm')).toBe(
      'video/webm;codecs=vp8'
    )
    expect(chooseRecorderMimeType(['video/mp4'], 'webm')).toBeNull()
    expect(chooseRecorderMimeType(['video/mp4'], 'mp4')).toBe('video/mp4')

    expect(QUALITY_BITRATES.low).toBeLessThan(QUALITY_BITRATES.balanced)
    expect(QUALITY_BITRATES.balanced).toBeLessThan(QUALITY_BITRATES.high)

    expect(elapsedMs({ startedAt: 1000, pausedAt: null, pausedMs: 0 }, 3500)).toBe(2500)
    expect(elapsedMs({ startedAt: 1000, pausedAt: 2000, pausedMs: 100 }, 4000)).toBe(900)
    expect(elapsedMs({ startedAt: null, pausedAt: null, pausedMs: 0 })).toBe(0)
  })

  it('valida transiciones y construye argumentos de FFmpeg como array', () => {
    expect(canStart('idle')).toBe(true)
    expect(canStart('recording')).toBe(false)
    expect(canPause('recording')).toBe(true)
    expect(canPause('paused')).toBe(false)
    expect(canResume('paused')).toBe(true)
    expect(canFinish('recording')).toBe(true)
    expect(canFinish('idle')).toBe(false)

    expect(buildFfmpegArgs({ input: 'in.webm', output: 'out.mp4', quality: 'low', format: 'webm' })).toEqual([])
    const args = buildFfmpegArgs({
      input: 'in.webm',
      output: 'out.mp4',
      quality: 'high',
      format: 'mp4'
    })
    expect(args).toContain('-i')
    expect(args).toContain('in.webm')
    expect(args).toContain('libx264')
    expect(args).toContain('18')
    expect(args[args.length - 1]).toBe('out.mp4')
    expect(args.every((arg) => typeof arg === 'string')).toBe(true)
  })

  it('mantiene dos pistas de audio independientes sin cadenas de shell', () => {
    const args = buildFfmpegArgs({
      input: 'video.webm',
      output: 'final.webm',
      format: 'webm',
      quality: 'balanced',
      audioInputs: ['video.microphone.webm', 'video.system.webm']
    })
    const joined = args.join(' ')
    expect(joined).toContain('-i video.microphone.webm')
    expect(joined).toContain('-i video.system.webm')
    expect(joined).toContain('-map 1:a:0')
    expect(joined).toContain('-map 2:a:0')
    expect(joined).toContain('title=Micrófono')
    expect(joined).toContain('title=Audio del sistema')
    expect(args).toContain('copy')
    expect(args.every((arg) => typeof arg === 'string')).toBe(true)
  })

  it('resuelve y delimita rutas de salida', () => {
    const videos = resolve('C:/Videos')
    expect(resolveOutputDir(null, videos)).toBe(videos)
    expect(resolveOutputDir('  Capturas  ', videos)).toBe(resolve(videos, 'Capturas'))
    expect(isPathInside(videos, resolve(videos, 'a.webm'))).toBe(true)
    expect(isPathInside(videos, resolve(videos, '../secret.webm'))).toBe(false)
    expect(isFinalRecordingFile('a.webm')).toBe(true)
    expect(isFinalRecordingFile('a.webm.part')).toBe(false)
    expect(isFinalRecordingFile('a.microphone.webm')).toBe(false)
    expect(isAudioTrackFileName('a.system.webm')).toBe(true)
    expect(audioTrackPathFor('a.mp4', 'microphone')).toBe('a.microphone.webm')
    expect(audioTempPathFor('a.mp4', 'system')).toBe('a.system.webm.part')
    expect(tempPathFor('a.webm')).toBe('a.webm.part')
    expect(metadataPathFor('a.webm')).toBe('a.webm.openscreen.json')
  })
})
