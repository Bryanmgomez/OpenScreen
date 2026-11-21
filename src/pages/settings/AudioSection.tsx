import { Mic, RefreshCw } from 'lucide-react'
import type { AudioPermission } from '@shared/audio'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { SettingRow } from '@/components/ui/SettingRow'
import { Switch } from '@/components/ui/Switch'
import { useAudioStore } from '@/store/audioStore'
import { useSettingsStore } from '@/store/settingsStore'

const MODES = [
  { value: 'auto', label: 'Captura del escritorio' },
  { value: 'device', label: 'Dispositivo virtual' }
] as const

const PERMISSION_LABEL: Record<AudioPermission, string> = {
  granted: 'Concedido',
  denied: 'Denegado',
  'not-determined': 'Sin decidir',
  restricted: 'Restringido',
  unsupported: 'No aplicable',
  unknown: 'Desconocido'
}

/** Ajustes persistentes de captura de audio. Las capacidades vienen de main, no se suponen. */
export function AudioSection() {
  const { settings, error: settingsError } = useSettingsStore()
  const { support, devices, error: audioError, requesting, refreshDevices } = useAudioStore()
  const updateTrack = useAudioStore((state) => state.updateTrack)
  const updateSystem = useAudioStore((state) => state.updateSystem)
  const setSeparateTracks = useAudioStore((state) => state.setSeparateTracks)

  if (!settings) return null
  const audio = settings.audio
  const deviceOptions = devices.map((device) => ({ value: device.id, label: device.label }))
  const autoUnavailable = support?.systemAudio === 'unavailable' && audio.system.mode === 'auto'
  const systemSupportLabel =
    support?.systemAudio === 'available'
      ? 'compatible (verificado con audio real)'
      : support?.systemAudio === 'experimental'
        ? 'experimental (sin verificar)'
        : 'no disponible de forma nativa'

  return (
    <>
      {(settingsError || audioError) && (
        <p className="notice notice--error">{audioError ?? settingsError}</p>
      )}

      <Card title="Fuentes" icon={<Mic size={18} />}>
        <SettingRow
          label="Micrófono"
          description="Captura la entrada seleccionada como pista independiente."
        >
          <Switch
            label="Capturar micrófono"
            checked={audio.microphone.enabled}
            onChange={(enabled) => void updateTrack('microphone', { enabled })}
          />
        </SettingRow>
        <SettingRow
          label="Audio del sistema"
          description={
            autoUnavailable
              ? 'Captura automática no disponible: elige un dispositivo virtual.'
              : 'Sonido del escritorio o de un dispositivo virtual.'
          }
        >
          <Switch
            label="Capturar audio del sistema"
            checked={audio.system.enabled}
            disabled={autoUnavailable}
            onChange={(enabled) => void updateTrack('system', { enabled })}
          />
        </SettingRow>
        <SettingRow label="Pistas independientes" description="Micrófono y sistema en archivos Opus/WebM separados.">
          <Switch
            label="Pistas independientes"
            checked={audio.separateTracks}
            onChange={(separateTracks) => void setSeparateTracks(separateTracks)}
          />
        </SettingRow>
        <SettingRow
          label="Silenciar salida al capturar"
          description="Usa el loopback con mute en Windows para evitar eco."
        >
          <Switch
            label="Silenciar salida al capturar"
            checked={audio.system.muteOnCapture}
            disabled={audio.system.mode !== 'auto'}
            onChange={(muteOnCapture) => void updateSystem({ muteOnCapture })}
          />
        </SettingRow>
      </Card>

      <Card title="Dispositivos" icon={<RefreshCw size={18} />}>
        <SettingRow
          label="Permiso de micrófono"
          description="Se solicita al pulsar el botón; se liberan los tracks de prueba."
        >
          <Badge
            tone={
              support?.microphonePermission === 'granted'
                ? 'success'
                : support?.microphonePermission === 'denied' ||
                    support?.microphonePermission === 'restricted'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {support ? PERMISSION_LABEL[support.microphonePermission] : 'Consultando…'}
          </Badge>
        </SettingRow>
        <div className="toolbar">
          <Button
            icon={<RefreshCw size={13} />}
            onClick={() => void refreshDevices(true)}
            disabled={requesting}
          >
            {requesting ? 'Solicitando…' : 'Detectar micrófonos'}
          </Button>
          <Button
            icon={<RefreshCw size={13} />}
            onClick={() => void refreshDevices(false)}
            disabled={requesting}
          >
            Actualizar lista
          </Button>
        </div>

        <SettingRow label="Micrófono" description="Dispositivo de entrada preferido.">
          <Select
            label="Micrófono"
            hideLabel
            value={audio.microphone.deviceId ?? ''}
            options={deviceOptions}
            placeholder="Predeterminado del sistema"
            disabled={!audio.microphone.enabled}
            onChange={(value) => void updateTrack('microphone', { deviceId: value || null })}
          />
        </SettingRow>
        <SettingRow label="Modo del sistema" description="Loopback automático o dispositivo virtual.">
          <Select
            label="Modo del sistema"
            hideLabel
            value={audio.system.mode}
            options={MODES}
            disabled={!audio.system.enabled}
            onChange={(value) => void updateSystem({ mode: value as 'auto' | 'device' })}
          />
        </SettingRow>
        <SettingRow
          label="Dispositivo del sistema"
          description="En modo virtual, elige la entrada que recibe el audio del escritorio."
        >
          <Select
            label="Dispositivo del sistema"
            hideLabel
            value={audio.system.deviceId ?? ''}
            options={deviceOptions}
            placeholder="Predeterminado"
            disabled={!audio.system.enabled || audio.system.mode !== 'device'}
            onChange={(value) => void updateTrack('system', { deviceId: value || null })}
          />
        </SettingRow>
      </Card>

      <Card title="Compatibilidad" icon={<Mic size={18} />}>
        {support?.notes.map((note) => (
          <p key={note} className="card__description">{note}</p>
        ))}
        <p className="field__hint">
          Permiso de micrófono: {support ? PERMISSION_LABEL[support.microphonePermission] : 'desconocido'}.
          Captura automática del sistema: {systemSupportLabel}. No se presenta como compatible en
          plataformas en las que no se ha probado con audio real.
        </p>
      </Card>
    </>
  )
}
