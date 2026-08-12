export default function Input({ label, icon, className = '', inputClassName = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="mb-2 block text-sm font-semibold text-text">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          className={`w-full rounded-2xl border border-border/80 bg-surface/86 px-4 py-3 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition-all placeholder:text-text-muted/80 focus:border-primary/70 focus:bg-surface focus:shadow-[0_0_0_4px_rgba(180,76,45,0.12)] ${
            icon ? 'pl-11' : ''
          } ${inputClassName}`}
          {...props}
        />
      </div>
    </div>
  )
}
