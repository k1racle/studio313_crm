import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, RefreshCw, Search, SlidersHorizontal, Trash2 } from 'lucide-react'

import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import MobileFiltersSheet from '../components/ui/MobileFiltersSheet'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

const statusLabels = {
  open: 'Открыт',
  in_progress: 'В работе',
  waiting: 'Ожидание',
  closed: 'Закрыт',
}

const statusBadgeVariant = {
  open: 'blue',
  in_progress: 'yellow',
  waiting: 'purple',
  closed: 'green',
}

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

const sourceLabels = {
  telegram: 'Telegram',
  form: 'Форма',
  manual: 'Вручную',
}

const categoryLabels = {
  technical: 'Техническая проблема',
  payment: 'Вопрос по оплате',
  manager_help: 'Помощь менеджера',
  other: 'Другое',
}

const categoryBadgeVariant = {
  technical: 'red',
  payment: 'green',
  manager_help: 'blue',
  other: 'gray',
}

const priorityOptions = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
]

const emptyForm = { subject: '', description: '', priority: 'medium', status: 'open', category: 'other' }

export default function Helpdesk() {
  const [tickets, setTickets] = useState([])
  const [filters, setFilters] = useState({ status: '', priority: '', source: '', category: '', search: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const { user } = useAuth()
  const canManage = user?.is_manager || user?.capabilities?.includes('helpdesk.manage')
  const navigate = useNavigate()

  const loadTickets = async () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.source) params.source = filters.source
    if (filters.category) params.category = filters.category
    if (filters.search) params.search = filters.search
    const res = await api.get('/helpdesk/', { params })
    setTickets(res.data.results || res.data)
  }

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(loadTickets, 300)
    return () => clearTimeout(timeout)
  }, [filters])

  const convertToTask = async (id) => {
    if (!confirm('Преобразовать обращение в задачу?')) return
    const res = await api.post(`/helpdesk/${id}/convert/`)
    navigate(`/tasks?task=${res.data.task_id}`)
  }

  const openEdit = (ticket) => {
    setEditingTicket(ticket)
    setForm({
      subject: ticket.subject,
      description: ticket.description || '',
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category || 'other',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await api.put(`/helpdesk/${editingTicket.id}/`, form)
    setIsModalOpen(false)
    setEditingTicket(null)
    setForm(emptyForm)
    loadTickets()
  }

  const handleDelete = async (ticket) => {
    if (!confirm(`Удалить обращение «${ticket.subject}»?`)) return
    await api.delete(`/helpdesk/${ticket.id}/`)
    loadTickets()
  }

  const statusOptions = [{ value: '', label: 'Все статусы' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]
  const filterPriorityOptions = [{ value: '', label: 'Все приоритеты' }, ...Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))]
  const sourceOptions = [{ value: '', label: 'Все источники' }, ...Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))]
  const categoryOptions = [{ value: '', label: 'Все категории' }, ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))]
  const categoryFormOptions = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))
  const activeFilterCount = [filters.status, filters.priority, filters.source, filters.category].filter(Boolean).length

  return (
    <div>
      <Card className="mb-6" bodyClassName="space-y-3">
        <div className="space-y-3 md:hidden">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по теме, описанию, заявителю..."
            value={filters.search}
            onChange={event => setFilters({ ...filters, search: event.target.value })}
          />
          <Button type="button" variant="secondary" className="w-full" onClick={() => setMobileFiltersOpen(true)}>
            <SlidersHorizontal size={16} />
            Фильтры
            {activeFilterCount > 0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="hidden grid-cols-1 gap-3 md:grid xl:grid-cols-[minmax(0,1fr)_170px_170px_170px_170px] 2xl:grid-cols-[minmax(0,1.15fr)_180px_180px_180px_180px]">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по теме, описанию, заявителю..."
            value={filters.search}
            onChange={event => setFilters({ ...filters, search: event.target.value })}
          />
          <Select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })} options={statusOptions} />
          <Select value={filters.priority} onChange={event => setFilters({ ...filters, priority: event.target.value })} options={filterPriorityOptions} />
          <Select value={filters.source} onChange={event => setFilters({ ...filters, source: event.target.value })} options={sourceOptions} />
          <Select value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })} options={categoryOptions} />
        </div>
      </Card>

      <MobileFiltersSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Фильтры обращений"
        footer={(
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setFilters(prev => ({ ...prev, status: '', priority: '', source: '', category: '' }))}
            >
              Сбросить
            </Button>
            <Button type="button" className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
              Применить
            </Button>
          </div>
        )}
      >
        <Select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })} options={statusOptions} />
        <Select value={filters.priority} onChange={event => setFilters({ ...filters, priority: event.target.value })} options={filterPriorityOptions} />
        <Select value={filters.source} onChange={event => setFilters({ ...filters, source: event.target.value })} options={sourceOptions} />
        <Select value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })} options={categoryOptions} />
      </MobileFiltersSheet>

      <div className="space-y-3 md:hidden">
        {tickets.map(ticket => (
          <Card key={ticket.id} bodyClassName="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">#{ticket.id}</div>
                <div className="mt-1 text-base font-semibold text-text">{ticket.subject}</div>
              </div>
              <Badge variant={statusBadgeVariant[ticket.status]}>{statusLabels[ticket.status]}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={categoryBadgeVariant[ticket.category]}>{categoryLabels[ticket.category] || '—'}</Badge>
              <span className="rounded-full bg-subtle/80 px-3 py-1 text-xs text-text">{priorityLabels[ticket.priority]}</span>
              <span className="rounded-full bg-subtle/80 px-3 py-1 text-xs text-text">{sourceLabels[ticket.source]}</span>
            </div>
            <div className="space-y-1 text-sm text-text-muted">
              <div>{ticket.requester_name || '—'}</div>
              <div>{new Date(ticket.created_at).toLocaleString('ru-RU')}</div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && ticket.status !== 'closed' && (
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => convertToTask(ticket.id)}>
                  <RefreshCw size={14} />
                  В задачу
                </Button>
              )}
              <button
                onClick={() => openEdit(ticket)}
                className="rounded-full border border-border/70 bg-surface/75 p-2.5 text-text-muted transition-colors hover:bg-subtle hover:text-primary"
                title="Изменить"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(ticket)}
                className="rounded-full border border-border/70 bg-surface/75 p-2.5 text-text-muted transition-colors hover:bg-subtle hover:text-danger"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border text-left text-sm text-text-muted">
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">Тема</th>
                <th className="pb-3 font-medium">Статус</th>
                <th className="pb-3 font-medium">Приоритет</th>
                <th className="pb-3 font-medium">Категория</th>
                <th className="pb-3 font-medium">Источник</th>
                <th className="pb-3 font-medium">Заявитель</th>
                <th className="pb-3 font-medium">Создан</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="border-b border-border hover:bg-subtle">
                  <td className="py-3 text-text-muted">#{ticket.id}</td>
                  <td className="py-3 font-medium text-text">{ticket.subject}</td>
                  <td className="py-3"><Badge variant={statusBadgeVariant[ticket.status]}>{statusLabels[ticket.status]}</Badge></td>
                  <td className="py-3 text-text">{priorityLabels[ticket.priority]}</td>
                  <td className="py-3"><Badge variant={categoryBadgeVariant[ticket.category]}>{categoryLabels[ticket.category] || '—'}</Badge></td>
                  <td className="py-3 text-text">{sourceLabels[ticket.source]}</td>
                  <td className="py-3 text-text">{ticket.requester_name || '—'}</td>
                  <td className="py-3 text-text-muted">{new Date(ticket.created_at).toLocaleString('ru-RU')}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      {canManage && ticket.status !== 'closed' && (
                        <Button size="sm" variant="secondary" onClick={() => convertToTask(ticket.id)}>
                          <RefreshCw size={14} className="mr-1" />
                          В задачу
                        </Button>
                      )}
                      <button
                        onClick={() => openEdit(ticket)}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-primary"
                        title="Изменить"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(ticket)}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-danger"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Изменить обращение">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Тема"
            value={form.subject}
            onChange={event => setForm({ ...form, subject: event.target.value })}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Описание</label>
            <textarea
              value={form.description}
              onChange={event => setForm({ ...form, description: event.target.value })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows="4"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Приоритет"
              value={form.priority}
              onChange={event => setForm({ ...form, priority: event.target.value })}
              options={priorityOptions}
            />
            <Select
              label="Статус"
              value={form.status}
              onChange={event => setForm({ ...form, status: event.target.value })}
              options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Категория"
              value={form.category}
              onChange={event => setForm({ ...form, category: event.target.value })}
              options={categoryFormOptions}
            />
          </div>
          <div className="modal-actions flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">Сохранить</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
