import { useEffect, useRef, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'

export default function SearchableSelect({ label, options = [], value, onChange, placeholder = 'Выберите...' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  const selected = options.find(o => String(o.value) === String(value))

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

  const handleSelect = (val) => {
    onChange(val)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-text mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text text-left focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors flex items-center justify-between"
      >
        <span className={selected ? '' : 'text-text-muted'}>{selected?.label || placeholder}</span>
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
            {filtered.map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-subtle transition-colors ${
                  String(opt.value) === String(value) ? 'bg-primary/10 text-primary' : 'text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-text-muted text-sm">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
