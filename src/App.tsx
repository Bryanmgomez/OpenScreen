import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorScreen } from '@/components/ErrorScreen'
import { AppShell } from '@/components/layout/AppShell'
import { useApplyAppearance } from '@/hooks/useApplyAppearance'
import { DesignGalleryPage } from '@/pages/DesignGalleryPage'
import { HomePage } from '@/pages/HomePage'
import { LibraryPage } from '@/pages/LibraryPage'
import { RecordingPage } from '@/pages/RecordingPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useSettingsStore } from '@/store/settingsStore'

export function App() {
  const settings = useSettingsStore((state) => state.settings)
  const error = useSettingsStore((state) => state.error)
  const init = useSettingsStore((state) => state.init)

  useEffect(() => {
    void init()
  }, [init])

  useApplyAppearance(settings?.appearance)

  if (!settings) {
    return error ? <ErrorScreen message={error} /> : <div className="boot" aria-busy="true" />
  }

  // HashRouter: la app se carga desde file:// en producción, donde las rutas por historial no funcionan.
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="recording" element={<RecordingPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {import.meta.env.DEV && <Route path="design" element={<DesignGalleryPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
