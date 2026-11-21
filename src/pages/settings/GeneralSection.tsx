import { Info, ListChecks, Scale, Settings2 } from 'lucide-react'
import { SystemInfo } from '@/components/SystemInfo'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { SettingRow } from '@/components/ui/SettingRow'
import { Switch } from '@/components/ui/Switch'
import { useI18n } from '@/hooks/useI18n'
import { useSettingsStore } from '@/store/settingsStore'
import { useSystemStore } from '@/store/systemStore'
import { cn } from '@/utils/cn'
import { PHASES, PHASE_STATUS_LABEL } from '@/utils/roadmap'

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' }
] as const

const PAGE_OPTIONS = [
  { value: 'home', labelKey: 'startup.home' },
  { value: 'record', labelKey: 'startup.record' },
  { value: 'library', labelKey: 'startup.library' },
  { value: 'settings', labelKey: 'startup.settings' }
] as const

/** Preferencias persistentes de inicio, idioma, tema y notificaciones. */
export function GeneralSection() {
  const { t } = useI18n()
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  const capabilities = useSystemStore((state) => state.capabilities)

  if (!settings) return null
  const general = settings.general
  const loginSupported = capabilities?.startAtLogin.supported ?? false
  const notificationsSupported = capabilities?.notifications.supported ?? false

  return (
    <>
      <Card title={t('general.preferences')} icon={<Settings2 size={18} />}>
        <SettingRow label={t('general.language')} description={t('general.languageDesc')}>
          <Select
            label={t('general.language')}
            hideLabel
            value={general.language}
            options={LANGUAGE_OPTIONS}
            onChange={(value) =>
              void update({ general: { language: value === 'en' ? 'en' : 'es' } })
            }
          />
        </SettingRow>
        <SettingRow label={t('general.startupPage')} description={t('general.startupPageDesc')}>
          <Select
            label={t('general.startupPage')}
            hideLabel
            value={general.startupPage}
            options={PAGE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
            onChange={(value) => void update({ general: { startupPage: value as typeof general.startupPage } })}
          />
        </SettingRow>
        <SettingRow
          label={t('general.startAtLogin')}
          description={loginSupported ? t('general.startAtLoginDesc') : capabilities?.startAtLogin.reason ?? undefined}
        >
          <Switch
            label={t('general.startAtLogin')}
            checked={general.startAtLogin}
            disabled={!loginSupported}
            onChange={(checked) => void update({ general: { startAtLogin: checked } })}
          />
        </SettingRow>
        <SettingRow label={t('general.startMinimized')} description={t('general.startMinimizedDesc')}>
          <Switch
            label={t('general.startMinimized')}
            checked={general.startMinimized}
            onChange={(checked) => void update({ general: { startMinimized: checked } })}
          />
        </SettingRow>
        <SettingRow label={t('general.minimizeOnClose')} description={t('general.minimizeOnCloseDesc')}>
          <Switch
            label={t('general.minimizeOnClose')}
            checked={general.minimizeOnClose}
            onChange={(checked) => void update({ general: { minimizeOnClose: checked } })}
          />
        </SettingRow>
      </Card>

      <Card title={t('general.notifications')} icon={<Info size={18} />}>
        <SettingRow
          label={t('general.notificationsEnabled')}
          description={notificationsSupported ? undefined : t('common.unsupported')}
        >
          <Switch
            label={t('general.notificationsEnabled')}
            checked={general.notifications.enabled}
            disabled={!notificationsSupported}
            onChange={(checked) => void update({ general: { notifications: { enabled: checked } } })}
          />
        </SettingRow>
        <SettingRow label={t('general.recordingComplete')}>
          <Switch
            label={t('general.recordingComplete')}
            checked={general.notifications.recordingComplete}
            disabled={!general.notifications.enabled}
            onChange={(checked) =>
              void update({ general: { notifications: { recordingComplete: checked } } })
            }
          />
        </SettingRow>
        <SettingRow label={t('general.errorNotifications')}>
          <Switch
            label={t('general.errorNotifications')}
            checked={general.notifications.errors}
            disabled={!general.notifications.enabled}
            onChange={(checked) => void update({ general: { notifications: { errors: checked } } })}
          />
        </SettingRow>
      </Card>

      <Card title={t('general.about')} icon={<Info size={18} />}>
        <SystemInfo />
      </Card>
      <Card title={t('general.roadmap')} icon={<ListChecks size={18} />}>
        <ol className="roadmap">
          {PHASES.map((phase) => (
            <li key={phase.number} className={cn('roadmap__item', phase.status === 'done' && 'roadmap__item--done')}>
              <span className="roadmap__number">{phase.number}</span>
              <span className="roadmap__title">{phase.title}</span>
              <Badge tone={phase.status === 'done' ? 'success' : phase.status === 'next' ? 'accent' : 'neutral'}>
                {PHASE_STATUS_LABEL[phase.status]}
              </Badge>
            </li>
          ))}
        </ol>
      </Card>
      <Card
        title="Licencia"
        icon={<Scale size={18} />}
        description="OpenScreen es software libre distribuido bajo la licencia GNU GPL-3.0-only. El texto completo está en el archivo LICENSE del proyecto."
      />
    </>
  )
}
