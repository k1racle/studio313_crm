import { useEffect } from 'react'
import { X } from 'lucide-react'

const sizeClasses = {
  md: 'max-w-md',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Right sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full ${sizeClasses[size]} bg-surface border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
      >
        {(title || onClose) && (
          <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
            {title && <h3 className="text-lg font-semibold text-text pr-4">{title}</h3>}
            <button
              onClick={onClose}
              className="ml-auto p-2 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
              title="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </>
  )
}
