import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { lockBodyScroll } from '../../utils/bodyScrollLock'

export default function MobileFiltersSheet({ open, onClose, title = 'Фильтры', children, footer = null }) {
  useEffect(() => {
    if (!open) return undefined

    const releaseBodyScroll = lockBodyScroll()

    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEsc)

    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[82] bg-[rgba(7,11,18,0.48)] backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <section
        className={`mobile-filters-shell safe-bottom fixed inset-x-0 bottom-0 z-[83] flex max-h-[85dvh] flex-col rounded-t-[28px] border border-border/70 border-b-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,246,255,0.98))] shadow-[var(--panel-shadow-strong)] transition-transform duration-300 ease-out dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.98),rgba(10,15,24,0.98))] ${
          open ? 'visible pointer-events-auto translate-y-0' : 'invisible pointer-events-none translate-y-[110%]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 md:px-5 md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary md:h-10 md:w-10">
              <SlidersHorizontal size={17} />
            </span>
            <h3 className="truncate text-base font-semibold text-text md:text-lg">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/70 bg-surface/78 p-2.5 text-text-muted hover:bg-subtle hover:text-text"
            title="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          <div className="space-y-3 md:space-y-4">
            {children}
          </div>
        </div>

        {footer ? (
          <div className="border-t border-border/70 px-4 py-3 md:px-5 md:py-4">
            {footer}
          </div>
        ) : null}
      </section>
    </>,
    document.body
  )
}
