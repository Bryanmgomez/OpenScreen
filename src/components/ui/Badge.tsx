import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={cn('badge', tone !== 'neutral' && `badge--${tone}`)}>{children}</span>
}
