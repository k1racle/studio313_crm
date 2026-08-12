export default function Badge({ children, variant = 'gray', className = '' }) {
  const variants = {
    gray: 'bg-[rgba(15,23,40,0.06)] text-text border-[rgba(15,23,40,0.1)]',
    blue: 'bg-[rgba(34,80,255,0.12)] text-[color:#2449c7] border-[rgba(34,80,255,0.18)]',
    green: 'bg-[rgba(21,143,104,0.12)] text-[color:#137153] border-[rgba(21,143,104,0.18)]',
    yellow: 'bg-[rgba(184,134,11,0.12)] text-[color:#916f12] border-[rgba(184,134,11,0.18)]',
    orange: 'bg-[rgba(29,42,65,0.12)] text-[color:#33517f] border-[rgba(29,42,65,0.16)]',
    red: 'bg-[rgba(195,65,76,0.12)] text-[color:#9c3340] border-[rgba(195,65,76,0.18)]',
    purple: 'bg-[rgba(74,95,184,0.12)] text-[color:#475ab0] border-[rgba(74,95,184,0.18)]',
    pink: 'bg-[rgba(63,123,242,0.12)] text-[color:#3159bc] border-[rgba(63,123,242,0.18)]',
    cyan: 'bg-[rgba(49,113,214,0.12)] text-[color:#2f63bf] border-[rgba(49,113,214,0.18)]',
    indigo: 'bg-[rgba(17,35,87,0.12)] text-[color:#23397d] border-[rgba(17,35,87,0.16)]',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
