import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'

export interface SideNavItem {
  id: string
  label: string
  icon: LucideIcon
  /** Si existe, el elemento navega a esa ruta; si no, usa `onSelect`. */
  to?: string
}

interface SideNavProps {
  items: readonly SideNavItem[]
  label: string
  className?: string
  /** Modo botones (sin rutas): id activo y callback. */
  activeId?: string
  onSelect?: (id: string) => void
}

/** Navegación lateral reutilizable: por rutas (barra principal) o por estado (ajustes). */
export function SideNav({ items, label, className, activeId, onSelect }: SideNavProps) {
  return (
    <nav className={cn('sidenav', className)} aria-label={label}>
      {items.map(({ id, label: text, icon: Icon, to }) =>
        to !== undefined ? (
          <NavLink
            key={id}
            to={to}
            end={to === '/'}
            aria-label={text}
            title={text}
            className={({ isActive }) => cn('sidenav__item', isActive && 'sidenav__item--active')}
          >
            <Icon size={18} />
            <span className="sidenav__label">{text}</span>
          </NavLink>
        ) : (
          <button
            key={id}
            type="button"
            title={text}
            aria-current={id === activeId ? 'page' : undefined}
            className={cn('sidenav__item', id === activeId && 'sidenav__item--active')}
            onClick={() => onSelect?.(id)}
          >
            <Icon size={16} />
            <span className="sidenav__label">{text}</span>
          </button>
        )
      )}
    </nav>
  )
}
