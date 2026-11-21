import { Palette } from 'lucide-react'
import type { Theme } from '@shared/settings'
import { Card } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SettingRow } from '@/components/ui/SettingRow'
import { Switch } from '@/components/ui/Switch'
import { useI18n } from '@/hooks/useI18n'
import { useSettingsStore } from '@/store/settingsStore'

export function AppearanceSection() {
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  const { t } = useI18n()

  if (!settings) return null
  const { theme, reduceMotion } = settings.appearance
  const themeOptions: readonly { value: Theme; label: string }[] = [
    { value: 'dark', label: t('appearance.dark') },
    { value: 'light', label: t('appearance.light') },
    { value: 'system', label: t('appearance.system') }
  ]

  return (
    <Card title={t('appearance.title')} icon={<Palette size={18} />}>
      <SettingRow label={t('appearance.theme')} description={t('appearance.themeDesc')}>
        <SegmentedControl
          label={t('appearance.theme')}
          value={theme}
          options={themeOptions}
          onChange={(value) => void update({ appearance: { theme: value } })}
        />
      </SettingRow>
      <SettingRow label={t('appearance.reduceMotion')} description={t('appearance.reduceMotionDesc')}>
        <Switch
          label={t('appearance.reduceMotion')}
          checked={reduceMotion}
          onChange={(value) => void update({ appearance: { reduceMotion: value } })}
        />
      </SettingRow>
    </Card>
  )
}
