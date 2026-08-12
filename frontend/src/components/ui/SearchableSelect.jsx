import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'

function getDropdownPosition(triggerRect) {
  const viewportPadding = 12
  const gap = 8
  const estimatedHeight = 320
  const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding
  const spaceAbove = triggerRect.top - viewportPadding
  const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow
  const maxHeight = Math.max(160, Math.min(estimatedHeight, placeAbove ? spaceAbove - gap : spaceBelow - gap))
  const top = placeAbove
    ? Math.max(viewportPadding, triggerRect.top - maxHeight - gap)
    : triggerRect.bottom + gap
  const width = Math.min(triggerRect.width, window.innerWidth - viewportPadding * 2)
  const left = Math.min(
    Math.max(viewportPadding, triggerRect.left),
    window.innerWidth - width - viewportPadding
  )

  return { top, left, width, maxHeight }
}

export default function SearchableSelect({ label, options = [], value, onChange, placeholder = 'Выберите...' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState(null)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  const selected = options.find(option => String(option.value) === String(value))

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = normalizedSearch
    ? options.filter(option => String(option.label).toLowerCase().includes(normalizedSearch))
    : options

  const updatePosition = useMemo(() => () => {
    if (!triggerRef.current) return
    setDropdownStyle(getDropdownPosition(triggerRef.current.getBoundingClientRect()))
  }, [])

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      updatePosition()
      document.addEventListener('mousedown', handlePointerDown)
      document.addEventListener('keydown', handleKeyDown)
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  const handleSelect = (nextValue) => {
    onChange(nextValue)
    setIsOpen(false)
    setSearch('')
  }

  const dropdown = isOpen && dropdownStyle && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[130] flex flex-col overflow-hidden rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.98))] shadow-[0_24px_60px_rgba(15,23,40,0.16)] dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.98),rgba(12,18,28,0.98))] md:rounded-[24px]"
          style={{
            top: dropdownStyle.top,
            left: dropdownStyle.left,
            width: dropdownStyle.width,
            maxHeight: dropdownStyle.maxHeight,
          }}
        >
          <div className="sticky top-0 flex items-center gap-2 border-b border-border/70 bg-inherit px-3.5 py-2.5 md:px-4 md:py-3">
            <Search size={14} className="text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Поиск..."
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto p-2" style={{ maxHeight: dropdownStyle.maxHeight - 52 }}>
            {filtered.map(option => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full rounded-[18px] px-3 py-2 text-left text-sm transition-colors md:rounded-2xl md:py-2.5 ${
                  String(option.value) === String(value)
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-text hover:bg-subtle'
                }`}
              >
                {option.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-text-muted">Ничего не найдено</div>
            )}
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="mb-1.5 block text-[13px] font-semibold text-text md:mb-2 md:text-sm">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex min-h-11 w-full items-center justify-between rounded-[20px] border border-border/80 bg-surface/86 px-3.5 py-2.5 text-left text-sm text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all hover:bg-surface focus-visible:border-primary/70 focus-visible:shadow-[0_0_0_4px_rgba(34,80,255,0.12)] md:min-h-12 md:px-4 md:py-3"
      >
        <span className={selected ? '' : 'text-text-muted'}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`ml-2 shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdown}
    </div>
  )
}
