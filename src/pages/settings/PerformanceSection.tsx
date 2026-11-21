import { useEffect } from 'react'
import { Activity, AlertTriangle, Cpu, Gauge, HardDrive, RefreshCw, Trash2 } from 'lucide-react'
import type { FeatureSupport } from '@shared/system'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SettingRow } from '@/components/ui/SettingRow'
import { useI18n } from '@/hooks/useI18n'
import { useSettingsStore } from '@/store/settingsStore'
import { useSystemStore } from '@/store/systemStore'
import { formatBytes } from '@/utils/format'
import { toMessage } from '@/utils/errors'

const number = (value: number | null, digits = 1): string =>
  value === null || !Number.isFinite(value) ? '—' : value.toFixed(digits)

function SupportBadge({ support }: { support: FeatureSupport | undefined }) {
  const { t } = useI18n()
  if (!support) return <Badge tone="neutral">{t('common.unknown')}</Badge>
  return (
    <span className="stack">
      <Badge tone={support.supported ? 'success' : 'warning'}>
        {support.supported ? t('common.supported') : t('common.unsupported')}
      </Badge>
      {support.reason && <span className="field__hint">{support.reason}</span>}
    </span>
  )
}

/** Indicadores de consumo, hardware, errores y liberación de recursos. */
export function PerformanceSection() {
  const { t } = useI18n()
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  const capabilities = useSystemStore((state) => state.capabilities)
  const hardware = useSystemStore((state) => state.hardware)
  const diagnostics = useSystemStore((state) => state.diagnostics)
  const error = useSystemStore((state) => state.error)
  const releasing = useSystemStore((state) => state.releasing)
  const refresh = useSystemStore((state) => state.refreshDiagnostics)
  const releaseResources = useSystemStore((state) => state.releaseResources)

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 4000)
    return () => window.clearInterval(timer)
  }, [refresh])

  if (!settings) return null
  const performance = diagnostics?.performance
  const resources = diagnostics?.resources
  const gpu = hardware?.gpu
  const gpuLabel = gpu
    ? [gpu.vendorString, gpu.deviceString, gpu.vendorId, gpu.deviceId].filter(Boolean).join(' · ')
    : t('common.unknown')

  return (
    <>
      <Card
        title={t('performance.capabilities')}
        icon={<Cpu size={18} />}
        action={
          <Button icon={<RefreshCw size={13} />} onClick={() => void refresh()}>
            {t('common.refresh')}
          </Button>
        }
      >
        <dl className="info-list">
          <dt>{t('performance.platform')}</dt>
          <dd>{capabilities ? `${capabilities.platform} · ${capabilities.arch}` : t('common.unknown')}</dd>
          <dt>{t('general.startAtLogin')}</dt>
          <dd><SupportBadge support={capabilities?.startAtLogin} /></dd>
          <dt>{t('general.notifications')}</dt>
          <dd><SupportBadge support={capabilities?.notifications} /></dd>
          <dt>{t('shortcuts.title')}</dt>
          <dd><SupportBadge support={capabilities?.globalShortcuts} /></dd>
          <dt>{t('performance.metrics')}</dt>
          <dd><SupportBadge support={capabilities?.metrics} /></dd>
        </dl>
      </Card>

      <Card title={t('performance.hardware')} icon={<HardDrive size={18} />}>
        {hardware ? (
          <dl className="info-list">
            <dt>{t('performance.cpuModel')}</dt>
            <dd>{hardware.cpuModel ?? t('common.unknown')}</dd>
            <dt>{t('performance.cores')}</dt>
            <dd>{hardware.cpuCores ?? t('common.unknown')}</dd>
            <dt>{t('performance.totalMemory')}</dt>
            <dd>
              {hardware.totalMemoryGb === null
                ? t('common.unknown')
                : `${number(hardware.totalMemoryGb, 1)} GB`}
            </dd>
            <dt>{t('performance.displays')}</dt>
            <dd>{hardware.displayCount ?? t('common.unknown')}</dd>
            <dt>{t('performance.gpu')}</dt>
            <dd>{gpuLabel}</dd>
          </dl>
        ) : (
          <p className="notice">{t('performance.noHardware')}</p>
        )}
      </Card>

      <Card title={t('performance.metrics')} icon={<Activity size={18} />}>
        {!performance?.supported ? (
          <p className="notice">{performance?.reason ?? t('performance.metricsUnavailable')}</p>
        ) : (
          <dl className="info-list">
            <dt>{t('performance.cpu')}</dt>
            <dd>{number(performance.totalCpuPercent, 2)} %</dd>
            <dt>{t('performance.memory')}</dt>
            <dd>
              {formatBytes(
                performance.totalMemoryMb === null ? null : performance.totalMemoryMb * 1024 * 1024
              )}
            </dd>
            <dt>{t('performance.free')}</dt>
            <dd>
              {formatBytes(
                performance.systemMemory.freeGb === null
                  ? null
                  : performance.systemMemory.freeGb * 1024 ** 3
              )}
            </dd>
            <dt>{t('performance.used')}</dt>
            <dd>{number(performance.systemMemory.usedPercent, 1)} %</dd>
            <dt>{t('performance.processes')}</dt>
            <dd>{performance.processes.length}</dd>
            <dt>{t('performance.sampledAt')}</dt>
            <dd>{new Date(performance.sampledAt).toLocaleTimeString()}</dd>
          </dl>
        )}
      </Card>

      <Card
        title={t('performance.resources')}
        icon={<Gauge size={18} />}
        action={
          <Button
            icon={<Trash2 size={13} />}
            onClick={() => void releaseResources()}
            disabled={releasing}
          >
            {t('performance.release')}
          </Button>
        }
      >
        <dl className="info-list">
          <dt>{t('performance.activeRecordings')}</dt>
          <dd>{resources?.activeRecordings ?? '—'}</dd>
          <dt>{t('performance.openHandles')}</dt>
          <dd>{resources?.openFileHandles ?? '—'}</dd>
          <dt>{t('performance.ffmpegProcesses')}</dt>
          <dd>{resources?.activeFfmpegProcesses ?? '—'}</dd>
          <dt>{t('performance.tempFiles')}</dt>
          <dd>{resources?.managedTempFiles ?? '—'}</dd>
          <dt>{t('performance.gc')}</dt>
          <dd>{resources?.gcAvailable ? t('common.enabled') : t('common.disabled')}</dd>
          <dt>{t('performance.releasedAt')}</dt>
          <dd>
            {resources?.releasedAt ? new Date(resources.releasedAt).toLocaleTimeString() : '—'}
          </dd>
        </dl>
      </Card>

      <Card title={t('performance.diagnostics')} icon={<AlertTriangle size={18} />}>
        {settings.performance.errorHistoryLimit && (
          <SettingRow label="Historial de errores" description="Número máximo de errores conservados en esta sesión.">
            <input
              className="input"
              type="number"
              min={10}
              max={200}
              value={settings.performance.errorHistoryLimit}
              onChange={(event) =>
                void update({
                  performance: { errorHistoryLimit: Number(event.target.value) }
                })
              }
            />
          </SettingRow>
        )}
        <SettingRow
          label={t('storage.warningGb')}
          description="Aviso de espacio libre; OpenScreen nunca borra grabaciones automáticamente."
        >
          <input
            className="input"
            type="number"
            min={0.5}
            max={100}
            step={0.5}
            value={settings.performance.storageWarningGb}
            onChange={(event) =>
              void update({ performance: { storageWarningGb: Number(event.target.value) } })
            }
          />
        </SettingRow>
        <SettingRow label="Límite de miniaturas" description="Máximo de miniaturas conservadas en memoria.">
          <input
            className="input"
            type="number"
            min={8}
            max={100}
            value={settings.performance.thumbnailCacheLimit}
            onChange={(event) =>
              void update({ performance: { thumbnailCacheLimit: Number(event.target.value) } })
            }
          />
        </SettingRow>
        {error && <p className="notice notice--error">{toMessage(error)}</p>}
        {!diagnostics?.errors.length ? (
          <p className="notice">{t('performance.noErrors')}</p>
        ) : (
          <ul className="error-list">
            {diagnostics.errors.map((item) => (
              <li key={item.id} className="error-list__item">
                <span className="error-list__time">{new Date(item.at).toLocaleTimeString()}</span>
                <span className="error-list__source">{item.source}</span>
                <span className="error-list__message">{item.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
