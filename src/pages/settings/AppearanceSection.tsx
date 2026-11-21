import { Palette } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SettingRow } from '@/components/ui/SettingRow'
import { Switch } from '@/components/ui/Switch'
import { useSettingsStore } from '@/store/settingsStore'
import type { Theme } from '@shared/settings'

const THEME_OPTIONS: readonly { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' }
]

export function AppearanceSection() {
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)

  if (!settings) return null
  const { theme, reduceMotion } = settings.appearance

  return (
    <Card title="Apariencia" icon={<Palette size={18} />}>
      <SettingRow label="Tema" description="Oscuro por defecto. «Sistema» sigue la preferencia de Windows.">
        <SegmentedControl
          label="Tema"
          value={theme}
          options={THEME_OPTIONS}
          onChange={(value) => void update({ appearance: { theme: value } })}
        />
      </SettingRow>
      <SettingRow label="Reducir animaciones" description="Desactiva transiciones y animaciones de la interfaz.">
        <Switch
          label="Reducir animaciones"
          checked={reduceMotion}
          onChange={(value) => void update({ appearance: { reduceMotion: value } })}
        />
      </SettingRow>
    </Card>
  )
}
