import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, X } from 'lucide-react'

import api from '../api/axios'

export default function GlobalSearch({ compact = false }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKeyDown = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(value => !value)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    if (query.trim().length < 2) {
      setGroups([])
      return undefined
    }
    const timeout = setTimeout(() => {
      setLoading(true)
      api.get('/analytics/search/', { params: { q: query.trim() } })
        .then(res => setGroups(res.data.groups || []))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [query])

  const openResult = item => {
    setOpen(false)
    setQuery('')
    if (/^https?:\/\//.test(item.href) || item.href.startsWith('/media/')) window.open(item.href, '_blank', 'noopener,noreferrer')
    else navigate(item.href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact
          ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface/80 text-text-muted hover:text-primary'
          : 'flex h-11 items-center gap-2 rounded-full border border-border/70 bg-surface/80 px-4 text-sm text-text-muted hover:border-primary/30 hover:text-text'}
        aria-label="Глобальный поиск"
      >
        <Search size={17} />
        {!compact && <><span>Найти в CRM</span><kbd className="ml-3 rounded-md bg-subtle px-2 py-1 text-[10px]">Ctrl K</kbd></>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[rgba(7,11,18,0.5)] px-3 pt-[8vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Глобальный поиск" className="flex max-h-[78dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-border bg-surface shadow-[0_30px_100px_rgba(0,0,0,0.3)]" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search size={20} className="shrink-0 text-primary" />
              <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-base text-text outline-none" placeholder="Клиент, телефон, проект, файл, платёж или сообщение" />
              <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-subtle hover:text-text" aria-label="Закрыть"><X size={18} /></button>
            </div>
            <div className="min-h-32 flex-1 overflow-y-auto overscroll-contain p-3">
              {query.trim().length < 2 ? (
                <div className="px-3 py-10 text-center text-sm text-text-muted">Введите минимум два символа</div>
              ) : loading ? (
                <div className="px-3 py-10 text-center text-sm text-text-muted">Ищем…</div>
              ) : groups.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-text-muted">Ничего не найдено</div>
              ) : groups.map(group => (
                <div key={group.key} className="mb-4 last:mb-0">
                  <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{group.label}</div>
                  {group.items.map(item => (
                    <button key={`${group.key}-${item.id}`} type="button" onClick={() => openResult(item)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-subtle">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText size={16} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-text">{item.title}</span>
                        {item.subtitle && <span className="mt-0.5 block truncate text-xs text-text-muted">{item.subtitle}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
