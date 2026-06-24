import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import KanbanBoard from '../components/KanbanBoard'
import GanttChart from '../components/GanttChart'
import TaskDetail from '../pages/TaskDetail'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import { Plus, Pencil, Trash2, Search, Archive, RotateCcw } from 'lucide-react'
import { formatFullName, formatShortName } from '../utils/format'
import Avatar from '../components/ui/Avatar'

const statusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Выполнена',
  canceled: 'Отменена',
}

const statusBadgeVariant = {
  new: 'blue',
  in_progress: 'yellow',
  review: 'purple',
  done: 'green',
  canceled: 'gray',
}

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
}

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium',
  assignee_id: '',
  project_id: '',
  client_id: '',
  due_date: '',
  tag_ids: [],
}

export default function Tasks() {
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [tags, setTags] = useState([])
  const [view, setView] = useState('kanban')
  const [showArchived, setShowArchived] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    project: searchParams.get('project') || '',
    search: ''
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState(null)
  const [detailTask, setDetailTask] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    const taskId = searchParams.get('task')
    if (taskId) {
      openDetail(taskId)
    }
  }, [searchParams])

  const loadTasks = async () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.assignee) params.assignee = filters.assignee
    if (filters.project) params.project = filters.project
    if (filters.search) params.search = filters.search
    if (showArchived) params.archived = '1'
    const res = await api.get('/tasks/', { params })
    setTasks(res.data.results || res.data)
  }

  useEffect(() => {
    loadTasks()
    if (user?.is_manager) {
      api.get('/auth/users/').then(res => setUsers(res.data.results || res.data))
      api.get('/clients/').then(res => setClients(res.data.results || res.data))
    }
    api.get('/projects/').then(res => setProjects(res.data.results || res.data))
    api.get('/tags/').then(res => setTags(res.data.results || res.data))
  }, [user])

  useEffect(() => {
    const timeout = setTimeout(loadTasks, 300)
    return () => clearTimeout(timeout)
  }, [filters, showArchived])

  const openCreate = () => {
    setEditingTask(null)
    setForm({ ...emptyForm, project_id: filters.project })
    setIsModalOpen(true)
  }

  const openDetail = (id) => {
    setDetailTaskId(id)
    setDetailTask(null)
    setDetailOpen(true)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailTaskId(null)
    setDetailTask(null)
  }

  const handleDeleteDetail = async () => {
    if (!detailTask || !confirm(`Удалить задачу «${detailTask.title}»?`)) return
    await api.delete(`/tasks/${detailTask.id}/`)
    closeDetail()
    loadTasks()
  }

  const handleArchiveDetail = async () => {
    if (!detailTask) return
    await api.patch(`/tasks/${detailTask.id}/`, { is_archived: !detailTask.is_archived })
    closeDetail()
    loadTasks()
  }

  const handleEditDetail = () => {
    if (!detailTask) return
    closeDetail()
    openEdit(detailTask)
  }

  const openEdit = (task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignee_id: task.assignee?.id || '',
      project_id: task.project?.id || '',
      client_id: task.client?.id || '',
      due_date: task.due_date ? task.due_date.slice(0, 16) : '',
      tag_ids: task.tags?.map(t => t.id) || [],
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      assignee_id: form.assignee_id || null,
      project_id: form.project_id || null,
      client_id: form.client_id || null,
      due_date: form.due_date || null,
    }
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}/`, payload)
      } else {
        await api.post('/tasks/', payload)
      }
      setForm(emptyForm)
      setEditingTask(null)
      setIsModalOpen(false)
      await loadTasks()
    } catch (err) {
      console.error('Ошибка сохранения задачи:', err)
      alert('Не удалось сохранить задачу. Проверьте данные и попробуйте снова.')
    }
  }

  const handleDelete = async (task) => {
    if (!confirm(`Удалить задачу «${task.title}»?`)) return
    await api.delete(`/tasks/${task.id}/`)
    loadTasks()
  }

  const toggleArchive = async (task) => {
    await api.patch(`/tasks/${task.id}/`, { is_archived: !task.is_archived })
    loadTasks()
  }

  const userOptions = [{ value: '', label: 'Все исполнители' }, ...users.map(u => ({ value: u.id, label: formatFullName(u) }))]
  const projectOptions = [{ value: '', label: 'Все проекты' }, ...projects.map(p => ({ value: p.id, label: p.name }))]
  const clientOptions = [{ value: '', label: 'Без клиента' }, ...clients.map(c => ({ value: c.id, label: c.name }))]
  const statusOptions = [{ value: '', label: 'Все статусы' }, ...Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))]
  const priorityOptions = [
    { value: '', label: 'Все приоритеты' },
    { value: 'low', label: 'Низкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'high', label: 'Высокий' },
    { value: 'critical', label: 'Критический' },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Задачи</h1>
          <p className="text-text-muted">Kanban, Gantt и список задач</p>
        </div>
        {user?.is_manager && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Новая задача
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2 bg-subtle p-1 rounded-lg">
            {['kanban', 'gantt', 'list'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === v ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                {v === 'kanban' ? 'Kanban' : v === 'gantt' ? 'Gantt' : 'Список'}
              </button>
            ))}
          </div>
          <Select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })} options={projectOptions} />
          {view !== 'kanban' && <Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} options={statusOptions} />}
          <Select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} options={priorityOptions} />
          <Select value={filters.assignee} onChange={e => setFilters({ ...filters, assignee: e.target.value })} options={userOptions} />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input
              icon={<Search size={16} />}
              placeholder="Поиск..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="w-full sm:w-64"
            />
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              Показать архив
            </label>
          </div>
        </div>
      </Card>

      {view === 'kanban' && <KanbanBoard tasks={tasks} onTaskMoved={loadTasks} onTaskClick={openDetail} />}

      {view === 'gantt' && <GanttChart tasks={tasks} onTaskClick={openDetail} />}

      {view === 'list' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border text-left text-sm text-text-muted">
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Проект</th>
                  <th className="pb-3 font-medium">Клиент</th>
                  <th className="pb-3 font-medium">Название</th>
                  <th className="pb-3 font-medium">Статус</th>
                  <th className="pb-3 font-medium">Приоритет</th>
                  <th className="pb-3 font-medium">Исполнитель</th>
                  <th className="pb-3 font-medium">Срок</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {tasks.map(task => (
                  <tr key={task.id} className={`border-b border-border hover:bg-subtle ${task.is_archived ? 'opacity-60' : ''}`}>
                    <td className="py-3 text-text-muted">#{task.id}</td>
                    <td className="py-3">{task.project?.name || '—'}</td>
                    <td className="py-3">{task.client?.name || '—'}</td>
                    <td className="py-3">
                      <button
                        onClick={() => openDetail(task.id)}
                        className="font-medium text-text hover:text-primary text-left block"
                      >
                        {task.title}
                      </button>
                      {task.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map(tag => (
                            <span key={tag.id} className="px-1.5 py-0.5 rounded-full text-[10px] text-white" style={{ backgroundColor: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3"><Badge variant={statusBadgeVariant[task.status]}>{statusLabels[task.status]}</Badge></td>
                    <td className="py-3">{priorityLabels[task.priority]}</td>
                    <td className="py-3">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar user={task.assignee} size={24} />
                          <span>{formatShortName(task.assignee)}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 text-text-muted">{task.due_date ? new Date(task.due_date).toLocaleDateString('ru') : '—'}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {user?.is_manager && (
                          <>
                            <button
                              onClick={() => openEdit(task)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                              title="Изменить"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => toggleArchive(task)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                              title={task.is_archived ? 'Восстановить' : 'В архив'}
                            >
                              {task.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                            </button>
                            <button
                              onClick={() => handleDelete(task)}
                              className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'Изменить задачу' : 'Новая задача'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Проект"
            value={form.project_id}
            onChange={e => setForm({ ...form, project_id: e.target.value })}
            options={[{ value: '', label: 'Без проекта' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
          />
          <Select
            label="Клиент"
            value={form.client_id}
            onChange={e => setForm({ ...form, client_id: e.target.value })}
            options={clientOptions}
          />
          <Input label="Название" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows="3"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Приоритет"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={priorityOptions.filter(o => o.value !== '')}
            />
            <Select
              label="Исполнитель"
              value={form.assignee_id}
              onChange={e => setForm({ ...form, assignee_id: e.target.value })}
              options={[{ value: '', label: 'Не назначен' }, ...users.map(u => ({ value: u.id, label: formatFullName(u) }))]}
            />
          </div>
          <Input label="Срок выполнения" type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Теги</label>
            <select
              multiple
              value={form.tag_ids}
              onChange={e => {
                const options = Array.from(e.target.selectedOptions).map(o => Number(o.value))
                setForm({ ...form, tag_ids: options })
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              style={{ minHeight: '6rem' }}
            >
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingTask ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={detailOpen}
        onClose={closeDetail}
        title={`Задача #${detailTaskId}`}
        size="xl"
        headerActions={
          detailTask && user?.is_manager ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleEditDetail}>
                <Pencil size={16} className="mr-1.5" />
                Редактировать
              </Button>
              <Button variant="secondary" size="sm" onClick={handleArchiveDetail}>
                {detailTask.is_archived ? <RotateCcw size={16} className="mr-1.5" /> : <Archive size={16} className="mr-1.5" />}
                {detailTask.is_archived ? 'Восстановить' : 'В архив'}
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteDetail}>
                <Trash2 size={16} className="mr-1.5" />
                Удалить
              </Button>
            </div>
          ) : null
        }
      >
        <TaskDetail
          id={detailTaskId}
          isPanel
          onClose={closeDetail}
          onDelete={loadTasks}
          onLoad={setDetailTask}
        />
      </Modal>
    </div>
  )
}
