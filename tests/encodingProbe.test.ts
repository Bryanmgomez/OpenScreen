import { describe, expect, it, vi } from 'vitest'
import {
  buildEncoderSmokeArgs,
  parseFfmpegEncoders,
  parseFfmpegFormats,
  parseFfmpegHwaccels,
  parseFfmpegVersion,
  probeFfmpegCapabilities
} from '../electron/services/recording/encodingProbe'

const encoderOutput = `
 V....D libx264              libx264 H.264 / AVC
 V....D libx265              libx265 H.265 / HEVC
 V....D libvpx-vp9           libvpx VP9
 V....D aac                  AAC (Advanced Audio Coding)
`
const formatOutput = `
 DE mp4             MOV/MPEG-4
 DE matroska        Matroska
 DE webm            WebM
`
const hwaccelOutput = `Hardware acceleration methods:
cuda
dxva2
qsv
`

describe('sondeo real de FFmpeg', () => {
  it('parsea solo datos reales de la salida de FFmpeg', () => {
    expect(parseFfmpegVersion('ffmpeg version 7.1.2-static By Travis\nCopyright')).toBe('7.1.2-static')
    expect(parseFfmpegVersion('no hay ffmpeg')).toBeNull()
    expect(parseFfmpegEncoders(encoderOutput)).toContain('libx264')
    expect(parseFfmpegEncoders(encoderOutput)).toContain('aac')
    expect(parseFfmpegFormats(formatOutput)).toEqual(['matroska', 'mp4', 'webm'])
    expect(parseFfmpegHwaccels(hwaccelOutput)).toContain('qsv')
    expect(buildEncoderSmokeArgs('h264_nvenc')).toContain('h264_nvenc')
  })

  it('marca como disponible solo un codificador que pasa la prueba real', async () => {
    const capture = vi.fn(async (args: readonly string[]): Promise<string> => {
      if (args.includes('-version')) return 'ffmpeg version 7.1 test'
      if (args.includes('-encoders')) return encoderOutput
      if (args.includes('-formats')) return formatOutput
      if (args.includes('-hwaccels')) return hwaccelOutput
      if (args.includes('libx264')) return ''
      throw new Error('encoder no utilizable')
    })
    const result = await probeFfmpegCapabilities(capture)
    expect(result.ffmpeg.available).toBe(true)
    expect(result.codecs.h264?.available).toBe(true)
    expect(result.codecs.h265?.available).toBe(false)
    expect(result.hardware.cpu?.available).toBe(true)
    expect(result.hardware.nvenc?.available).toBe(false)
    expect(result.formats.mp4?.available).toBe(false)
    expect(result.formats.webm?.available).toBe(false)
  })

  it('devuelve capacidades vacías si FFmpeg no existe', async () => {
    const result = await probeFfmpegCapabilities(async () => {
      throw new Error('ENOENT')
    })
    expect(result.ffmpeg.available).toBe(false)
    expect(result.encoderNames).toEqual([])
  })
})
