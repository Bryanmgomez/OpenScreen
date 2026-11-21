import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  children?: ReactNode
}

export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <h2 className="empty__title">{title}</h2>
      <p className="empty__description">{description}</p>
      {children}
    </div>
  )
}
