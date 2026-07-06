import { useEffect, useRef, useState } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

export default function SearchableMultiSelect({ label, options = [], value = [], onChange, placeholder = 'Выберите...' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  const selectedSet = new Set(value.map(String))
  const selectedOptions = options.filter(o => selectedSet.has(String(o.value)))

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = normalizedSearch
    ? options.filter(o => String(o.label).toLowerCase().includes(normalizedSearch))
    : options

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleValue = (val) => {
    const strVal = String(val)
    if (selectedSet.has(strVal)) {
      onChange(value.filter(v => String(v) !== strVal))
    } else {
      onChange([...value, val])
    }
  }

  const removeValue = (e, val) => {
    e.stopPropagation()
    const strVal = String(val)
    onChange(value.filter(v => String(v) !== strVal))
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-text mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text text-left focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors flex items-center justify-between min-h-[2.5rem]"
      >
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {selectedOptions.length ? selectedOptions.map(opt => (
            <span key={String(opt.value)} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-subtle rounded text-xs">
              {opt.label}
              <button
                type="button"
                onClick={e => removeValue(e, opt.value)}
                className="text-text-muted hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          )) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className="text-text-muted shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-72 overflow-hidden flex flex-col">
          <div className="sticky top-0 bg-surface border-b border-border px-3 py-2 flex items-center gap-2">
            <Search size={14} className="text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-transparent text-sm text-text focus:outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-56">
            {filtered.map(opt => {
              const isSelected = selectedSet.has(String(opt.value))
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => toggleValue(opt.value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-subtle transition-colors flex items-center gap-2 ${
                    isSelected ? 'bg-primary/10 text-primary' : 'text-text'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded border-border"
                  />
                  {opt.label}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-text-muted text-sm">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
