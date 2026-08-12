import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { SlidersHorizontal, X } from 'lucide-react'

export default function MobileFiltersSheet({ open, onClose, title = 'Фильтры', children, footer = null }) {
  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEsc)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
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
        className={`safe-bottom fixed inset-x-0 bottom-0 z-[83] flex max-h-[85dvh] flex-col rounded-t-[30px] border border-border/70 border-b-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,246,255,0.98))] shadow-[var(--panel-shadow-strong)] transition-transform duration-300 ease-out dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.98),rgba(10,15,24,0.98))] ${
          open ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SlidersHorizontal size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Мобильная панель</div>
              <h3 className="truncate text-lg font-semibold text-text">{title}</h3>
            </div>
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

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            {children}
          </div>
        </div>

        {footer ? (
          <div className="border-t border-border/70 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </section>
    </>,
    document.body
  )
}
