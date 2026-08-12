export default function Select({ label, options = [], className = '', selectClassName = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-[13px] font-semibold text-text md:mb-2 md:text-sm">{label}</label>}
      <select
        className={`min-h-11 w-full rounded-[20px] border border-border/80 bg-surface/86 px-3.5 py-2.5 text-sm text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition-all focus:border-primary/70 focus:bg-surface focus:shadow-[0_0_0_4px_rgba(34,80,255,0.12)] md:min-h-12 md:px-4 md:py-3 ${selectClassName}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}
