export default function Card({ children, className = '', bodyClassName = '', title, action, eyebrow, ...props }) {
  return (
    <section
      className={`soft-panel overflow-hidden rounded-[28px] ${className}`}
      {...props}
    >
      {(title || action || eyebrow) && (
        <div className="border-b border-border/70 px-6 py-5 md:px-7">
          {eyebrow && <div className="kicker mb-2">{eyebrow}</div>}
          <div className="flex items-center justify-between gap-3">
            {title && <h3 className="text-xl font-semibold text-text">{title}</h3>}
            {action && <div>{action}</div>}
          </div>
        </div>
      )}
      <div className={`p-6 md:p-7 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
