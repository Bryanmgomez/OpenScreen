import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorScreen } from '@/components/ErrorScreen'
import { AppShell } from '@/components/layout/AppShell'
import { useApplyAppearance } from '@/hooks/useApplyAppearance'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { setThumbnailCacheLimit } from '@/services/thumbnailService'
import { DesignGalleryPage } from '@/pages/DesignGalleryPage'
import { HomePage } from '@/pages/HomePage'
import { LibraryPage } from '@/pages/LibraryPage'
import { RecordingPage } from '@/pages/RecordingPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useAudioStore } from '@/store/audioStore'
import { useRecordingStore } from '@/store/recordingStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSystemStore } from '@/store/systemStore'

export function App() {
  const settings = useSettingsStore((state) => state.settings)
  const error = useSettingsStore((state) => state.error)
  const init = useSettingsStore((state) => state.init)

  useEffect(() => {
    void init()
    void useRecordingStore.getState().init()
    void useAudioStore.getState().init()
    void useSystemStore.getState().init()
  }, [init])

  useApplyAppearance(settings?.appearance)
  useGlobalShortcuts()

  const thumbnailCacheLimit = settings?.performance.thumbnailCacheLimit
  useEffect(() => {
    if (thumbnailCacheLimit !== undefined) setThumbnailCacheLimit(thumbnailCacheLimit)
  }, [thumbnailCacheLimit])

  if (!settings) {
    return error ? <ErrorScreen message={error} /> : <div className="boot" aria-busy="true" />
  }

  const startupPage = settings.general.startupPage
  const startupPath = startupPage === 'home' ? '/' : `/${startupPage}`

  // HashRouter: la app se carga desde file:// en producción, donde las rutas por historial no funcionan.
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to={startupPath} replace />} />
          <Route path="home" element={<HomePage />} />
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
