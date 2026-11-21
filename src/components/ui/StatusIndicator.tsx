import { cn } from '@/utils/cn'

export type StatusTone = 'idle' | 'pending' | 'recording' | 'success' | 'error'

interface StatusIndicatorProps {
  tone: StatusTone
  label: string
}

export function StatusIndicator({ tone, label }: StatusIndicatorProps) {
  return (
    <span className="status" role="status">
      <span className={cn('status__dot', `status__dot--${tone}`)} aria-hidden="true" />
      {label}
    </span>
  )
}
