import { Circle, House, Library, Settings } from 'lucide-react'
import { SideNav, type SideNavItem } from '@/components/ui/SideNav'
import { useAppInfo } from '@/hooks/useAppInfo'

const NAV_ITEMS: readonly SideNavItem[] = [
  { id: 'home', to: '/', label: 'Inicio', icon: House },
  { id: 'recording', to: '/recording', label: 'Grabación', icon: Circle },
  { id: 'library', to: '/library', label: 'Grabaciones', icon: Library },
  { id: 'settings', to: '/settings', label: 'Ajustes', icon: Settings }
]

export function Sidebar() {
  const { info } = useAppInfo()

  return (
    <aside className="sidebar">
      <SideNav items={NAV_ITEMS} label="Navegación principal" />
      {info && <div className="sidebar__footer">v{info.version}</div>}
    </aside>
  )
}
