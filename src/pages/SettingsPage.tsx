import { useState } from 'react'
import { AppearanceSection } from './settings/AppearanceSection'
import { GeneralSection } from './settings/GeneralSection'
import { PendingSection } from './settings/PendingSection'
import { SETTINGS_SECTIONS } from './settings/sections'
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
        <nav className="settings__nav" aria-label="Categorías de ajustes">
          {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="settings__nav-item"
              aria-current={id === activeId ? 'page' : undefined}
              onClick={() => setActiveId(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="settings__panel">
          {active?.id === 'general' && <GeneralSection />}
          {active?.id === 'appearance' && <AppearanceSection />}
          {active?.pending && <PendingSection section={active} />}
        </div>
      </div>
    </div>
  )
}
