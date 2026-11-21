import { Circle, House, Library, Settings } from 'lucide-react'
import { SideNav, type SideNavItem } from '@/components/ui/SideNav'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useAppInfo } from '@/hooks/useAppInfo'
import { useI18n } from '@/hooks/useI18n'
import { useRecordingStore } from '@/store/recordingStore'

export function Sidebar() {
  const { info } = useAppInfo()
  const { t } = useI18n()
  const state = useRecordingStore((store) => store.status.state)
  const active = state === 'recording' || state === 'paused'

  const items: readonly SideNavItem[] = [
    { id: 'home', to: '/', label: t('nav.home'), icon: House },
    { id: 'recording', to: '/recording', label: t('nav.recording'), icon: Circle },
    { id: 'library', to: '/library', label: t('nav.library'), icon: Library },
    { id: 'settings', to: '/settings', label: t('nav.settings'), icon: Settings }
  ]

  return (
    <aside className="sidebar">
      <SideNav items={items} label={t('settings.categories')} />
      {active && (
        <div className="sidebar__recording">
          <StatusIndicator
            tone={state === 'recording' ? 'recording' : 'pending'}
            label={state === 'recording' ? t('status.recording') : t('status.paused')}
          />
        </div>
      )}
      {info && <div className="sidebar__footer">v{info.version}</div>}
    </aside>
  )
}
