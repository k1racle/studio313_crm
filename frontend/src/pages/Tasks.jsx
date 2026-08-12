import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'

import api from '../api/axios'
import KanbanBoard from '../components/KanbanBoard'
import GanttChart from '../components/GanttChart'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect'
import SearchableSelect from '../components/ui/SearchableSelect'
import Select from '../components/ui/Select'
import { useAuth } from '../contexts/AuthContext'
import TaskDetail from '../pages/TaskDetail'
import { downloadExport } from '../utils/export'
import { formatShortName } from '../utils/format'

const statusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  approval: 'На согласовании',
  review: 'На проверке',
  content_placement: 'Выкладка контента',
  done: 'Выполнена',
  canceled: 'Отменена',
}

const statusBadgeVariant = {
  new: 'blue',
  in_progress: 'yellow',
  approval: 'pink',
  review: 'purple',
  content_placement: 'indigo',
  done: 'green',
  canceled: 'gray',
}

const statusBorderColor = {
  new: 'border-blue-500',
  in_progress: 'border-amber-400',
  approval: 'border-pink-500',
  review: 'border-violet-500',
  content_placement: 'border-indigo-500',
  done: 'border-emerald-500',
  canceled: 'border-slate-400',
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
  assignee_ids: [],
  project_id: '',
  client_id: '',
  due_date: '',
  tag_ids: [],
  member_ids: [],
}

function formatYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getCalendarDays(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const startDay = (start.getDay() + 6) % 7
  const days = []
  const prevEnd = new Date(year, month, 0)

  for (let i = startDay - 1; i >= 0; i -= 1) {
    days.push(new Date(year, month - 1, prevEnd.getDate() - i))
  }

  const monthEnd = new Date(year, month + 1, 0)
  for (let i = 1; i <= monthEnd.getDate(); i += 1) {
    days.push(new Date(year, month, i))
  }

  const tail = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= tail; i += 1) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

function normalizeTaskStatus(status) {
  if (status === 'shooting' || status === 'editing') {
    return 'in_progress'
  }
  return status
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
    assignees: '',
    project: searchParams.get('project') || '',
    search: '',
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
    if (filters.assignees) params.assignees = filters.assignees
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
      assignee_ids: task.assignees?.map(assignee => assignee.id) || [],
      project_id: task.project?.id || '',
      client_id: task.client?.id || '',
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      tag_ids: task.tags?.map(tag => tag.id) || [],
      member_ids: task.members?.map(member => member.id) || [],
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      assignee_ids: form.assignee_ids,
      project_id: form.project_id || null,
      client_id: form.client_id || null,
      due_date: form.due_date ? `${form.due_date}T00:00:00` : null,
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

  const handleExport = async () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.assignees) params.assignees = filters.assignees
    if (filters.project) params.project = filters.project
    if (filters.search) params.search = filters.search
    if (showArchived) params.archived = '1'

    try {
      await downloadExport('/tasks/export/', params, 'tasks.xlsx')
    } catch (err) {
      console.error('Ошибка выгрузки задач:', err)
      alert('Не удалось выгрузить задачи')
    }
  }

  const userOptions = [{ value: '', label: 'Все исполнители' }, ...users.map(item => ({ value: item.id, label: formatShortName(item) }))]
  const projectOptions = [{ value: '', label: 'Все проекты' }, ...projects.map(item => ({ value: item.id, label: item.name }))]
  const clientOptions = [{ value: '', label: 'Без клиента' }, ...clients.map(item => ({ value: item.id, label: item.name }))]
  const statusOptions = [{ value: '', label: 'Все статусы' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]
  const priorityOptions = [
    { value: '', label: 'Все приоритеты' },
    { value: 'low', label: 'Низкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'high', label: 'Высокий' },
    { value: 'critical', label: 'Критический' },
  ]

  const totalTasks = tasks.length
  const activeTasks = tasks.filter(task => !['done', 'canceled'].includes(normalizeTaskStatus(task.status))).length
  const overdueTasks = tasks.filter(task => task.due_date && new Date(task.due_date) < new Date() && !['done', 'canceled'].includes(normalizeTaskStatus(task.status))).length

  return (
    <div className="space-y-6">
      <section className="soft-panel overflow-hidden rounded-[34px]">
        <div className="flex flex-col gap-6 px-6 py-7 md:px-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="kicker text-primary">Task board</div>
            <h1 className="page-title mt-3 text-text">Задачи</h1>
            <p className="page-subtitle mt-4">
              Kanban, Gantt, календарь и список задач в одном рабочем контуре.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-[24px] border border-border/70 bg-surface/70 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,40,0.05)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Всего</div>
              <div className="mt-1 text-2xl font-semibold text-text">{totalTasks}</div>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-surface/70 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,40,0.05)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Активные</div>
              <div className="mt-1 text-2xl font-semibold text-text">{activeTasks}</div>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-surface/70 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,40,0.05)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Просрочены</div>
              <div className="mt-1 text-2xl font-semibold text-danger">{overdueTasks}</div>
            </div>
            {user?.is_manager && (
              <Button onClick={openCreate} className="self-start">
                <Plus size={16} />
                Новая задача
              </Button>
            )}
          </div>
        </div>
      </section>

      <Card className="overflow-hidden" bodyClassName="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'kanban', label: 'Kanban' },
            { key: 'gantt', label: 'Gantt' },
            { key: 'calendar', label: 'Календарь' },
            { key: 'list', label: 'Список' },
          ].map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                view === item.key
                  ? 'bg-primary text-white shadow-[0_12px_24px_rgba(34,80,255,0.22)]'
                  : 'bg-subtle/80 text-text-muted hover:bg-subtle hover:text-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_repeat(4,minmax(0,0.8fr))]">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по названию, описанию или тегам..."
            value={filters.search}
            onChange={event => setFilters({ ...filters, search: event.target.value })}
          />
          <Select value={filters.project} onChange={event => setFilters({ ...filters, project: event.target.value })} options={projectOptions} />
          {view !== 'kanban' ? (
            <Select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })} options={statusOptions} />
          ) : (
            <div className="hidden xl:block" />
          )}
          <Select value={filters.priority} onChange={event => setFilters({ ...filters, priority: event.target.value })} options={priorityOptions} />
          <SearchableSelect value={filters.assignees} onChange={value => setFilters({ ...filters, assignees: value })} options={userOptions} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={event => setShowArchived(event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Показать архив
          </label>

          <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} />
            Excel
          </Button>
        </div>
      </Card>

      {view === 'kanban' && <KanbanBoard tasks={tasks} onTaskMoved={loadTasks} onTaskClick={openDetail} />}

      {view === 'gantt' && <GanttChart tasks={tasks} onTaskClick={openDetail} />}

      {view === 'list' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full table-fixed">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-[0.14em] text-text-muted">
                  <th className="pb-4 font-semibold w-14">ID</th>
                  <th className="pb-4 font-semibold w-40">Проект</th>
                  <th className="pb-4 font-semibold w-40">Клиент</th>
                  <th className="pb-4 font-semibold w-72">Название</th>
                  <th className="pb-4 font-semibold w-28">Статус</th>
                  <th className="pb-4 font-semibold w-24">Приоритет</th>
                  <th className="pb-4 font-semibold w-48">Исполнители</th>
                  <th className="pb-4 font-semibold w-28">Срок</th>
                  <th className="pb-4 font-semibold w-28" />
                </tr>
              </thead>
              <tbody className="text-sm">
                {tasks.map(task => {
                  const normalizedStatus = normalizeTaskStatus(task.status)
                  return (
                    <tr key={task.id} className={`border-b border-border/60 align-top transition-colors hover:bg-subtle/35 ${task.is_archived ? 'opacity-60' : ''}`}>
                      <td className="py-4 text-text-muted">#{task.id}</td>
                      <td className="py-4">{task.project?.name || '—'}</td>
                      <td className="py-4">{task.client?.name || '—'}</td>
                      <td className="py-4">
                        <button
                          onClick={() => openDetail(task.id)}
                          className="text-left font-semibold leading-6 text-text hover:text-primary"
                        >
                          {task.title}
                        </button>
                        {task.tags?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {task.tags.map(tag => (
                              <span key={tag.id} className="rounded-full px-2 py-1 text-[11px] font-medium text-white" style={{ backgroundColor: tag.color }}>
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4"><Badge variant={statusBadgeVariant[normalizedStatus]}>{statusLabels[normalizedStatus]}</Badge></td>
                      <td className="py-4">{priorityLabels[task.priority]}</td>
                      <td className="py-4">
                        {task.assignees?.length ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.assignees.slice(0, 2).map(assignee => (
                              <span key={assignee.id} className="inline-flex items-center gap-1.5 rounded-full bg-subtle/90 px-2 py-1 text-xs" title={formatShortName(assignee)}>
                                <Avatar user={assignee} size={18} />
                                <span className="truncate max-w-[90px]">{formatShortName(assignee)}</span>
                              </span>
                            ))}
                            {task.assignees.length > 2 && <span className="text-xs text-text-muted">+{task.assignees.length - 2}</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-4 text-text-muted">{task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : '—'}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          {user?.is_manager && (
                            <>
                              <button
                                onClick={() => openEdit(task)}
                                className="rounded-full p-2 text-text-muted hover:bg-subtle hover:text-primary"
                                title="Изменить"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => toggleArchive(task)}
                                className="rounded-full p-2 text-text-muted hover:bg-subtle hover:text-primary"
                                title={task.is_archived ? 'Восстановить' : 'В архив'}
                              >
                                {task.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                              </button>
                              <button
                                onClick={() => handleDelete(task)}
                                className="rounded-full p-2 text-text-muted hover:bg-subtle hover:text-danger"
                                title="Удалить"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === 'calendar' && (
        <Card className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="flex items-center justify-between border-b border-border/70 px-2 pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(date => new Date(date.getFullYear(), date.getMonth() - 1, 1))}
                  className="rounded-full border border-border/70 bg-surface/70 p-2 text-text-muted hover:bg-subtle hover:text-text"
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 className="brand-display min-w-[190px] text-center text-2xl capitalize text-text">
                  {currentMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(date => new Date(date.getFullYear(), date.getMonth() + 1, 1))}
                  className="rounded-full border border-border/70 bg-surface/70 p-2 text-text-muted hover:bg-subtle hover:text-text"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Сегодня
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 overflow-hidden rounded-[24px] border border-border/70">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="border-b border-border/60 bg-subtle/60 px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {day}
                </div>
              ))}

              {getCalendarDays(currentMonth).map((date, idx) => {
                const ymd = formatYMD(date)
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                const isToday = ymd === formatYMD(new Date())
                const dayTasks = tasks.filter(task => task.due_date && formatYMD(new Date(task.due_date)) === ymd)

                return (
                  <div
                    key={idx}
                    onDragOver={event => {
                      event.preventDefault()
                      event.currentTarget.classList.add('bg-primary/5')
                    }}
                    onDragLeave={event => {
                      event.currentTarget.classList.remove('bg-primary/5')
                    }}
                    onDrop={async (event) => {
                      event.preventDefault()
                      event.currentTarget.classList.remove('bg-primary/5')
                      const taskId = event.dataTransfer.getData('task/id')
                      if (!taskId) return

                      const task = tasks.find(item => String(item.id) === taskId)
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
                    className={`min-h-[164px] border-b border-r border-border/60 p-3 transition-colors ${
                      isCurrentMonth ? 'bg-surface/88' : 'bg-subtle/30'
                    } ${isToday ? 'ring-1 ring-inset ring-primary bg-primary/5' : ''}`}
                  >
                    <div className={`mb-2 text-right text-xs font-semibold ${isToday ? 'text-primary' : isCurrentMonth ? 'text-text' : 'text-text-muted'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-2">
                      {dayTasks.map(task => {
                        const normalizedStatus = normalizeTaskStatus(task.status)
                        return (
                          <button
                            key={task.id}
                            type="button"
                            draggable
                            onClick={() => openDetail(task.id)}
                            onDragStart={event => event.dataTransfer.setData('task/id', String(task.id))}
                            className={`w-full rounded-[18px] border-l-2 bg-subtle/80 px-3 py-2 text-left text-xs shadow-[0_8px_18px_rgba(15,23,40,0.05)] hover:bg-hover ${statusBorderColor[normalizedStatus] || 'border-slate-400'}`}
                            title={task.title}
                          >
                            <span className="line-clamp-2 leading-5 text-text">{task.title}</span>
                            {task.assignees?.length > 0 && (
                              <span className="mt-2 flex items-center gap-1 text-[10px] text-text-muted">
                                {task.assignees.slice(0, 2).map(assignee => (
                                  <Avatar key={assignee.id} user={assignee} size={14} title={formatShortName(assignee)} />
                                ))}
                                {task.assignees.length > 2 && <span>+{task.assignees.length - 2}</span>}
                              </span>
                            )}
                          </button>
                        )
                      })}
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
            onChange={event => setForm({ ...form, project_id: event.target.value })}
            options={[{ value: '', label: 'Без проекта' }, ...projects.map(item => ({ value: item.id, label: item.name }))]}
          />
          <SearchableSelect
            label="Клиент"
            value={form.client_id}
            onChange={value => setForm({ ...form, client_id: value })}
            options={clientOptions}
          />
          <Input label="Название" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required />
          <div>
            <label className="mb-2 block text-sm font-semibold text-text">Описание</label>
            <textarea
              value={form.description}
              onChange={event => setForm({ ...form, description: event.target.value })}
              className="w-full rounded-2xl border border-border/80 bg-surface/86 px-4 py-3 text-text outline-none transition-all focus:border-primary/70 focus:bg-surface focus:shadow-[0_0_0_4px_rgba(34,80,255,0.12)]"
              rows="4"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Приоритет"
              value={form.priority}
              onChange={event => setForm({ ...form, priority: event.target.value })}
              options={priorityOptions.filter(option => option.value !== '')}
            />
            <Input label="Срок выполнения" type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} />
          </div>
          <SearchableMultiSelect
            label="Исполнители"
            value={form.assignee_ids}
            onChange={value => setForm({ ...form, assignee_ids: value })}
            options={users.map(item => ({ value: item.id, label: formatShortName(item) }))}
          />
          <SearchableMultiSelect
            label="Теги"
            value={form.tag_ids}
            onChange={value => setForm({ ...form, tag_ids: value })}
            options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
          />
          <SearchableMultiSelect
            label="Участники"
            value={form.member_ids}
            onChange={value => setForm({ ...form, member_ids: value })}
            options={users.map(item => ({ value: item.id, label: formatShortName(item) }))}
          />
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
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleEditDetail} title="Редактировать">
                <Pencil size={16} />
                <span className="hidden sm:inline">Редактировать</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleArchiveDetail} title={detailTask.is_archived ? 'Восстановить' : 'В архив'}>
                {detailTask.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                <span className="hidden sm:inline">{detailTask.is_archived ? 'Восстановить' : 'В архив'}</span>
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteDetail} title="Удалить">
                <Trash2 size={16} />
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
