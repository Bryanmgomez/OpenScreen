import { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { IconButton } from '@/components/ui/IconButton'
import type { RecordingItem } from '@/types/recording'
import { formatDuration } from '@/utils/format'

interface VideoPlayerModalProps {
  recording: RecordingItem | null
  src: string | null
  onClose: () => void
}

/** Reproductor integrado: todos los controles operan el `<video>` real, no un estado simulado. */
export function VideoPlayerModal({ recording, src, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const open = recording !== null

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!open || !src) {
      video.pause()
      video.removeAttribute('src')
      video.load()
      setPlaying(false)
      setCurrent(0)
      return
    }

    setError(null)
    setCurrent(0)
    setDuration(recording.durationMs ? recording.durationMs / 1000 : 0)
    video.src = src
    video.load()

    const onLoaded = (): void => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0)
    }
    const onTime = (): void => setCurrent(video.currentTime)
    const onPlay = (): void => setPlaying(true)
    const onPause = (): void => setPlaying(false)
    const onEnded = (): void => setPlaying(false)
    const onError = (): void => setError('El navegador no pudo decodificar este archivo.')

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [open, src, recording?.durationMs])

  const togglePlay = async (): Promise<void> => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      try {
        await video.play()
        setError(null)
      } catch {
        setError('El navegador bloqueó la reproducción. Pulsa de nuevo para intentarlo.')
      }
    } else {
      video.pause()
    }
  }

  const seek = (delta: number): void => {
    const video = videoRef.current
    if (!video) return
    const limit = Number.isFinite(video.duration) ? video.duration : duration
    video.currentTime = Math.max(0, Math.min(limit, video.currentTime + delta))
  }

  const changeVolume = (value: number): void => {
    const video = videoRef.current
    setVolume(value)
    if (video) {
      video.volume = value
      if (value > 0 && muted) {
        setMuted(false)
        video.muted = false
      }
    }
  }

  const toggleMute = (): void => {
    const video = videoRef.current
    const next = !muted
    setMuted(next)
    if (video) video.muted = next
  }

  return (
    <Modal open={open} title={recording?.name ?? 'Reproductor'} onClose={onClose} className="modal--player">
      <div className="player">
        <video ref={videoRef} className="player__video" preload="metadata" playsInline crossOrigin="anonymous" />
        {error && <p className="notice notice--error player__error">{error}</p>}
        <div className="player__timeline">
          <span className="player__time">{formatDuration(current * 1000)}</span>
          <input
            className="player__scrubber"
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.1}
            value={Math.min(current, duration || 0.1)}
            onChange={(event) => {
              const video = videoRef.current
              if (!video) return
              video.currentTime = Number(event.target.value)
              setCurrent(video.currentTime)
            }}
            aria-label="Barra de reproducción"
          />
          <span className="player__time">{formatDuration(duration * 1000)}</span>
        </div>
        <div className="player__controls">
          <IconButton label="Retroceder 10 segundos" onClick={() => seek(-10)}>
            <SkipBack size={17} />
          </IconButton>
          <IconButton label={playing ? 'Pausar' : 'Reproducir'} onClick={() => void togglePlay()}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </IconButton>
          <IconButton label="Avanzar 10 segundos" onClick={() => seek(10)}>
            <SkipForward size={17} />
          </IconButton>
          <IconButton label={muted ? 'Activar sonido' : 'Silenciar'} onClick={toggleMute}>
            {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </IconButton>
          <input
            className="player__volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            aria-label="Volumen"
          />
        </div>
      </div>
    </Modal>
  )
}
