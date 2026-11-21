import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
  children?: ReactNode
}

export function Card({ title, description, icon, action, className, children }: CardProps) {
  const hasHeader = title || icon || action
  return (
    <section className={cn('card', className)}>
      {hasHeader && (
        <header className="card__header">
          {icon && <div className="card__icon">{icon}</div>}
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {description && <p className="card__description">{description}</p>}
          </div>
          {action && <div className="card__action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
