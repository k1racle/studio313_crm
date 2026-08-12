import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export default function SearchableMultiSelect({ label, options = [], value = [], onChange, placeholder = 'Выберите...' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  const selectedSet = new Set(value.map(String))
  const selectedOptions = options.filter(option => selectedSet.has(String(option.value)))

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = normalizedSearch
    ? options.filter(option => String(option.label).toLowerCase().includes(normalizedSearch))
    : options

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleValue = (nextValue) => {
    const stringValue = String(nextValue)
    if (selectedSet.has(stringValue)) {
      onChange(value.filter(item => String(item) !== stringValue))
    } else {
      onChange([...value, nextValue])
    }
  }

  const removeValue = (event, nextValue) => {
    event.stopPropagation()
    const stringValue = String(nextValue)
    onChange(value.filter(item => String(item) !== stringValue))
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="mb-1.5 block text-[13px] font-semibold text-text md:mb-2 md:text-sm">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-11 w-full items-center justify-between rounded-[20px] border border-border/80 bg-surface/86 px-3.5 py-2.5 text-left text-sm text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all hover:bg-surface focus-visible:border-primary/70 focus-visible:shadow-[0_0_0_4px_rgba(34,80,255,0.12)] md:min-h-12 md:px-4 md:py-3"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {selectedOptions.length ? selectedOptions.map(option => (
            <span key={String(option.value)} className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
              {option.label}
              <button
                type="button"
                onClick={event => removeValue(event, option.value)}
                className="text-primary/70 hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          )) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className="ml-2 shrink-0 text-text-muted" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 flex max-h-80 w-full flex-col overflow-hidden rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.98))] shadow-[0_24px_60px_rgba(15,23,40,0.16)] dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.98),rgba(12,18,28,0.98))] md:rounded-[24px]">
          <div className="sticky top-0 flex items-center gap-2 border-b border-border/70 bg-transparent px-3.5 py-2.5 md:px-4 md:py-3">
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
          <div className="max-h-60 overflow-y-auto p-2">
            {filtered.map(option => {
              const isSelected = selectedSet.has(String(option.value))
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-2 text-left text-sm transition-colors md:rounded-2xl md:py-2.5 ${
                    isSelected ? 'bg-primary/10 text-primary' : 'text-text hover:bg-subtle'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <span>{option.label}</span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-text-muted">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
