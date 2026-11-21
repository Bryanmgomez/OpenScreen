import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  label: string
  children: ReactNode
}

export function IconButton({ label, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cn('icon-btn', className)} {...rest}>
      {children}
    </button>
  )
}
