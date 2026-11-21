import { Circle, House, Library, Settings, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppInfo } from '@/hooks/useAppInfo'
import { cn } from '@/utils/cn'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/recording', label: 'Grabación', icon: Circle },
  { to: '/library', label: 'Grabaciones', icon: Library },
  { to: '/settings', label: 'Ajustes', icon: Settings }
]

export function Sidebar() {
  const { info } = useAppInfo()

  return (
    <nav className="sidebar" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          aria-label={label}
          title={label}
          className={({ isActive }) => cn('nav-link', isActive && 'nav-link--active')}
        >
          <Icon size={18} />
          <span className="nav-link__label">{label}</span>
        </NavLink>
      ))}
      {info && <div className="sidebar__footer">v{info.version}</div>}
    </nav>
  )
}
