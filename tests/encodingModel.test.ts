import { describe, expect, it } from 'vitest'
import {
  assertEncodingPlan,
  effectiveFps,
  effectiveResolution,
  EMPTY_ENCODING_CAPABILITIES,
  ffmpegEncoderFor,
  resolveBitrate,
  type EncodingCapabilities,
  type EncodingPlan
} from '@shared/encoding'
import {
  buildEncodingPlan,
  captureLimits,
  fpsOptions,
  recorderBitrate,
  resolutionOptions
} from '../src/encoding/model'

const capabilities: EncodingCapabilities = {
  ffmpeg: { available: true, version: 'test', reason: null },
  formats: {
    webm: { available: true, reason: null },
    mp4: { available: true, reason: null },
    mkv: { available: true, reason: null }
  },
  codecs: {
    auto: { available: true, reason: null },
    h264: { available: true, reason: null },
    h265: { available: true, reason: null },
    av1: { available: true, reason: null },
    vp8: { available: true, reason: null },
    vp9: { available: true, reason: null }
  },
  hardware: {
    auto: { available: true, reason: null },
    cpu: { available: true, reason: null },
    nvenc: { available: true, reason: null },
    amf: { available: false, reason: 'sin prueba' },
    qsv: { available: false, reason: 'sin prueba' }
  },
  encoderNames: [],
  hwaccels: []
}

const renderer = {
  mimeTypes: [
    {
      mimeType: 'video/webm;codecs=vp9',
      actualMimeType: 'video/webm;codecs=vp9',
      format: 'webm' as const,
      codec: 'vp9' as const,
      verified: true,
      reason: null
    }
  ],
  maxWidth: 1920,
  maxHeight: 1080,
  maxFps: 60,
  probedAt: 1
}

const preferences = {
  outputDir: null,
  showCursor: true,
  quality: 'balanced' as const,
  format: 'webm' as const,
  resolution: 'original' as const,
  fps: 30 as const,
  codec: 'auto' as const,
  hardware: 'auto' as const,
  bitrate: null,
  crf: null,
  keyframeInterval: null,
  preset: null,
  profiles: [],
  activeProfileId: null,
  fileNameTemplate: 'OpenScreen-{date}-{time}',
  ffmpegPath: null
}

describe('capacidades y plan de codificación', () => {
  it('no afirma resoluciones ni FPS que la fuente no entrega', () => {
    expect(effectiveResolution('4k', 1920, 1080)).toBe('1080p')
    expect(effectiveResolution('1440p', 1280, 720)).toBe('720p')
    expect(effectiveFps(120, 60)).toBe(60)
    expect(effectiveFps(60, null)).toBe(60)
    const limits = captureLimits({
      displays: [],
      sources: [{
        id: 'screen:1', kind: 'screen', name: 'Monitor', displayId: '1',
        thumbnailUrl: null, iconUrl: null, width: 1920, height: 1080, primary: true,
        internal: false, refreshRate: 60, scaleFactor: 1
      }],
      selection: { id: 'screen:1', kind: 'screen', name: 'Monitor', displayId: '1', width: 1920, height: 1080 },
      selectionAvailable: true,
      region: null,
      permission: 'granted',
      platform: 'win32',
      warnings: [],
      generatedAt: 1
    })
    expect(limits).toEqual({ width: 1920, height: 1080, fps: 60 })
    expect(resolutionOptions(limits, EMPTY_ENCODING_CAPABILITIES).find((item) => item.value === '4k')?.reason).toMatch(/FFmpeg/)
    expect(resolutionOptions(limits, capabilities).find((item) => item.value === '4k')?.reason).toBeNull()
    expect(fpsOptions(limits, renderer).find((item) => item.value === '120')?.reason).toMatch(/evidencia/)
  })

  it('usa la ruta nativa verificada sin recodificar', () => {
    const result = buildEncodingPlan({
      preferences,
      limits: { width: 1920, height: 1080, fps: 60 },
      actual: { width: 1920, height: 1080, fps: 30, measuredFps: 29.4 },
      renderer,
      ffmpeg: EMPTY_ENCODING_CAPABILITIES
    })
    expect(result.plan.transcode).toBe(false)
    expect(result.plan.codec).toBe('vp9')
    expect(result.mimeType).toBe('video/webm;codecs=vp9')
    expect(recorderBitrate(result.plan)).toBe(resolveBitrate('balanced', null))
  })

  it('rechaza una combinación no detectada en lugar de ofrecerla', () => {
    expect(() =>
      buildEncodingPlan({
        preferences: { ...preferences, hardware: 'amf' },
        limits: { width: 1920, height: 1080, fps: 60 },
        actual: { width: 1920, height: 1080, fps: 30, measuredFps: null },
        renderer,
        ffmpeg: capabilities
      })
    ).toThrow(/AMF|aceleración/i)

    expect(() =>
      buildEncodingPlan({
        preferences: { ...preferences, format: 'mp4', codec: 'h265' },
        limits: { width: 1920, height: 1080, fps: 60 },
        actual: { width: 1920, height: 1080, fps: 30, measuredFps: null },
        renderer,
        ffmpeg: EMPTY_ENCODING_CAPABILITIES
      })
    ).toThrow(/FFmpeg/)
  })

  it('remarca los límites reales y mapea codificadores conocidos', () => {
    const plan: EncodingPlan = {
      format: 'webm',
      codec: 'vp9',
      resolution: 'original',
      fps: 30,
      quality: 'balanced',
      hardware: 'auto',
      bitrate: 6_000_000,
      crf: null,
      keyframeInterval: null,
      preset: null,
      transcode: true,
      streamCopy: false,
      actualWidth: 1920,
      actualHeight: 1080,
      actualFps: 30,
      measuredFps: 24
    }
    expect(assertEncodingPlan(plan, EMPTY_ENCODING_CAPABILITIES)).toMatch(/FFmpeg/)
    expect(assertEncodingPlan(plan, capabilities)).toBeNull()
    expect(ffmpegEncoderFor('h265', 'nvenc')).toBe('hevc_nvenc')
    expect(ffmpegEncoderFor('av1', 'qsv')).toBe('av1_qsv')
    expect(ffmpegEncoderFor('vp9', 'cpu')).toBe('libvpx-vp9')
  })
})
