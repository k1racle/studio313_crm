export default function Input({ label, icon, className = '', inputClassName = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-[13px] font-semibold text-text md:mb-2 md:text-sm">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted md:left-4">
            {icon}
          </span>
        )}
        <input
          className={`min-h-11 w-full rounded-[20px] border border-border/80 bg-surface/86 px-3.5 py-2.5 text-sm text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition-all placeholder:text-text-muted/80 focus:border-primary/70 focus:bg-surface focus:shadow-[0_0_0_4px_rgba(34,80,255,0.12)] md:min-h-12 md:px-4 md:py-3 ${
            icon ? 'pl-10 md:pl-11' : ''
          } ${inputClassName}`}
          {...props}
        />
      </div>
    </div>
  )
}
