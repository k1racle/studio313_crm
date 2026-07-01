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
import SearchableSelect from '../components/ui/SearchableSelect'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import { Plus, Pencil, Trash2, Search, Archive, RotateCcw, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatShortName } from '../utils/format'
import Avatar from '../components/ui/Avatar'

const statusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  shooting: 'Съемка',
  editing: 'Монтаж',
  approval: 'На согласовании',
  review: 'На проверке',
  content_placement: 'Выкладка контента',
  done: 'Выполнена',
  canceled: 'Отменена',
}

const statusBadgeVariant = {
  new: 'blue',
  in_progress: 'yellow',
  shooting: 'orange',
  editing: 'cyan',
  approval: 'pink',
  review: 'purple',
  content_placement: 'indigo',
  done: 'green',
  canceled: 'gray',
}

const statusBorderColor = {
  new: 'border-blue-500',
  in_progress: 'border-yellow-500',
  shooting: 'border-orange-500',
  editing: 'border-cyan-500',
  approval: 'border-pink-500',
  review: 'border-purple-500',
  content_placement: 'border-indigo-500',
  done: 'border-green-500',
  canceled: 'border-gray-500',
}

function formatYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalendarDays(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const startDay = (start.getDay() + 6) % 7
  const days = []
  const prevEnd = new Date(year, month, 0)
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevEnd.getDate() - i))
  }
  const monthEnd = new Date(year, month + 1, 0)
  for (let i = 1; i <= monthEnd.getDate(); i++) {
    days.push(new Date(year, month, i))
  }
  const tail = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= tail; i++) {
    days.push(new Date(year, month + 1, i))
  }
  return days
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
  const [pendingDetailId, setPendingDetailId] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
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
    setPendingDetailId(detailTask.id)
    closeDetail()
    openEdit(detailTask)
  }

  const handleCloseEdit = () => {
    setIsModalOpen(false)
    setEditingTask(null)
    if (pendingDetailId) {
      openDetail(pendingDetailId)
      setPendingDetailId(null)
    }
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
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
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
      due_date: form.due_date ? form.due_date + 'T00:00:00' : null,
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
      if (pendingDetailId) {
        openDetail(pendingDetailId)
        setPendingDetailId(null)
      }
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

  const userOptions = [{ value: '', label: 'Все исполнители' }, ...users.map(u => ({ value: u.id, label: formatShortName(u) }))]
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
          <p className="text-text-muted">Kanban, Gantt, календарь и список задач</p>
        </div>
        {user?.is_manager && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Новая задача
          </Button>
        )}
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-nowrap sm:flex-wrap items-end gap-3 overflow-x-auto pb-2 sm:overflow-visible">
          <div className="flex shrink-0 gap-2 bg-subtle p-1 rounded-lg">
            {['kanban', 'gantt', 'calendar', 'list'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  view === v ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                {v === 'kanban' ? 'Kanban' : v === 'gantt' ? 'Gantt' : v === 'calendar' ? 'Календарь' : 'Список'}
              </button>
            ))}
          </div>
          <div className="shrink-0 w-40">
            <Select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })} options={projectOptions} />
          </div>
          {view !== 'kanban' && (
            <div className="shrink-0 w-36">
              <Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} options={statusOptions} />
            </div>
          )}
          <div className="shrink-0 w-40">
            <Select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} options={priorityOptions} />
          </div>
          <div className="shrink-0 w-44">
            <SearchableSelect value={filters.assignee} onChange={val => setFilters({ ...filters, assignee: val })} options={userOptions} />
          </div>
          <div className="flex shrink-0 items-center gap-3 w-auto">
            <Input
              icon={<Search size={16} />}
              placeholder="Поиск..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="w-48 sm:w-64"
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
            <table className="w-full min-w-[1150px] table-fixed">
              <thead>
                <tr className="border-b border-border text-left text-sm text-text-muted">
                  <th className="pb-3 font-medium w-12">ID</th>
                  <th className="pb-3 font-medium w-36">Проект</th>
                  <th className="pb-3 font-medium w-36">Клиент</th>
                  <th className="pb-3 font-medium w-56">Название</th>
                  <th className="pb-3 font-medium w-24">Статус</th>
                  <th className="pb-3 font-medium w-24">Приоритет</th>
                  <th className="pb-3 font-medium w-44">Исполнитель</th>
                  <th className="pb-3 font-medium w-28">Срок</th>
                  <th className="pb-3 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {tasks.map(task => (
                  <tr key={task.id} className={`border-b border-border hover:bg-subtle ${task.is_archived ? 'opacity-60' : ''}`}>
                    <td className="py-3 text-text-muted">#{task.id}</td>
                    <td className="py-3 truncate">{task.project?.name || '—'}</td>
                    <td className="py-3 truncate">{task.client?.name || '—'}</td>
                    <td className="py-3 align-top">
                      <button
                        onClick={() => openDetail(task.id)}
                        className="font-medium text-text hover:text-primary text-left block whitespace-normal break-words leading-snug"
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

      {view === 'calendar' && (
        <Card className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-1.5 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-lg font-semibold text-text min-w-[170px] text-center capitalize">
                {currentMonth.toLocaleString('ru', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                type="button"
                onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-1.5 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date())}
              className="text-sm text-primary hover:underline"
            >
              Сегодня
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-border bg-subtle">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
              <div key={d} className="px-2 py-2 text-xs font-medium text-text-muted text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getCalendarDays(currentMonth).map((date, idx) => {
              const ymd = formatYMD(date)
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
              const isToday = ymd === formatYMD(new Date())
              const dayTasks = tasks.filter(t => t.due_date && formatYMD(new Date(t.due_date)) === ymd)
              return (
                <div
                  key={idx}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5') }}
                  onDragLeave={e => { e.currentTarget.classList.remove('bg-primary/5') }}
                  onDrop={async (e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('bg-primary/5')
                    const taskId = e.dataTransfer.getData('task/id')
                    if (!taskId) return
                    const task = tasks.find(t => String(t.id) === taskId)
                    if (!task) return
                    const newDue = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
                    try {
                      await api.patch(`/tasks/${task.id}/`, { due_date: newDue.toISOString() })
                      loadTasks()
                    } catch (err) {
                      console.error(err)
                      alert('Не удалось перенести задачу')
                    }
                  }}
                  className={`min-h-[140px] p-2 border-b border-r border-border flex flex-col gap-1 transition-colors ${
                    isCurrentMonth ? 'bg-surface' : 'bg-subtle/50'
                  } ${isToday ? 'ring-1 ring-inset ring-primary bg-primary/5' : ''}`}
                >
                  <div className={`text-xs font-medium text-right ${isToday ? 'text-primary' : isCurrentMonth ? 'text-text' : 'text-text-muted'}`}>
                    {date.getDate()}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                    {dayTasks.map(task => (
                      <button
                        key={task.id}
                        type="button"
                        draggable
                        onClick={() => openDetail(task.id)}
                        onDragStart={e => e.dataTransfer.setData('task/id', String(task.id))}
                        className={`text-left text-xs px-2 py-1 rounded bg-subtle border-l-2 ${statusBorderColor[task.status] || 'border-gray-500'} hover:bg-hover cursor-grab active:cursor-grabbing`}
                        title={task.title}
                      >
                        <span className="line-clamp-2 leading-tight">{task.title}</span>
                        {task.assignee && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] text-text-muted">
                            <Avatar user={task.assignee} size={14} />
                            <span className="truncate">{formatShortName(task.assignee)}</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseEdit} title={editingTask ? 'Изменить задачу' : 'Новая задача'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Проект"
            value={form.project_id}
            onChange={e => setForm({ ...form, project_id: e.target.value })}
            options={[{ value: '', label: 'Без проекта' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
          />
          <SearchableSelect
            label="Клиент"
            value={form.client_id}
            onChange={val => setForm({ ...form, client_id: val })}
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
            <SearchableSelect
              label="Исполнитель"
              value={form.assignee_id}
              onChange={val => setForm({ ...form, assignee_id: val })}
              options={[{ value: '', label: 'Не назначен' }, ...users.map(u => ({ value: u.id, label: formatShortName(u) }))]}
            />
          </div>
          <Input label="Срок выполнения" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
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
            <Button type="button" variant="secondary" onClick={handleCloseEdit}>Отмена</Button>
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
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="secondary" size="sm" onClick={handleEditDetail} title="Редактировать">
                <Pencil size={16} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Редактировать</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleArchiveDetail} title={detailTask.is_archived ? 'Восстановить' : 'В архив'}>
                {detailTask.is_archived ? <RotateCcw size={16} className="sm:mr-1.5" /> : <Archive size={16} className="sm:mr-1.5" />}
                <span className="hidden sm:inline">{detailTask.is_archived ? 'Восстановить' : 'В архив'}</span>
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteDetail} title="Удалить">
                <Trash2 size={16} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Удалить</span>
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
