import { useState } from 'react'
import { AppearanceSection } from './settings/AppearanceSection'
import { AudioSection } from './settings/AudioSection'
import { GeneralSection } from './settings/GeneralSection'
import { PendingSection } from './settings/PendingSection'
import { RecordingSection } from './settings/RecordingSection'
import { SETTINGS_SECTIONS } from './settings/sections'
import { SideNav } from '@/components/ui/SideNav'
import { useSettingsStore } from '@/store/settingsStore'

export function SettingsPage() {
  const [activeId, setActiveId] = useState<string>('general')
  const error = useSettingsStore((state) => state.error)
  const active = SETTINGS_SECTIONS.find((section) => section.id === activeId) ?? SETTINGS_SECTIONS[0]

  return (
    <div className="page">
      <header className="page__header">
        <h1>Ajustes</h1>
        <p>Los cambios se guardan automáticamente.</p>
      </header>

      {error && <div className="notice notice--error">{error}</div>}

      <div className="settings">
        <SideNav
          className="sidenav--compact"
          label="Categorías de ajustes"
          items={SETTINGS_SECTIONS}
          activeId={activeId}
          onSelect={setActiveId}
        />

        <div className="settings__panel">
          {active?.id === 'general' && <GeneralSection />}
          {active?.id === 'appearance' && <AppearanceSection />}
          {active?.id === 'audio' && <AudioSection />}
          {active?.id === 'storage' && <RecordingSection />}
          {active?.pending && <PendingSection section={active} />}
        </div>
      </div>
    </div>
  )
}
