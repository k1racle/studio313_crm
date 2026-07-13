import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Subtasks from '../components/Subtasks'
import { ArrowLeft, Send, Upload, FileText, Trash2 } from 'lucide-react'
import { formatFullName, formatShortName } from '../utils/format'
import Avatar from '../components/ui/Avatar'

const statusLabels = {
  new: 'Новая',
  shooting: 'Съёмка',
  editing: 'Монтаж',
  review: 'Отсмотр',
  corrections: 'Внесение правок',
  sent_to_client: 'Отправлено клиенту',
}

const statusBadgeVariant = {
  new: 'blue',
  shooting: 'orange',
  editing: 'cyan',
  review: 'purple',
  corrections: 'pink',
  sent_to_client: 'green',
}

export default function ProductionDetail({ id: propId, isPanel = false, onClose, onLoad }) {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const id = propId || routeId
  const [item, setItem] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [file, setFile] = useState(null)

  const loadProduction = async () => {
    if (!id) return
    try {
      const res = await api.get(`/production/${id}/`)
      setItem(res.data)
      onLoad?.(res.data)
    } catch (err) {
      console.error('Ошибка загрузки производства:', err)
      alert('Не удалось загрузить производство')
    }
  }

  useEffect(() => {
    loadProduction()
  }, [id])

  const updateStatus = async (status) => {
    await api.patch(`/production/${id}/`, { status })
    loadProduction()
  }

  const addComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    await api.post(`/production/${id}/comments/`, { text: commentText })
    setCommentText('')
    loadProduction()
  }

  const uploadFile = async (e) => {
    e.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post(`/production/${id}/attachments/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFile(null)
      loadProduction()
    } catch (err) {
      console.error('Ошибка загрузки файла:', err)
      alert('Не удалось загрузить файл')
    }
  }

  const deleteAttachment = async (attachmentId) => {
    if (!confirm('Удалить файл?')) return
    await api.delete(`/production/attachments/${attachmentId}/`)
    loadProduction()
  }

  if (!item) return <div className="p-8 text-center text-text-muted">Загрузка...</div>

  return (
    <div className="space-y-6">
      {!isPanel && (
        <div className="flex items-start justify-between gap-4">
          <Button variant="secondary" onClick={() => navigate('/production')}>
            <ArrowLeft size={16} className="mr-1.5" />
            Назад к производству
          </Button>
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className={`font-bold text-text break-words ${isPanel ? 'text-xl' : 'text-2xl'}`}>{item.title}</h1>
              <Badge variant={statusBadgeVariant[item.status]}>{statusLabels[item.status]}</Badge>
            </div>
            {item.project && (
              <div className="text-primary font-medium">{item.project.name}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-subtle rounded-lg">
            <div className="text-xs text-text-muted uppercase">Клиент</div>
            <div className="font-medium text-text">{item.client?.name || '—'}</div>
          </div>
          <div className="p-3 bg-subtle rounded-lg">
            <div className="text-xs text-text-muted uppercase">Исполнители</div>
            <div className="flex flex-wrap items-center gap-2 font-medium text-text">
              {item.assignees?.length ? item.assignees.map(u => (
                <span key={u.id} className="inline-flex items-center gap-1.5">
                  <Avatar user={u} size={24} />
                  <span>{formatShortName(u)}</span>
                </span>
              )) : 'Не назначены'}
            </div>
          </div>
          <div className="p-3 bg-subtle rounded-lg">
            <div className="text-xs text-text-muted uppercase">Срок</div>
            <div className="font-medium text-text">{item.due_date ? new Date(item.due_date).toLocaleDateString('ru') : 'Не указан'}</div>
          </div>
          <div className="p-3 bg-subtle rounded-lg">
            <div className="text-xs text-text-muted uppercase">Создал</div>
            <div className="font-medium text-text">{item.creator ? formatShortName(item.creator) : '—'}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-text-muted uppercase mb-2">Описание</h3>
          <p className="text-text whitespace-pre-wrap">{item.description || 'Нет описания'}</p>
        </div>

        <Card title="Подзадачи" className="mb-6">
          <Subtasks
            parentId={id}
            listEndpoint={`/production/${id}/subtasks/`}
            detailEndpointPrefix="/production/subtasks"
          />
        </Card>

        <div>
          <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Сменить статус</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusLabels).map(([s, label]) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  item.status === s
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Вложения">
          <form onSubmit={uploadFile} className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-subtle hover:bg-hover text-text rounded-lg border border-border transition-colors">
                <Upload size={16} />
                <span>Выбрать файл</span>
                <input
                  type="file"
                  onChange={e => setFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-text-muted truncate">
                {file ? file.name : 'Файл не выбран'}
              </span>
            </div>
            <div className="self-start">
              <Button type="submit" disabled={!file} size="sm">
                <Upload size={16} className="mr-1.5" />
                Загрузить
              </Button>
            </div>
          </form>
          <div className="space-y-2">
            {Array.isArray(item.attachments) && item.attachments.map(a => {
              const fileUrl = a.file || ''
              const fileName = typeof fileUrl === 'string' ? fileUrl.split('/').pop() : (a.name || 'Файл')
              return (
                <div key={a.id} className="flex items-center justify-between p-3 bg-subtle rounded-lg gap-3">
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline truncate">
                    <FileText size={16} />
                    <span className="truncate">{fileName || 'Файл'}</span>
                  </a>
                  <Button variant="danger" size="sm" onClick={() => deleteAttachment(a.id)}>
                    <Trash2 size={14} className="mr-1" />
                    Удалить
                  </Button>
                </div>
              )
            })}
            {!item.attachments?.length && <div className="text-sm text-text-muted">Нет вложений</div>}
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
            {item.comments?.map(c => (
              <div key={c.id} className="p-3 bg-subtle rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-text">{formatFullName(c.author)}</span>
                  <span className="text-xs text-text-muted">{new Date(c.created_at).toLocaleString('ru')}</span>
                </div>
                <p className="text-sm text-text">{c.text}</p>
              </div>
            ))}
            {!item.comments?.length && <div className="text-sm text-text-muted">Нет комментариев</div>}
          </div>
        </Card>
      </div>
    </div>
  )
}
