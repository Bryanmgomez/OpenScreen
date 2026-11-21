import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  large?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  large = false,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', `btn--${variant}`, large && 'btn--lg', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
