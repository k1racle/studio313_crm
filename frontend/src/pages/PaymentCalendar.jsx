import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  BellRing,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
  TriangleAlert,
  WalletCards,
} from 'lucide-react'

import api from '../api/axios'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect'
import Select from '../components/ui/Select'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'

const frequencyOptions = [
  { value: 'once', label: 'Разово' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'quarterly', label: 'Ежеквартально' },
  { value: 'yearly', label: 'Ежегодно' },
]

const statusMeta = {
  scheduled: { label: 'Запланирован', card: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100', dot: 'bg-blue-500' },
  paid: { label: 'Оплачен', card: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100', dot: 'bg-emerald-500' },
  overdue: { label: 'Просрочен', card: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100', dot: 'bg-rose-500' },
  skipped: { label: 'Пропущен', card: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200', dot: 'bg-slate-400' },
}

const emptyForm = {
  title: '',
  counterparty: '',
  purpose: '',
  amount: '',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  frequency: 'once',
  end_date: '',
  reminder_days: 3,
  memo_recipient: 'ИП Батагову А.А.',
  responsible_ids: [],
  is_active: true,
}

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

function formatMoney(value) {
  return `${moneyFormatter.format(Number(value || 0))} ₽`
}

function getErrorMessage(error) {
  const data = error?.response?.data
  if (!data) return 'Не удалось выполнить операцию.'
  if (typeof data.detail === 'string') return data.detail
  return Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' | ')
}

function SummaryCard({ icon: Icon, label, value, note, tone }) {
  const tones = {
    blue: 'from-blue-500 to-indigo-500 shadow-blue-500/20',
    green: 'from-emerald-500 to-green-500 shadow-emerald-500/20',
    red: 'from-rose-500 to-red-500 shadow-rose-500/20',
    amber: 'from-amber-400 to-orange-500 shadow-amber-500/20',
  }

  return (
    <Card bodyClassName="p-4 md:p-5">
      <div className="flex items-center gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-bold tabular-nums text-text md:text-2xl">{value}</div>
          <div className="mt-0.5 text-xs font-medium text-text-muted">{label}</div>
          {note && <div className="mt-1 truncate text-[10px] text-text-muted/75">{note}</div>}
        </div>
      </div>
    </Card>
  )
}

function OccurrencePill({ occurrence, compact = false, onClick }) {
  const meta = statusMeta[occurrence.effective_status] || statusMeta.scheduled
  return (
    <button
      type="button"
      onClick={() => onClick(occurrence)}
      className={`w-full rounded-lg border px-2 py-1.5 text-left shadow-[0_4px_12px_rgba(15,23,40,0.05)] transition-transform hover:-translate-y-0.5 ${meta.card}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
        <span className="min-w-0 flex-1 truncate text-[10px] font-bold">{occurrence.plan.title}</span>
        <span className="shrink-0 text-[9px] font-bold tabular-nums">{formatMoney(occurrence.amount)}</span>
      </div>
      {!compact && <div className="mt-1 truncate pl-3 text-[9px] opacity-65">{occurrence.plan.counterparty}</div>}
    </button>
  )
}

export default function PaymentCalendar() {
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [plans, setPlans] = useState([])
  const [occurrences, setOccurrences] = useState([])
  const [summary, setSummary] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selectedOccurrence, setSelectedOccurrence] = useState(null)

  const gridStart = useMemo(() => startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), [month])
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(month), { weekStartsOn: 1 }), [month])
  const calendarDays = useMemo(() => {
    const days = []
    const cursor = new Date(gridStart)
    while (cursor <= gridEnd) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }, [gridEnd, gridStart])

  const load = async () => {
    setLoading(true)
    try {
      const [occurrencesResponse, summaryResponse, plansResponse, usersResponse] = await Promise.all([
        api.get('/payments/calendar/occurrences/', { params: { from: format(gridStart, 'yyyy-MM-dd'), to: format(gridEnd, 'yyyy-MM-dd') } }),
        api.get('/payments/calendar/summary/', { params: { month: format(month, 'yyyy-MM-dd') } }),
        api.get('/payments/calendar/plans/'),
        api.get('/auth/users/'),
      ])
      setOccurrences(occurrencesResponse.data.results || occurrencesResponse.data)
      setSummary(summaryResponse.data)
      setPlans(plansResponse.data.results || plansResponse.data)
      setUsers(usersResponse.data.results || usersResponse.data)
    } catch (error) {
      alert(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [month])

  const openCreate = (date = new Date()) => {
    setEditingPlan(null)
    setForm({ ...emptyForm, start_date: format(date, 'yyyy-MM-dd'), responsible_ids: [] })
    setFormOpen(true)
  }

  const openEdit = (plan) => {
    setEditingPlan(plan)
    setForm({
      title: plan.title,
      counterparty: plan.counterparty,
      purpose: plan.purpose,
      amount: plan.amount,
      start_date: plan.start_date,
      frequency: plan.frequency,
      end_date: plan.end_date || '',
      reminder_days: plan.reminder_days,
      memo_recipient: plan.memo_recipient,
      responsible_ids: plan.responsible.map(user => user.id),
      is_active: plan.is_active,
    })
    setSelectedOccurrence(null)
    setFormOpen(true)
  }

  const submitPlan = async (event) => {
    event.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      amount: Number(form.amount),
      reminder_days: Number(form.reminder_days),
      end_date: form.frequency === 'once' || !form.end_date ? null : form.end_date,
    }
    try {
      if (editingPlan) await api.put(`/payments/calendar/plans/${editingPlan.id}/`, payload)
      else await api.post('/payments/calendar/plans/', payload)
      setFormOpen(false)
      await load()
    } catch (error) {
      alert(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const deletePlan = async () => {
    if (!editingPlan || !window.confirm(`Удалить план «${editingPlan.title}» и все его будущие платежи?`)) return
    try {
      await api.delete(`/payments/calendar/plans/${editingPlan.id}/`)
      setFormOpen(false)
      await load()
    } catch (error) {
      alert(getErrorMessage(error))
    }
  }

  const changeOccurrenceStatus = async (occurrence, status) => {
    try {
      const response = await api.post(`/payments/calendar/occurrences/${occurrence.id}/status/`, { status })
      setSelectedOccurrence(response.data)
      await load()
    } catch (error) {
      alert(getErrorMessage(error))
    }
  }

  const downloadMemo = async (occurrence) => {
    try {
      const response = await api.get(`/payments/calendar/occurrences/${occurrence.id}/memo/`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `Служебная записка — ${occurrence.plan.title} — ${format(parseISO(occurrence.due_date), 'dd.MM.yyyy')}.docx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(getErrorMessage(error))
    }
  }

  const headerActions = useMemo(() => (
    <Button onClick={() => openCreate(new Date())}>
      <Plus size={16} />
      Новый платеж
    </Button>
  ), [])
  usePageHeaderContent(headerActions)

  const occurrencesByDate = useMemo(() => {
    const grouped = new Map()
    occurrences.forEach(occurrence => {
      const items = grouped.get(occurrence.due_date) || []
      items.push(occurrence)
      grouped.set(occurrence.due_date, items)
    })
    return grouped
  }, [occurrences])

  const userOptions = users.map(user => ({
    value: user.id,
    label: [user.last_name, user.first_name, user.patronymic].filter(Boolean).join(' ') || user.username,
  }))
  const nearest = summary?.upcoming?.[0]

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard icon={WalletCards} label="Запланировано за месяц" value={formatMoney(summary?.planned_amount)} note={format(month, 'LLLL yyyy', { locale: ru })} tone="blue" />
        <SummaryCard icon={Check} label="Уже оплачено" value={formatMoney(summary?.paid_amount)} note="В выбранном месяце" tone="green" />
        <SummaryCard icon={TriangleAlert} label="Просрочено" value={formatMoney(summary?.overdue_amount)} note={`${summary?.overdue_count || 0} обязательств`} tone="red" />
        <SummaryCard icon={CalendarClock} label="Ближайший платеж" value={nearest ? formatMoney(nearest.amount) : '—'} note={nearest ? `${format(parseISO(nearest.due_date), 'd MMMM', { locale: ru })} · ${nearest.plan.title}` : 'Нет запланированных'} tone="amber" />
      </div>

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_18px_55px_rgba(15,23,40,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMonth(startOfMonth(new Date()))} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text hover:border-primary hover:text-primary">Сегодня</button>
              <div className="flex overflow-hidden rounded-xl border border-border">
                <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="grid h-9 w-9 place-items-center text-text-muted hover:bg-subtle hover:text-text"><ChevronLeft size={17} /></button>
                <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="grid h-9 w-9 place-items-center border-l border-border text-text-muted hover:bg-subtle hover:text-text"><ChevronRight size={17} /></button>
              </div>
              <div className="ml-1 text-lg font-bold capitalize text-text">{format(month, 'LLLL yyyy', { locale: ru })}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-text-muted">
              {Object.entries(statusMeta).map(([key, meta]) => (
                <span key={key} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${meta.dot}`} />{meta.label}</span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-7 border-b border-border bg-subtle/45">
                {['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'].map(day => (
                  <div key={day} className="border-r border-border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted last:border-r-0">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const dayOccurrences = occurrencesByDate.get(dateKey) || []
                  const today = isSameDay(day, new Date())
                  return (
                    <div
                      key={dateKey}
                      role="button"
                      tabIndex={0}
                      onDoubleClick={() => openCreate(day)}
                      onKeyDown={event => { if (event.key === 'Enter') openCreate(day) }}
                      className={`min-h-[132px] border-b border-r border-border p-2 last:border-r-0 ${!isSameMonth(day, month) ? 'bg-subtle/25 opacity-55' : 'bg-surface'} ${today ? 'bg-primary/[0.035]' : ''}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <button type="button" onClick={() => openCreate(day)} className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold ${today ? 'bg-primary text-white shadow-[0_6px_14px_rgba(34,80,255,0.25)]' : 'text-text hover:bg-subtle'}`}>{format(day, 'd')}</button>
                        {dayOccurrences.length > 0 && <span className="text-[9px] font-semibold text-text-muted">{dayOccurrences.length}</span>}
                      </div>
                      <div className="space-y-1.5">
                        {dayOccurrences.slice(0, 3).map(occurrence => <OccurrencePill key={occurrence.id} occurrence={occurrence} onClick={setSelectedOccurrence} />)}
                        {dayOccurrences.length > 3 && <div className="px-2 text-[9px] font-semibold text-primary">Ещё {dayOccurrences.length - 3}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          {loading && <div className="border-t border-border px-5 py-3 text-xs text-text-muted">Обновляем календарь…</div>}
        </section>

        <aside className="space-y-4">
          <Card title="Ближайшие оплаты" bodyClassName="space-y-2 p-4">
            {summary?.upcoming?.length ? summary.upcoming.map(occurrence => (
              <button key={occurrence.id} type="button" onClick={() => setSelectedOccurrence(occurrence)} className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-subtle/30 p-3 text-left hover:border-primary/40 hover:bg-primary/[0.04]">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-center text-primary">
                  <div><div className="text-sm font-extrabold leading-none">{format(parseISO(occurrence.due_date), 'd')}</div><div className="mt-0.5 text-[8px] font-bold uppercase">{format(parseISO(occurrence.due_date), 'MMM', { locale: ru })}</div></div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-text">{occurrence.plan.title}</div>
                  <div className="mt-1 truncate text-[10px] text-text-muted">{occurrence.plan.counterparty}</div>
                </div>
                <div className="shrink-0 text-xs font-bold tabular-nums text-text">{formatMoney(occurrence.amount)}</div>
              </button>
            )) : <div className="py-6 text-center text-xs text-text-muted">Ближайших платежей нет</div>}
          </Card>

          <Card title="Регулярные платежи" bodyClassName="space-y-2 p-4">
            {plans.filter(plan => plan.frequency !== 'once' && plan.is_active).slice(0, 6).map(plan => (
              <button key={plan.id} type="button" onClick={() => openEdit(plan)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-subtle">
                <Repeat2 size={15} className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-text">{plan.title}</div><div className="text-[10px] text-text-muted">{plan.frequency_display}</div></div>
                <span className="text-[10px] font-bold text-text">{formatMoney(plan.amount)}</span>
              </button>
            ))}
            {!plans.some(plan => plan.frequency !== 'once' && plan.is_active) && <div className="py-5 text-center text-xs text-text-muted">Регулярных платежей пока нет</div>}
          </Card>
        </aside>
      </div>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingPlan ? 'Изменить план платежа' : 'Новый план платежа'} size="lg">
        <form onSubmit={submitPlan} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Название" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Например, аренда студии" required />
            <Input label="Получатель / контрагент" value={form.counterparty} onChange={event => setForm({ ...form, counterparty: event.target.value })} placeholder="ООО «Аренда»" required />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-text">За что платим</span>
            <textarea value={form.purpose} onChange={event => setForm({ ...form, purpose: event.target.value })} rows={3} className="w-full rounded-[20px] border border-border/80 bg-surface/86 px-4 py-3 text-sm text-text outline-none focus:border-primary/70 focus:ring-4 focus:ring-primary/10" placeholder="Назначение, договор, период или проект" required />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Сумма, ₽" type="number" min="0.01" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} required />
            <Input label="Первая дата оплаты" type="date" value={form.start_date} onChange={event => setForm({ ...form, start_date: event.target.value })} required />
            <Select label="Периодичность" value={form.frequency} onChange={event => setForm({ ...form, frequency: event.target.value })} options={frequencyOptions} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {form.frequency !== 'once' && <Input label="Повторять до" type="date" value={form.end_date} onChange={event => setForm({ ...form, end_date: event.target.value })} />}
            <Input label="Напомнить за дней" type="number" min="0" max="90" value={form.reminder_days} onChange={event => setForm({ ...form, reminder_days: event.target.value })} />
            <Input label="Адресат служебной записки" value={form.memo_recipient} onChange={event => setForm({ ...form, memo_recipient: event.target.value })} />
          </div>
          <SearchableMultiSelect label="Ответственные за оплату" options={userOptions} value={form.responsible_ids} onChange={value => setForm({ ...form, responsible_ids: value })} placeholder="Если не выбрать — все менеджеры" />
          {editingPlan && (
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-subtle/35 p-4 text-sm text-text">
              <input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} />
              Активный план — создавать новые платежи и отправлять напоминания
            </label>
          )}
          <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
            <div>{editingPlan && <Button type="button" variant="danger" onClick={deletePlan}><Trash2 size={15} />Удалить план</Button>}</div>
            <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Отмена</Button><Button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button></div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(selectedOccurrence)} onClose={() => setSelectedOccurrence(null)} title={selectedOccurrence?.plan.title || 'Плановый платеж'}>
        {selectedOccurrence && (
          <div className="space-y-4">
            <div className={`rounded-[24px] border p-5 ${statusMeta[selectedOccurrence.effective_status]?.card || statusMeta.scheduled.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-xs font-semibold opacity-65">Сумма к оплате</div><div className="mt-1 text-3xl font-extrabold tabular-nums">{formatMoney(selectedOccurrence.amount)}</div></div>
                <span className="rounded-full bg-white/65 px-3 py-1 text-[10px] font-bold dark:bg-black/20">{statusMeta[selectedOccurrence.effective_status]?.label}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold"><CalendarClock size={15} />До {format(parseISO(selectedOccurrence.due_date), 'd MMMM yyyy', { locale: ru })}</div>
            </div>
            <div className="grid gap-3 rounded-[24px] border border-border bg-subtle/30 p-4 text-sm">
              <div><div className="text-xs text-text-muted">Контрагент</div><div className="mt-1 font-semibold text-text">{selectedOccurrence.plan.counterparty}</div></div>
              <div><div className="text-xs text-text-muted">Назначение</div><div className="mt-1 leading-relaxed text-text">{selectedOccurrence.plan.purpose}</div></div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-text-muted">Периодичность</div><div className="mt-1 font-medium text-text">{selectedOccurrence.plan.frequency_display}</div></div>
                <div><div className="text-xs text-text-muted">Напоминание</div><div className="mt-1 font-medium text-text">За {selectedOccurrence.plan.reminder_days} дн.</div></div>
              </div>
            </div>
            <button type="button" onClick={() => downloadMemo(selectedOccurrence)} className="flex w-full items-center gap-3 rounded-[22px] border border-primary/25 bg-primary/[0.055] p-4 text-left hover:border-primary/50 hover:bg-primary/[0.09]">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white"><FileText size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-text">Служебная записка готова</span><span className="mt-1 block text-xs text-text-muted">Сформирована по шаблону в формате DOCX</span></span>
              <Download size={18} className="text-primary" />
            </button>
            <div className="flex flex-wrap gap-2">
              {selectedOccurrence.status !== 'paid' && <Button onClick={() => changeOccurrenceStatus(selectedOccurrence, 'paid')}><Check size={15} />Отметить оплаченным</Button>}
              {selectedOccurrence.status !== 'scheduled' && <Button variant="secondary" onClick={() => changeOccurrenceStatus(selectedOccurrence, 'scheduled')}><BellRing size={15} />Вернуть в план</Button>}
              {selectedOccurrence.status === 'scheduled' && <Button variant="secondary" onClick={() => changeOccurrenceStatus(selectedOccurrence, 'skipped')}>Пропустить</Button>}
              <Button variant="ghost" onClick={() => openEdit(selectedOccurrence.plan)}><Pencil size={15} />Изменить план</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
