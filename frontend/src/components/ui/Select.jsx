export default function Select({ label, options = [], className = '', selectClassName = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="mb-2 block text-sm font-semibold text-text">{label}</label>}
      <select
        className={`w-full rounded-2xl border border-border/80 bg-surface/86 px-4 py-3 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition-all focus:border-primary/70 focus:bg-surface focus:shadow-[0_0_0_4px_rgba(34,80,255,0.12)] ${selectClassName}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}
