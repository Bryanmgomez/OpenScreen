import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PanelProps {
  title: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Panel compacto para agrupar controles (más denso que Card). */
export function Panel({ title, icon, action, className, children }: PanelProps) {
  return (
    <section className={cn('panel', className)}>
      <header className="panel__header">
        {icon}
        <h2 className="panel__title">{title}</h2>
        {action && <div className="panel__action">{action}</div>}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  )
}
