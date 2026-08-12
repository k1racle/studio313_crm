export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-[1px]'
  const variants = {
    primary: 'bg-[linear-gradient(135deg,var(--primary),#5b7cff)] text-white shadow-[0_14px_34px_rgba(34,80,255,0.26)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(34,80,255,0.34)]',
    secondary: 'border border-border/80 bg-surface/88 text-text shadow-[0_10px_24px_rgba(15,23,40,0.08)] hover:-translate-y-0.5 hover:bg-[color:var(--surface-strong)] hover:shadow-[0_14px_28px_rgba(15,23,40,0.12)]',
    danger: 'bg-[linear-gradient(135deg,var(--danger),#e06f7b)] text-white shadow-[0_14px_34px_rgba(195,65,76,0.22)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(195,65,76,0.3)]',
    ghost: 'bg-transparent text-text-muted hover:bg-surface/72 hover:text-text',
  }
  const sizes = {
    sm: 'min-h-10 px-4 text-sm',
    md: 'min-h-11 px-5 text-sm',
    lg: 'min-h-13 px-7 text-base',
  }

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
