import { useEffect, useState } from 'react'
import { Keyboard, RotateCcw } from 'lucide-react'
import {
  DEFAULT_SHORTCUT_BINDINGS,
  SHORTCUT_ACTIONS,
  SHORTCUT_LABELS,
  acceleratorFromEvent,
  duplicateShortcutActions,
  normalizeAccelerator,
  type ShortcutAction
} from '@shared/shortcuts'
import type { PlatformName } from '@shared/system'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SettingRow } from '@/components/ui/SettingRow'
import { Switch } from '@/components/ui/Switch'
import { useI18n } from '@/hooks/useI18n'
import { useSettingsStore } from '@/store/settingsStore'
import { useSystemStore } from '@/store/systemStore'

/** Editor de atajos globales con normalización, teclas reservadas y detección de duplicados. */
export function ShortcutsSection() {
  const { t, language } = useI18n()
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  const status = useSystemStore((state) => state.shortcuts)
  const platform = useSystemStore((state) => state.capabilities?.platform ?? 'other')
  const refreshDiagnostics = useSystemStore((state) => state.refreshDiagnostics)
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!capturing) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setCapturing(null)
        setError(null)
        return
      }
      const accelerator = acceleratorFromEvent(event, platform as PlatformName)
      if (!accelerator) return
      event.preventDefault()
      event.stopPropagation()
      const settings = useSettingsStore.getState().settings
      if (!settings) return
      const bindings = { ...settings.shortcuts.bindings, [capturing]: accelerator }
      const normalized = normalizeAccelerator(accelerator)
      if (!normalized) {
        setError('Esa combinación no es válida o está reservada por el sistema.')
        setCapturing(null)
        return
      }
      if (duplicateShortcutActions(bindings).length > 0) {
        setError(t('shortcuts.conflict'))
        setCapturing(null)
        return
      }
      setError(null)
      setCapturing(null)
      void update({ shortcuts: { ...settings.shortcuts, bindings } }).then(() =>
        void refreshDiagnostics()
      )
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [capturing, platform, refreshDiagnostics, t, update])

  if (!settings) return null
  const shortcutSettings = settings.shortcuts
  const duplicates = new Set(duplicateShortcutActions(shortcutSettings.bindings).flat())

  const setEnabled = async (enabled: boolean): Promise<void> => {
    await update({ shortcuts: { ...shortcutSettings, enabled } })
    await refreshDiagnostics()
  }

  const reset = async (): Promise<void> => {
    await update({
      shortcuts: { enabled: shortcutSettings.enabled, bindings: { ...DEFAULT_SHORTCUT_BINDINGS } }
    })
    setError(null)
    await refreshDiagnostics()
  }

  return (
    <Card
      title={t('shortcuts.title')}
      icon={<Keyboard size={18} />}
      action={
        <Badge tone={shortcutSettings.enabled ? 'success' : 'neutral'}>
          {shortcutSettings.enabled ? t('common.enabled') : t('common.disabled')}
        </Badge>
      }
    >
      <SettingRow label={t('shortcuts.enable')} description={t('shortcuts.enableDesc')}>
        <Switch
          label={t('shortcuts.enable')}
          checked={shortcutSettings.enabled}
          onChange={(checked) => void setEnabled(checked)}
        />
      </SettingRow>

      <div className="shortcuts-table" role="table">
        <div className="shortcuts-table__head" role="row">
          <span role="columnheader">{t('shortcuts.action')}</span>
          <span role="columnheader">{t('shortcuts.combination')}</span>
          <span role="columnheader">{t('shortcuts.status')}</span>
        </div>
        {SHORTCUT_ACTIONS.map((action) => {
          const registration = status?.registrations.find((item) => item.action === action)
          const registered = registration?.registered ?? false
          const conflict = duplicates.has(action)
          return (
            <div className="shortcuts-table__row" role="row" key={action}>
              <span role="cell">{SHORTCUT_LABELS[action][language]}</span>
              <span role="cell">
                <Button
                  variant={capturing === action ? 'primary' : 'secondary'}
                  icon={<Keyboard size={13} />}
                  onClick={() => {
                    setError(null)
                    setCapturing(action)
                  }}
                >
                  {capturing === action
                    ? t('shortcuts.pressKeys')
                    : shortcutSettings.bindings[action]}
                </Button>
              </span>
              <span role="cell">
                {conflict || (shortcutSettings.enabled && !registered) ? (
                  <Badge tone="warning">{t('shortcuts.notRegistered')}</Badge>
                ) : registered ? (
                  <Badge tone="success">{t('shortcuts.registered')}</Badge>
                ) : (
                  <Badge tone="neutral">{t('shortcuts.disabled')}</Badge>
                )}
                {registration?.reason && !conflict && (
                  <span className="field__hint">{registration.reason}</span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {error && <p className="notice notice--error">{error}</p>}
      <p className="field__hint">{t('shortcuts.permissionNote')}</p>
      <Button icon={<RotateCcw size={13} />} onClick={() => void reset()}>
        {t('common.reset')}
      </Button>
    </Card>
  )
}
