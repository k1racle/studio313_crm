import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, RefreshCw, Search, Trash2 } from 'lucide-react'

import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
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
  const { user } = useAuth()
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

  return (
    <div>
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px_170px_170px] 2xl:grid-cols-[minmax(0,1.15fr)_180px_180px_180px_180px]">
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

      <Card className="overflow-hidden">
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
                      {user?.is_manager && ticket.status !== 'closed' && (
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
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">Сохранить</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
