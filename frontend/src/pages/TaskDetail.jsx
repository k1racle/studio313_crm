import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import { ArrowLeft, Trash2, Send, Upload, FileText, Clock } from 'lucide-react'
import { formatFullName } from '../utils/format'

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

export default function TaskDetail({ id: propId, isPanel = false, onClose, onDelete }) {
  const { user } = useAuth()
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const id = propId || routeId
  const [task, setTask] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [file, setFile] = useState(null)
  const [timeEntries, setTimeEntries] = useState([])
  const [timeForm, setTimeForm] = useState({ start_time: '', end_time: '', note: '' })

  const loadTask = async () => {
    if (!id) return
    const res = await api.get(`/tasks/${id}/`)
    setTask(res.data)
  }

  const loadTimeEntries = async () => {
    if (!id) return
    const res = await api.get('/time-entries/', { params: { task: id } })
    setTimeEntries(res.data.results || res.data)
  }

  useEffect(() => {
    loadTask()
    loadTimeEntries()
  }, [id])

  const updateStatus = async (status) => {
    await api.patch(`/tasks/${id}/`, { status })
    loadTask()
  }

  const deleteTask = async () => {
    if (!confirm('Удалить задачу?')) return
    await api.delete(`/tasks/${id}/`)
    if (isPanel) {
      onDelete?.()
      onClose?.()
    } else {
      navigate('/tasks')
    }
  }

  const addComment = async (e) => {
    e.preventDefault()
    await api.post(`/tasks/${id}/comments/`, { text: commentText })
    setCommentText('')
    loadTask()
  }

  const uploadFile = async (e) => {
    e.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    await api.post(`/tasks/${id}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setFile(null)
    loadTask()
  }

  const deleteAttachment = async (attachmentId) => {
    if (!confirm('Удалить файл?')) return
    await api.delete(`/tasks/attachments/${attachmentId}/`)
    loadTask()
  }

  const totalTimeMinutes = timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)

  const addTimeEntry = async (e) => {
    e.preventDefault()
    await api.post('/time-entries/', { ...timeForm, task_id: id })
    setTimeForm({ start_time: '', end_time: '', note: '' })
    loadTimeEntries()
  }

  const deleteTimeEntry = async (entryId) => {
    if (!confirm('Удалить запись времени?')) return
    await api.delete(`/time-entries/${entryId}/`)
    loadTimeEntries()
  }

  if (!task) return <div className="p-8 text-center text-text-muted">Загрузка...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        {!isPanel && (
          <Button variant="secondary" onClick={() => navigate('/tasks')}>
            <ArrowLeft size={16} className="mr-1.5" />
            Назад к задачам
          </Button>
        )}
        {user?.is_manager && (
          <div className={`${isPanel ? 'ml-auto' : ''}`}>
            <Button variant="danger" size="sm" onClick={deleteTask}>
              <Trash2 size={16} className="mr-1.5" />
              Удалить
            </Button>
          </div>
        )}
      </div>

      <Card>
        <div className="flex flex-col gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className={`font-bold text-text break-words ${isPanel ? 'text-xl' : 'text-2xl'}`}>{task.title}</h1>
              <Badge variant={statusBadgeVariant[task.status]}>{statusLabels[task.status]}</Badge>
            </div>
            {task.project && (
              <div className="text-primary font-medium">{task.project.name}</div>
            )}
            {task.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {task.tags.map(tag => (
                  <span key={tag.id} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-subtle rounded-lg">
            <div className="text-xs text-text-muted uppercase">Приоритет</div>
            <div className="font-medium text-text">{priorityLabels[task.priority]}</div>
          </div>
          <div className="p-3 bg-subtle rounded-lg">
            <div className="text-xs text-text-muted uppercase">Исполнитель</div>
            <div className="font-medium text-text">{formatFullName(task.assignee) === '—' ? 'Не назначен' : formatFullName(task.assignee)}</div>
          </div>
          <div className="p-3 bg-subtle rounded-lg">
            <div className="text-xs text-text-muted uppercase">Срок</div>
            <div className="font-medium text-text">{task.due_date ? new Date(task.due_date).toLocaleString('ru') : 'Не указан'}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-text-muted uppercase mb-2">Описание</h3>
          <p className="text-text whitespace-pre-wrap">{task.description || 'Нет описания'}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Сменить статус</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusLabels).map(([s, label]) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  task.status === s
                    ? 'bg-primary text-white'
                    : 'bg-subtle text-text hover:bg-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Таймшит" className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock size={18} className="text-primary" />
          <div className="text-sm text-text-muted">Затрачено на задачу:</div>
          <div className="font-semibold text-text">{Math.floor(totalTimeMinutes / 60)} ч {totalTimeMinutes % 60} мин</div>
        </div>
        <form onSubmit={addTimeEntry} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <Input type="datetime-local" value={timeForm.start_time} onChange={e => setTimeForm({ ...timeForm, start_time: e.target.value })} required />
          <Input type="datetime-local" value={timeForm.end_time} onChange={e => setTimeForm({ ...timeForm, end_time: e.target.value })} required />
          <Input placeholder="Примечание" value={timeForm.note} onChange={e => setTimeForm({ ...timeForm, note: e.target.value })} />
          <Button type="submit">Добавить</Button>
        </form>
        <div className="space-y-2 max-h-48 overflow-auto">
          {timeEntries.map(entry => (
            <div key={entry.id} className="flex items-center justify-between p-2 bg-subtle rounded-lg text-sm">
              <div>
                <span className="text-text">{entry.duration_minutes} мин</span>
                <span className="text-text-muted ml-2">{new Date(entry.start_time).toLocaleString('ru')} — {entry.end_time ? new Date(entry.end_time).toLocaleString('ru') : '—'}</span>
                {entry.note && <span className="text-text-muted ml-2">({entry.note})</span>}
              </div>
              <button onClick={() => deleteTimeEntry(entry.id)} className="p-1 text-text-muted hover:text-danger rounded" title="Удалить">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!timeEntries.length && <div className="text-sm text-text-muted">Нет записей</div>}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Вложения">
          <form onSubmit={uploadFile} className="flex flex-col gap-3 mb-4">
            <input
              type="file"
              onChange={e => setFile(e.target.files[0])}
              className="w-full text-sm text-text overflow-hidden"
            />
            <div className="self-start">
              <Button type="submit" disabled={!file} size="sm">
                <Upload size={16} className="mr-1.5" />
                Загрузить
              </Button>
            </div>
          </form>
          <div className="space-y-2">
            {task.attachments?.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-subtle rounded-lg gap-3">
                <a href={a.file} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline truncate">
                  <FileText size={16} />
                  <span className="truncate">{a.file.split('/').pop()}</span>
                </a>
                <Button variant="danger" size="sm" onClick={() => deleteAttachment(a.id)}>
                  <Trash2 size={14} className="mr-1" />
                  Удалить
                </Button>
              </div>
            ))}
            {!task.attachments?.length && <div className="text-sm text-text-muted">Нет вложений</div>}
          </div>
        </Card>

        <Card title="Комментарии">
          <form onSubmit={addComment} className="mb-4">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Добавить комментарий..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-2"
              rows="3"
              required
            />
            <Button type="submit" size="sm">
              <Send size={16} className="mr-1.5" />
              Отправить
            </Button>
          </form>
          <div className="space-y-3 max-h-[400px] overflow-auto">
            {task.comments?.map(c => (
              <div key={c.id} className="p-3 bg-subtle rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-text">{formatFullName(c.author)}</span>
                  <span className="text-xs text-text-muted">{new Date(c.created_at).toLocaleString('ru')}</span>
                </div>
                <p className="text-sm text-text">{c.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
