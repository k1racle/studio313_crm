import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, CalendarDays, CheckCircle2, CircleDollarSign,
  ClipboardCheck, Headphones, RefreshCw,
} from 'lucide-react'

import api from '../api/axios'

const sections = [
  { key: 'overdue_tasks', label: 'Просроченные задачи', icon: AlertCircle, tone: 'text-danger bg-danger/10' },
  { key: 'approvals', label: 'Ждут согласования', icon: ClipboardCheck, tone: 'text-primary bg-primary/10' },
  { key: 'tickets', label: 'Открытые обращения', icon: Headphones, tone: 'text-warning bg-warning/10' },
  { key: 'bookings', label: 'Ближайшие записи', icon: CalendarDays, tone: 'text-info bg-info/10' },
  { key: 'payments', label: 'Ожидаемые оплаты', icon: CircleDollarSign, tone: 'text-success bg-success/10' },
]

function itemMeta(section, item) {
  if (section === 'overdue_tasks') return item.due_date ? `Срок ${new Date(item.due_date).toLocaleDateString('ru-RU')}` : ''
  if (section === 'approvals') return item.client
  if (section === 'tickets') return item.requester || 'Без имени'
  if (section === 'bookings') return `${item.client} · ${new Date(item.start_time).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
  if (section === 'payments') return `${Number(item.amount).toLocaleString('ru-RU')} ₽ · ${new Date(item.due_date).toLocaleDateString('ru-RU')}`
  return ''
}

export default function WorkdayOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    api.get('/analytics/workday/')
      .then(res => setData(res.data))
      .catch(() => setError('Не удалось загрузить рабочий день'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const total = useMemo(() => sections.reduce((sum, section) => sum + (data?.[section.key]?.length || 0), 0), [data])

  return (
    <section className="soft-panel overflow-hidden rounded-[28px]">
      <div className="border-b border-border/70 px-5 py-5 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="kicker text-primary">Сегодня в фокусе</div>
            <h2 className="mt-1 text-2xl font-semibold text-text">Мой рабочий день</h2>
            <p className="mt-1 text-sm text-text-muted">Всё, что требует решения или внимания в ближайшее время.</p>
          </div>
          <button type="button" onClick={load} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:text-primary" aria-label="Обновить">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="px-6 py-8 text-sm text-danger">{error}</div>
      ) : loading && !data ? (
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5 md:p-6">
          {sections.map(section => <div key={section.key} className="h-36 animate-pulse rounded-2xl bg-subtle" />)}
        </div>
      ) : total === 0 ? (
        <div className="flex items-center gap-3 px-6 py-8 text-sm text-text-muted">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success/10 text-success"><CheckCircle2 size={20} /></span>
          На сегодня срочных действий нет.
        </div>
      ) : (
        <div className="grid divide-y divide-border/70 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
          {sections.map(section => {
            const Icon = section.icon
            const items = data?.[section.key] || []
            return (
              <div key={section.key} className="min-w-0 p-4 md:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${section.tone}`}><Icon size={17} /></span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text">{section.label}</div>
                    <div className="text-xs text-text-muted">{items.length}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {items.length ? items.slice(0, 4).map(item => (
                    <Link key={item.id} to={item.href} className="block min-h-11 rounded-xl px-2.5 py-2 hover:bg-subtle">
                      <div className="truncate text-sm font-medium text-text">{item.title}</div>
                      <div className="mt-0.5 truncate text-xs text-text-muted">{itemMeta(section.key, item)}</div>
                    </Link>
                  )) : <div className="px-2.5 py-2 text-xs text-text-muted">Ничего нет</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
