import { useState } from 'react'
import {
  BUILTIN_PROFILES,
  EMPTY_ENCODING_CAPABILITIES,
  EMPTY_RENDERER_CAPABILITIES,
  FFMPEG_PRESETS,
  type FfmpegPreset,
  type RecordingFps,
  type RecordingFormat,
  type RecordingQuality,
  type RecordingResolution,
  type RecordingProfile,
  type VideoCodec
} from '@shared/encoding'
import type { Settings } from '@shared/settings'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { SettingRow } from '@/components/ui/SettingRow'
import {
  codecOptions,
  captureLimits,
  formatOptions,
  fpsOptions,
  hardwareOptions,
  qualityOptions,
  resolutionOptions
} from '@/encoding/model'
import { useCaptureStore } from '@/store/captureStore'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'

interface EncodingSettingsProps {
  disabled?: boolean
  /** Controles que ya se muestran en otro lugar (p. ej. en el panel rápido de grabación). */
  omit?: readonly ('fps' | 'quality')[]
}

interface QuickSelectProps {
  disabled?: boolean
  hideLabel?: boolean
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Selector de FPS: solo ofrece lo que el equipo y la fuente pueden sostener. */
export function FpsSelect({ disabled = false, hideLabel = false }: QuickSelectProps) {
  const { settings, update } = useSettingsStore()
  const snapshot = useCaptureStore((state) => state.snapshot)
  const rendererCapabilities = useRecordingStore((state) => state.rendererCapabilities)
  if (!settings) return null
  const frameRates = fpsOptions(
    captureLimits(snapshot),
    rendererCapabilities ?? EMPTY_RENDERER_CAPABILITIES
  )

  return (
    <Select
      label="FPS"
      hideLabel={hideLabel}
      value={String(settings.recording.fps)}
      options={frameRates.map((item) => ({
        value: item.value,
        label: item.reason ? `${item.label} (sin evidencia)` : item.label
      }))}
      disabledOptions={frameRates.filter((item) => item.reason).map((item) => item.value)}
      disabled={disabled}
      onChange={(value) =>
        void update({ recording: { fps: Number(value) as RecordingFps, activeProfileId: null } })
      }
    />
  )
}

/** Selector de calidad (baja, media, alta o personalizada). */
export function QualitySelect({ disabled = false, hideLabel = false }: QuickSelectProps) {
  const { settings, update } = useSettingsStore()
  if (!settings) return null

  return (
    <Select
      label="Calidad"
      hideLabel={hideLabel}
      value={settings.recording.quality}
      options={qualityOptions()}
      disabled={disabled}
      onChange={(value) =>
        void update({ recording: { quality: value as RecordingQuality, activeProfileId: null } })
      }
    />
  )
}

/** Controles de codificación. Todas las opciones dependen de pruebas reales de capacidad. */
export function EncodingSettings({ disabled = false, omit = [] }: EncodingSettingsProps) {
  const { settings, update } = useSettingsStore()
  const snapshot = useCaptureStore((state) => state.snapshot)
  const ffmpegAvailable = useRecordingStore((state) => state.ffmpegAvailable)
  const encodingCapabilities = useRecordingStore((state) => state.encodingCapabilities)
  const rendererCapabilities = useRecordingStore((state) => state.rendererCapabilities)
  const [newProfileName, setNewProfileName] = useState('')

  if (!settings) return null
  const recording = settings.recording
  const limits = captureLimits(snapshot)
  const ffmpeg = encodingCapabilities ?? EMPTY_ENCODING_CAPABILITIES
  const renderer = rendererCapabilities ?? EMPTY_RENDERER_CAPABILITIES
  const formats = formatOptions(renderer, ffmpeg)
  const codecs = codecOptions(recording.format, renderer, ffmpeg)
  const hardware = hardwareOptions(ffmpeg)
  const resolutions = resolutionOptions(limits, ffmpeg)
  const frameRates = fpsOptions(limits, renderer)
  const profiles: readonly RecordingProfile[] = [...BUILTIN_PROFILES, ...recording.profiles]
  const unavailable = [
    ...formats.filter((item) => item.reason).map((item) => `${item.label}: ${item.reason}`),
    ...codecs.filter((item) => item.reason).map((item) => `${item.label}: ${item.reason}`),
    ...hardware.filter((item) => item.reason).map((item) => `${item.label}: ${item.reason}`),
    ...resolutions.filter((item) => item.reason).map((item) => `${item.label}: ${item.reason}`),
    ...frameRates.filter((item) => item.reason).map((item) => `${item.label}: ${item.reason}`)
  ]

  const applyProfile = (id: string): void => {
    const profile = profiles.find((item) => item.id === id)
    if (!profile) return
    void update({
      recording: {
        resolution: profile.resolution,
        fps: profile.fps,
        format: profile.format,
        codec: profile.codec,
        quality: profile.quality,
        hardware: profile.hardware,
        bitrate: profile.bitrate,
        crf: profile.crf,
        keyframeInterval: profile.keyframeInterval,
        preset: profile.preset,
        activeProfileId: profile.id
      }
    })
  }

  const saveProfile = (): void => {
    const name = newProfileName.trim()
    if (!name) return
    const profile: RecordingProfile = {
      id: `user-${Date.now()}`,
      name,
      resolution: recording.resolution,
      fps: recording.fps,
      format: recording.format,
      codec: recording.codec,
      quality: recording.quality,
      hardware: recording.hardware,
      bitrate: recording.bitrate,
      crf: recording.crf,
      keyframeInterval: recording.keyframeInterval,
      preset: recording.preset,
      builtin: false
    }
    void update({
      recording: { profiles: [...recording.profiles, profile], activeProfileId: profile.id }
    })
    setNewProfileName('')
  }

  return (
    <div className="stack">
      <SettingRow
        label="Perfil"
        description="Los perfiles solo aplican ajustes verificados en este equipo."
      >
        <Select
          label="Perfil"
          hideLabel
          value={recording.activeProfileId ?? ''}
          placeholder="Personalizado"
          options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))}
          disabled={disabled}
          onChange={applyProfile}
        />
      </SettingRow>

      <div className="field">
        <label className="field__label" htmlFor="profile-name">Guardar ajustes actuales como perfil</label>
        <div className="toolbar">
          <input
            id="profile-name"
            className="input"
            value={newProfileName}
            maxLength={48}
            placeholder="Nombre del perfil"
            disabled={disabled}
            onChange={(event) => setNewProfileName(event.target.value)}
          />
          <Button disabled={disabled || !newProfileName.trim()} onClick={saveProfile}>Guardar</Button>
        </div>
      </div>

      <Select
        label="Resolución"
        value={recording.resolution}
        options={resolutions.map((item) => ({
          value: item.value,
          label: item.reason ? `${item.label} (no disponible)` : item.label
        }))}
        disabledOptions={resolutions.filter((item) => item.reason).map((item) => item.value)}
        disabled={disabled}
        onChange={(value) =>
          void update({ recording: { resolution: value as RecordingResolution, activeProfileId: null } })
        }
      />

      {!omit.includes('fps') && <FpsSelect disabled={disabled} />}

      <Select
        label="Formato"
        value={recording.format}
        options={formats.map((item) => ({
          value: item.value,
          label: item.reason ? `${item.label} (no disponible)` : item.label
        }))}
        disabledOptions={formats.filter((item) => item.reason).map((item) => item.value)}
        disabled={disabled}
        onChange={(value) =>
          void update({ recording: { format: value as RecordingFormat, activeProfileId: null } })
        }
      />

      <Select
        label="Códec de vídeo"
        value={recording.codec}
        options={codecs.map((item) => ({
          value: item.value,
          label: item.reason ? `${item.label} (no disponible)` : item.label
        }))}
        disabledOptions={codecs.filter((item) => item.reason).map((item) => item.value)}
        disabled={disabled}
        onChange={(value) =>
          void update({ recording: { codec: value as VideoCodec, activeProfileId: null } })
        }
      />

      <Select
        label="Aceleración"
        value={recording.hardware}
        options={hardware.map((item) => ({
          value: item.value,
          label: item.reason ? `${item.label} (no detectada)` : item.label
        }))}
        disabledOptions={hardware.filter((item) => item.reason).map((item) => item.value)}
        disabled={disabled}
        onChange={(value) =>
          void update({
            recording: {
              hardware: value as Settings['recording']['hardware'],
              activeProfileId: null
            }
          })
        }
      />

      {!omit.includes('quality') && <QualitySelect disabled={disabled} />}

      {recording.quality === 'custom' && (
        <>
          <div className="field">
            <label className="field__label" htmlFor="custom-bitrate">Bitrate de vídeo (Mbps)</label>
            <input
              id="custom-bitrate"
              className="input"
              type="number"
              min={0.5}
              max={100}
              step={0.5}
              value={recording.bitrate === null ? '' : String(recording.bitrate / 1_000_000)}
              disabled={disabled}
              onChange={(event) => {
                const value = Number(event.target.value)
                void update({
                  recording: {
                    bitrate: Number.isFinite(value) && value > 0
                      ? Math.round(value * 1_000_000)
                      : null,
                    activeProfileId: null
                  }
                })
              }}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="custom-crf">CRF (solo FFmpeg por software)</label>
            <input
              id="custom-crf"
              className="input"
              type="number"
              min={0}
              max={51}
              value={recording.crf ?? ''}
              disabled={disabled}
              onChange={(event) => {
                const raw = event.target.value
                const value = Number(raw)
                void update({
                  recording: {
                    crf: raw === '' || !Number.isFinite(value) ? null : Math.round(value),
                    activeProfileId: null
                  }
                })
              }}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="custom-keyframe">Intervalo de keyframe (frames)</label>
            <input
              id="custom-keyframe"
              className="input"
              type="number"
              min={1}
              max={600}
              value={recording.keyframeInterval ?? ''}
              disabled={disabled}
              onChange={(event) => {
                const raw = event.target.value
                const value = Number(raw)
                void update({
                  recording: {
                    keyframeInterval:
                      raw === '' || !Number.isFinite(value) ? null : Math.round(value),
                    activeProfileId: null
                  }
                })
              }}
            />
          </div>
          <Select
            label="Preset (solo FFmpeg por software)"
            value={recording.preset ?? ''}
            placeholder="Predeterminado"
            options={FFMPEG_PRESETS.map((preset) => ({ value: preset, label: preset }))}
            disabled={disabled}
            onChange={(value) =>
              void update({
                recording: { preset: value as FfmpegPreset, activeProfileId: null }
              })
            }
          />
        </>
      )}

      <SettingRow
        label="Detección de codificadores"
        description={
          ffmpegAvailable === null
            ? 'Comprobando FFmpeg…'
            : ffmpeg.ffmpeg.version
              ? `FFmpeg ${ffmpeg.ffmpeg.version}`
              : 'FFmpeg no disponible: solo se ofrecen formatos probados con MediaRecorder.'
        }
      >
        <Badge tone={ffmpegAvailable ? 'success' : 'warning'}>
          {ffmpegAvailable ? 'Verificado' : 'Sin FFmpeg'}
        </Badge>
      </SettingRow>

      {unavailable.length > 0 && (
        <details className="notice">
          <summary>Opciones no disponibles en este equipo ({unavailable.length})</summary>
          <ul>
            {unavailable.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </details>
      )}
      {recording.profiles.some((profile) => !profile.builtin) && (
        <span className="field__hint">
          Perfiles propios: {recording.profiles.filter((profile) => !profile.builtin).length}
        </span>
      )}
      {asString(encodingCapabilities?.ffmpeg.reason) && (
        <span className="field__hint">{encodingCapabilities?.ffmpeg.reason}</span>
      )}
    </div>
  )
}
