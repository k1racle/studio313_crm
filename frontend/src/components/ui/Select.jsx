export default function Select({ label, options = [], className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-text mb-1.5">{label}</label>}
      <select
        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
