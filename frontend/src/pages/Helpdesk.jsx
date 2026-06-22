import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { RefreshCw, Pencil, Trash2, Search } from 'lucide-react'

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

const priorityOptions = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
]

const emptyForm = { subject: '', description: '', priority: 'medium', status: 'open' }

export default function Helpdesk() {
  const [tickets, setTickets] = useState([])
  const [filters, setFilters] = useState({ status: '', priority: '', source: '', search: '' })
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
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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

  const statusOptions = [{ value: '', label: 'Все статусы' }, ...Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))]
  const filterPriorityOptions = [{ value: '', label: 'Все приоритеты' }, ...Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))]
  const sourceOptions = [{ value: '', label: 'Все источники' }, ...Object.entries(sourceLabels).map(([k, v]) => ({ value: k, label: v }))]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Хелпдеск</h1>
        <p className="text-text-muted">Обращения клиентов и сотрудников</p>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} options={statusOptions} />
          <Select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} options={filterPriorityOptions} />
          <Select value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })} options={sourceOptions} />
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по теме, описанию, заявителю..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            className="w-full sm:w-80"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border text-left text-sm text-text-muted">
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">Тема</th>
                <th className="pb-3 font-medium">Статус</th>
                <th className="pb-3 font-medium">Приоритет</th>
                <th className="pb-3 font-medium">Источник</th>
                <th className="pb-3 font-medium">Заявитель</th>
                <th className="pb-3 font-medium">Создан</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {tickets.map(t => (
                <tr key={t.id} className="border-b border-border hover:bg-subtle">
                  <td className="py-3 text-text-muted">#{t.id}</td>
                  <td className="py-3 font-medium text-text">{t.subject}</td>
                  <td className="py-3"><Badge variant={statusBadgeVariant[t.status]}>{statusLabels[t.status]}</Badge></td>
                  <td className="py-3 text-text">{priorityLabels[t.priority]}</td>
                  <td className="py-3 text-text">{sourceLabels[t.source]}</td>
                  <td className="py-3 text-text">{t.requester_name || '—'}</td>
                  <td className="py-3 text-text-muted">{new Date(t.created_at).toLocaleString('ru')}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      {user?.is_manager && t.status !== 'closed' && (
                        <Button size="sm" variant="secondary" onClick={() => convertToTask(t.id)}>
                          <RefreshCw size={14} className="mr-1" />
                          В задачу
                        </Button>
                      )}
                      <button
                        onClick={() => openEdit(t)}
                        className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                        title="Изменить"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors"
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
            onChange={e => setForm({ ...form, subject: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows="4"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Приоритет"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={priorityOptions}
            />
            <Select
              label="Статус"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))}
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
