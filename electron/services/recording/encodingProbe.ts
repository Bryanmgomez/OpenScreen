import {
  availability,
  EMPTY_ENCODING_CAPABILITIES,
  ffmpegEncoderFor,
  VIDEO_CODECS,
  type EncoderAvailability,
  type EncodingCapabilities,
  type HardwareAcceleration,
  type VideoCodec
} from '../../../shared/encoding'

/** Parseo puro de la salida real de FFmpeg. No ejecuta procesos ni supone capacidades. */

export function parseFfmpegVersion(output: string): string | null {
  return output.split(/\r?\n/)[0]?.match(/ffmpeg version\s+(\S+)/i)?.[1] ?? null
}

export function parseFfmpegEncoders(output: string): string[] {
  const names = new Set<string>()
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*[A-Z.]{6}\s+(\S+)/)
    if (match?.[1]) names.add(match[1])
  }
  return [...names].sort()
}

export function parseFfmpegFormats(output: string): string[] {
  const names = new Set<string>()
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*[D ]{2}[E ]\s+(\S+)/)
    const list = match?.[1]
    if (!list) continue
    for (const name of list.split(',')) {
      if (name) names.add(name)
    }
  }
  return [...names].sort()
}

export function parseFfmpegHwaccels(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        /^[a-z0-9_]+$/i.test(line) &&
        !/^(hardware|acceleration|methods)$/i.test(line) &&
        !line.toLowerCase().includes('acceleration methods')
    )
}

/** Codifica un fotograma real contra `/null`: detecta un encoder listado pero inutilizable. */
export function buildEncoderSmokeArgs(encoder: string): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=c=black:s=64x64:r=1',
    '-frames:v',
    '1',
    '-c:v',
    encoder,
    '-f',
    'null',
    '-'
  ]
}

type Capture = (args: readonly string[], timeoutMs?: number) => Promise<string>

export async function probeFfmpegCapabilities(capture: Capture): Promise<EncodingCapabilities> {
  let version: string | null = null
  try {
    version = parseFfmpegVersion(await capture(['-version']))
  } catch {
    version = null
  }
  if (!version) return structuredClone(EMPTY_ENCODING_CAPABILITIES)

  const [encoderOutput, formatOutput, hwaccelOutput] = await Promise.allSettled([
    capture(['-hide_banner', '-encoders']),
    capture(['-hide_banner', '-formats']),
    capture(['-hide_banner', '-hwaccels'])
  ])
  const encoderNames =
    encoderOutput.status === 'fulfilled' ? parseFfmpegEncoders(encoderOutput.value) : []
  const formatNames = formatOutput.status === 'fulfilled' ? parseFfmpegFormats(formatOutput.value) : []
  const hwaccels = hwaccelOutput.status === 'fulfilled' ? parseFfmpegHwaccels(hwaccelOutput.value) : []

  const codecTargets: { codec: Exclude<VideoCodec, 'auto'>; hardware: HardwareAcceleration }[] = []
  for (const codec of VIDEO_CODECS) {
    if (codec === 'auto') continue
    for (const hardware of ['cpu', 'nvenc', 'amf', 'qsv'] as const) {
      const encoder = ffmpegEncoderFor(codec, hardware)
      if (encoder && !codecTargets.some((item) => item.codec === codec && item.hardware === hardware)) {
        codecTargets.push({ codec, hardware })
      }
    }
  }

  const tested = new Map<string, EncoderAvailability>()
  const encodersToTest = [...new Set([
    ...codecTargets.flatMap((item) => {
      const encoder = ffmpegEncoderFor(item.codec, item.hardware)
      return encoder ? [encoder] : []
    }),
    'aac'
  ])]
  for (const encoder of encodersToTest) {
    if (!encoderNames.includes(encoder)) {
      tested.set(encoder, availability(false, `FFmpeg no incluye el codificador ${encoder}.`))
      continue
    }
    try {
      await capture(buildEncoderSmokeArgs(encoder), 8000)
      tested.set(encoder, availability(true, null))
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'error desconocido'
      tested.set(encoder, availability(false, `Prueba real fallida: ${detail}`))
    }
  }

  const codecs: Record<string, EncoderAvailability> = {}
  const hardware: Record<string, EncoderAvailability> = {}
  for (const codec of VIDEO_CODECS) {
    if (codec === 'auto') {
      const working = codecTargets.filter(
        (target) => tested.get(ffmpegEncoderFor(target.codec, target.hardware) ?? '')?.available
      )
      codecs[codec] = availability(
        working.length > 0,
        working.length > 0 ? null : 'Ningún codificador de vídeo superó la prueba real.'
      )
      continue
    }
    const working = codecTargets.filter(
      (target) =>
        target.codec === codec && tested.get(ffmpegEncoderFor(codec, target.hardware) ?? '')?.available
    )
    codecs[codec] = availability(
      working.length > 0,
      working.length > 0 ? null : `FFmpeg no puede codificar ${codec} en este equipo.`
    )
  }

  for (const mode of ['cpu', 'nvenc', 'amf', 'qsv', 'auto'] as const) {
    const working = codecTargets.filter((target) => {
      if (mode !== 'auto' && target.hardware !== mode) return false
      return tested.get(ffmpegEncoderFor(target.codec, target.hardware) ?? '')?.available
    })
    hardware[mode] = availability(
      working.length > 0,
      working.length > 0
        ? null
        : mode === 'cpu'
          ? 'Ningún codificador por CPU superó la prueba real.'
          : `La aceleración ${mode} no superó la prueba real de codificación.`
    )
  }

  const aac = tested.get('aac') ?? availability(false, 'No se pudo probar el codificador AAC.')
  const formats: Record<string, EncoderAvailability> = {
    webm: codecs.vp8?.available || codecs.vp9?.available || codecs.av1?.available
      ? availability(true, null)
      : availability(false, 'No hay un códec WebM utilizable.'),
    mp4: formatNames.includes('mp4') && codecs.h264?.available && aac.available
      ? availability(true, null)
      : availability(false, 'MP4 necesita el formato mp4, un codificador H.264 y AAC.'),
    mkv: formatNames.includes('matroska')
      ? availability(true, null)
      : availability(false, 'FFmpeg no puede escribir el contenedor matroska.')
  }

  return {
    ffmpeg: { available: true, reason: null, version },
    formats,
    codecs,
    hardware,
    encoderNames,
    hwaccels
  }
}
