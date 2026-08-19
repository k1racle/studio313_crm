import { useEffect } from 'react'
import { X } from 'lucide-react'
import { lockBodyScroll } from '../../utils/bodyScrollLock'

const sizeClasses = {
  md: 'md:max-w-xl',
  lg: 'md:max-w-5xl',
  xl: 'md:max-w-6xl',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', headerActions = null }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose()
    }

    if (!isOpen) return undefined

    const releaseBodyScroll = lockBodyScroll()

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      releaseBodyScroll()
    }
  }, [isOpen, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[90] bg-[rgba(7,11,18,0.48)] backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-x-0 bottom-0 top-auto z-[91] flex max-h-[92dvh] w-full transform flex-col rounded-t-[28px] border border-border/70 border-b-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,246,255,0.98))] shadow-[var(--panel-shadow-strong)] transition-transform duration-300 ease-out dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.98),rgba(10,15,24,0.98))] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:rounded-none md:rounded-l-[32px] md:border-b md:border-l md:border-r-0 ${sizeClasses[size]} ${
          isOpen ? 'visible pointer-events-auto translate-y-0 md:translate-x-0' : 'invisible pointer-events-none translate-y-[110%] md:translate-x-full'
        }`}
      >
        {(title || onClose) && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 md:px-6 md:py-5">
            <div className="min-w-0">
              {title && <h3 className="truncate text-lg font-semibold text-text md:text-2xl">{title}</h3>}
            </div>
            {headerActions && <div className="ml-auto flex items-center gap-2">{headerActions}</div>}
            <button
              onClick={onClose}
              className="shrink-0 rounded-full border border-border/70 bg-surface/78 p-2.5 text-text-muted hover:bg-subtle hover:text-text"
              title="Закрыть"
            >
              <X size={18} className="md:h-5 md:w-5" />
            </button>
          </div>
        )}
        <div className="modal-form-shell flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">{children}</div>
      </aside>
    </>
  )
}
