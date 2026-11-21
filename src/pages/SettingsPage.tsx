import { useState } from 'react'
import { AppearanceSection } from './settings/AppearanceSection'
import { CaptureSection } from './settings/CaptureSection'
import { AudioSection } from './settings/AudioSection'
import { GeneralSection } from './settings/GeneralSection'
import { PerformanceSection } from './settings/PerformanceSection'
import { RecordingSection } from './settings/RecordingSection'
import { ShortcutsSection } from './settings/ShortcutsSection'
import { VideoSection } from './settings/VideoSection'
import { SETTINGS_SECTIONS } from './settings/sections'
import { SideNav } from '@/components/ui/SideNav'
import { useI18n } from '@/hooks/useI18n'
import { useSettingsStore } from '@/store/settingsStore'

export function SettingsPage() {
  const [activeId, setActiveId] = useState<string>('general')
  const error = useSettingsStore((state) => state.error)
  const { t } = useI18n()
  const active = SETTINGS_SECTIONS.find((section) => section.id === activeId) ?? SETTINGS_SECTIONS[0]

  return (
    <div className="page">
      <header className="page__header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </header>

      {error && <div className="notice notice--error">{error}</div>}

      <div className="settings">
        <SideNav
          className="sidenav--compact"
          label={t('settings.categories')}
          items={SETTINGS_SECTIONS.map((section) => ({
            ...section,
            label: t(section.labelKey)
          }))}
          activeId={activeId}
          onSelect={setActiveId}
        />

        <div className="settings__panel">
          {active?.id === 'general' && <GeneralSection />}
          {active?.id === 'appearance' && <AppearanceSection />}
          {active?.id === 'capture' && <CaptureSection />}
          {active?.id === 'audio' && <AudioSection />}
          {active?.id === 'storage' && <RecordingSection />}
          {active?.id === 'video' && <VideoSection />}
          {active?.id === 'shortcuts' && <ShortcutsSection />}
          {active?.id === 'performance' && <PerformanceSection />}
        </div>
      </div>
    </div>
  )
}
