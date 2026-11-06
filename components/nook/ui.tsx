import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('sketch bg-card p-4 sm:p-5', className)} {...props} />
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'icon'

const variants: Record<ButtonVariant, string> = {
  primary: 'sketch-sm bg-primary text-primary-foreground hover:brightness-105',
  secondary: 'sketch-sm bg-secondary text-foreground hover:bg-accent',
  ghost: 'rounded-xl text-foreground hover:bg-secondary',
  danger: 'rounded-xl text-destructive hover:bg-destructive/10',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  icon: 'size-9',
}

export function NookButton({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-bold transition-all active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:size-4',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export const inputClass =
  'sketch-sm w-full bg-background/70 px-3 py-2 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function IconBlob({
  icon: Icon,
  className,
}: {
  icon: LucideIcon
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'blob inline-flex size-10 shrink-0 items-center justify-center border-2 border-border bg-accent text-foreground',
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={2.25} />
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <IconBlob icon={icon} className="size-14 bg-secondary [&_svg]:size-6" />
      <p className="font-display text-xl text-foreground">{title}</p>
      {children ? <p className="max-w-xs text-sm text-muted-foreground">{children}</p> : null}
    </div>
  )
}

export function PillToggle({
  active,
  className,
  ...props
}: ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-border px-3 py-1 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active ? 'bg-foreground text-card' : 'bg-card text-foreground hover:bg-secondary',
        className,
      )}
      {...props}
    />
  )
}
