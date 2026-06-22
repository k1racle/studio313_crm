export default function Input({ label, icon, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-text mb-1.5">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={`w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
            icon ? 'pl-9' : ''
          }`}
          {...props}
        />
      </div>
    </div>
  )
}
