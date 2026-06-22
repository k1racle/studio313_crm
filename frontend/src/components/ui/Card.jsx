export default function Card({ children, className = '', title, action, ...props }) {
  return (
    <div className={`bg-surface rounded-xl border border-border shadow-sm ${className}`} {...props}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          {title && <h3 className="text-lg font-semibold text-text">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
