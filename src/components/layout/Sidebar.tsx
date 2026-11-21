import { Circle, House, Library, Settings } from 'lucide-react'
import { SideNav, type SideNavItem } from '@/components/ui/SideNav'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useAppInfo } from '@/hooks/useAppInfo'
import { useRecordingStore } from '@/store/recordingStore'

const NAV_ITEMS: readonly SideNavItem[] = [
  { id: 'home', to: '/', label: 'Inicio', icon: House },
  { id: 'recording', to: '/recording', label: 'Grabación', icon: Circle },
  { id: 'library', to: '/library', label: 'Grabaciones', icon: Library },
  { id: 'settings', to: '/settings', label: 'Ajustes', icon: Settings }
]

export function Sidebar() {
  const { info } = useAppInfo()
  const state = useRecordingStore((store) => store.status.state)
  const active = state === 'recording' || state === 'paused'

  return (
    <aside className="sidebar">
      <SideNav items={NAV_ITEMS} label="Navegación principal" />
      {active && (
        <div className="sidebar__recording">
          <StatusIndicator
            tone={state === 'recording' ? 'recording' : 'pending'}
            label={state === 'recording' ? 'Grabando' : 'En pausa'}
          />
        </div>
      )}
      {info && <div className="sidebar__footer">v{info.version}</div>}
    </aside>
  )
}
