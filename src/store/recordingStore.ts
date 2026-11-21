import { create } from 'zustand'
import type { Unsubscribe } from '@shared/api'
import type { SourceRef } from '@shared/capture'
import {
  chooseRecorderMimeType,
  elapsedMs,
  EMPTY_RECORDING_STATUS,
  QUALITY_BITRATES,
  type RecordingOptions,
  type RecordingStatus
} from '@shared/recording'
import { getApi } from '@/services/ipc'
import { toMessage } from '@/utils/errors'

export interface StartRecordingInput {
  source: SourceRef
  options: RecordingOptions
}

interface RecordingState {
  status: RecordingStatus
  error: string | null
  busy: boolean
  ffmpegAvailable: boolean | null
  cursorHonored: boolean | null
  init: () => Promise<void>
  start: (input: StartRecordingInput) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  cancel: () => Promise<void>
  checkFfmpeg: () => Promise<boolean>
}

const MIME_CANDIDATES = [
  'video/mp4;codecs=h264',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
] as const

let unsubscribeStatus: Unsubscribe | null = null
let recorder: MediaRecorder | null = null
let stream: MediaStream | null = null
let activeSessionId: string | null = null
let currentMimeType = ''
let chunkIndex = 0
let appendChain: Promise<void> = Promise.resolve()
let appendFailure: string | null = null
let discardCurrent = false

type CursorValue = 'always' | 'never'

function cursorSettings(track: MediaStreamTrack): { cursor?: string } {
  return track.getSettings() as MediaTrackSettings & { cursor?: string }
}

/**
 * Chromium expone el constraint no estándar `cursor`. Si la plataforma no lo aplica, lo
 * detectamos y lo comunicamos: nunca afirmamos que el cursor se ocultó si sigue visible.
 */
async function applyCursor(track: MediaStreamTrack, show: boolean): Promise<boolean> {
  const desired: CursorValue = show ? 'always' : 'never'
  if (cursorSettings(track).cursor === desired) return true

  try {
    await track.applyConstraints({
      advanced: [{ cursor: desired }]
    } as unknown as MediaTrackConstraints)
  } catch {
    // Plataforma sin soporte: se refleja en `cursorHonored`.
  }
  return cursorSettings(track).cursor === desired
}

function stopTracks(): void {
  stream?.getTracks().forEach((track) => track.stop())
}

function cleanup(): void {
  if (recorder) {
    recorder.ondataavailable = null
    recorder.onerror = null
    recorder.onpause = null
    recorder.onresume = null
    recorder.onstop = null
    if (recorder.state !== 'inactive') recorder.stop()
  }
  stopTracks()
  recorder = null
  stream = null
  activeSessionId = null
  currentMimeType = ''
  chunkIndex = 0
  appendChain = Promise.resolve()
  appendFailure = null
  discardCurrent = false
}

/** Dueño del `MediaRecorder` del renderer. El archivo y el estado los controla main. */
export const useRecordingStore = create<RecordingState>((set) => ({
  status: { ...EMPTY_RECORDING_STATUS },
  error: null,
  busy: false,
  ffmpegAvailable: null,
  cursorHonored: null,

  init: async () => {
    try {
      const api = getApi()
      unsubscribeStatus?.()
      unsubscribeStatus = api.recording.onStatusChange((status) => set({ status }))
      const [status, ffmpegAvailable] = await Promise.all([
        api.recording.getStatus(),
        api.recording.checkFfmpeg()
      ])
      set({ status, ffmpegAvailable, error: null })
    } catch (error) {
      set({ error: toMessage(error) })
    }
  },

  checkFfmpeg: async () => {
    try {
      const ffmpegAvailable = await getApi().recording.checkFfmpeg()
      set({ ffmpegAvailable })
      return ffmpegAvailable
    } catch (error) {
      set({ error: toMessage(error) })
      return false
    }
  },

  start: async ({ source, options }) => {
    if (recorder || activeSessionId) {
      set({ error: 'Ya hay una grabación en curso.' })
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      set({ error: 'Este entorno no permite capturar pantalla con MediaRecorder.' })
      return
    }

    set({ busy: true, error: null })
    let acquired: MediaStream | null = null

    try {
      // Debe ocurrir dentro del gesto del usuario: main concede la fuente ya seleccionada.
      acquired = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: options.showCursor ? 'always' : 'never'
        } as MediaTrackConstraints,
        audio: false,
        systemAudio: 'exclude',
        surfaceSwitching: 'exclude'
      } as DisplayMediaStreamOptions)
      stream = acquired

      const track = acquired.getVideoTracks()[0]
      if (!track) throw new Error('El stream de captura no contiene vídeo.')

      const cursorHonored = await applyCursor(track, options.showCursor)
      set({ cursorHonored })

      const supported = MIME_CANDIDATES.filter((type) => MediaRecorder.isTypeSupported(type))
      const mimeType = chooseRecorderMimeType(supported, options.format)
      if (!mimeType) {
        throw new Error(
          options.format === 'mp4'
            ? 'Chromium no ofrece codificación MP4; instala FFmpeg o usa WebM.'
            : 'Chromium no ofrece un contenedor WebM compatible con MediaRecorder.'
        )
      }

      const begun = await getApi().recording.begin({
        source,
        options,
        mimeType,
        extension: options.format
      })
      activeSessionId = begun.sessionId
      currentMimeType = mimeType
      chunkIndex = 0
      appendFailure = null
      discardCurrent = false
      appendChain = Promise.resolve()
      set({ status: begun })

      const nextRecorder = new MediaRecorder(acquired, {
        mimeType,
        videoBitsPerSecond: QUALITY_BITRATES[options.quality]
      })
      recorder = nextRecorder

      nextRecorder.ondataavailable = (event) => {
        const sessionId = activeSessionId
        if (!sessionId || event.data.size === 0 || appendFailure) return
        const index = chunkIndex
        chunkIndex += 1
        const bytes = event.data.arrayBuffer()
        appendChain = appendChain.then(async () => {
          try {
            const data = new Uint8Array(await bytes)
            await getApi().recording.appendChunk({ sessionId, index, data })
          } catch (error) {
            appendFailure = toMessage(error)
            set({ error: appendFailure })
            if (nextRecorder.state !== 'inactive') nextRecorder.stop()
          }
        })
      }

      nextRecorder.onerror = () => {
        set({ error: 'El motor de captura encontró un error y detuvo la grabación.' })
        discardCurrent = true
        if (nextRecorder.state !== 'inactive') nextRecorder.stop()
      }

      nextRecorder.onstop = async () => {
        const sessionId = activeSessionId
        const mime = currentMimeType
        await appendChain

        if (!sessionId || discardCurrent || appendFailure) {
          if (sessionId && (discardCurrent || appendFailure)) {
            try {
              await getApi().recording.cancel({ sessionId })
            } catch {
              // El estado de main ya puede haber cambiado; no ocultamos el error original.
            }
          }
          cleanup()
          set({ busy: false })
          return
        }

        try {
          const current = await getApi().recording.getStatus()
          await getApi().recording.finish({
            sessionId,
            durationMs: elapsedMs(current),
            mimeType: mime
          })
        } catch (error) {
          set({ error: toMessage(error) })
          try {
            await getApi().recording.getStatus().then((latest) => {
              if (latest.sessionId === sessionId) {
                return getApi().recording.cancel({ sessionId })
              }
              return undefined
            })
          } catch {
            // Ya se mostró el error principal.
          }
        } finally {
          cleanup()
          set({ busy: false })
        }
      }

      track.addEventListener('ended', () => {
        if (nextRecorder.state !== 'inactive') nextRecorder.stop()
      })

      nextRecorder.start(1000)
      set({ busy: false })
    } catch (error) {
      if (activeSessionId) {
        const sessionId = activeSessionId
        try {
          await getApi().recording.cancel({ sessionId })
        } catch {
          // Se limpia igualmente el estado local.
        }
      }
      stopTracks()
      cleanup()
      set({ busy: false, error: toMessage(error) })
    }
  },

  pause: async () => {
    if (!recorder || recorder.state !== 'recording') return
    set({ busy: true })
    try {
      recorder.pause()
      set({ status: await getApi().recording.pause() })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ busy: false })
    }
  },

  resume: async () => {
    if (!recorder || recorder.state !== 'paused') return
    set({ busy: true })
    try {
      recorder.resume()
      set({ status: await getApi().recording.resume() })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      set({ busy: false })
    }
  },

  stop: async () => {
    if (!recorder || recorder.state === 'inactive') return
    set({ busy: true })
    try {
      recorder.stop()
    } catch (error) {
      set({ error: toMessage(error), busy: false })
    }
  },

  cancel: async () => {
    const sessionId = activeSessionId
    if (!sessionId) return
    discardCurrent = true
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    try {
      set({ status: await getApi().recording.cancel({ sessionId }) })
    } catch (error) {
      set({ error: toMessage(error) })
    } finally {
      cleanup()
    }
  }
}))
