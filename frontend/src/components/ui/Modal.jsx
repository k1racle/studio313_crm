import { useEffect } from 'react'
import { X } from 'lucide-react'

const sizeClasses = {
  md: 'max-w-xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', headerActions = null }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[rgba(7,11,18,0.48)] backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full ${sizeClasses[size]} transform flex-col border-l border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,246,255,0.98))] shadow-[var(--panel-shadow-strong)] transition-transform duration-300 ease-out dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.98),rgba(10,15,24,0.98))] ${
          isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
      >
        {(title || onClose) && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-6 py-5 md:px-7">
            <div className="min-w-0">
              {title && <h3 className="truncate text-2xl font-semibold text-text">{title}</h3>}
            </div>
            {headerActions && <div className="ml-auto flex items-center gap-2">{headerActions}</div>}
            <button
              onClick={onClose}
              className="shrink-0 rounded-full border border-border/70 bg-surface/78 p-2.5 text-text-muted hover:bg-subtle hover:text-text"
              title="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6 md:p-7">{children}</div>
      </aside>
    </>
  )
}
