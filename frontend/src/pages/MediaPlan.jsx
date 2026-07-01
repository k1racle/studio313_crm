import { useEffect, useState, useMemo } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import SearchableSelect from '../components/ui/SearchableSelect'
import Avatar from '../components/ui/Avatar'
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Calendar, Briefcase, ExternalLink } from 'lucide-react'
import { formatShortName } from '../utils/format'
import { Link } from 'react-router-dom'

const platformOptions = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'vk', label: 'VK' },
  { value: 'max', label: 'MAX' },
  { value: 'dzen', label: 'Дзен' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'rutube', label: 'RuTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'site', label: 'Сайт' },
  { value: 'other', label: 'Другое' },
]

const statusOptions = [
  { value: 'draft', label: 'Черновик' },
  { value: 'approval', label: 'На согласовании' },
  { value: 'scheduled', label: 'Запланировано' },
  { value: 'published', label: 'Опубликовано' },
  { value: 'cancelled', label: 'Отменено' },
]

const platformBadgeVariant = {
  telegram: 'blue',
  vk: 'cyan',
  max: 'purple',
  dzen: 'orange',
  youtube: 'red',
  rutube: 'blue',
  instagram: 'pink',
  site: 'green',
  other: 'gray',
}

const statusBadgeVariant = {
  draft: 'gray',
  approval: 'yellow',
  scheduled: 'blue',
  published: 'green',
  cancelled: 'red',
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function formatDateTimeLocalInput(value) {
  if (!value) return ''
  const d = new Date(value)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyForm = {
  title: '',
  description: '',
  platform: 'telegram',
  status: 'draft',
  publish_at: '',
  responsible_id: '',
}

export default function MediaPlan() {
  const { user } = useAuth()
  const [publications, setPublications] = useState([])
  const [users, setUsers] = useState([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPublication, setEditingPublication] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [pendingFiles, setPendingFiles] = useState([])
  const [saving, setSaving] = useState(false)

  const loadPublications = async () => {
    try {
      const res = await api.get('/media-plan/publications/')
      setPublications(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await api.get('/auth/users/')
      setUsers(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadPublications()
    loadUsers()
  }, [])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6)
    const sameMonth = weekStart.getMonth() === end.getMonth()
    const startStr = weekStart.toLocaleDateString('ru', { day: 'numeric', month: 'long' })
    const endStr = end.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
    return sameMonth ? `${startStr} – ${end.toLocaleDateString('ru', { day: 'numeric' })} ${end.toLocaleDateString('ru', { month: 'long', year: 'numeric' })}` : `${startStr} – ${endStr}`
  }, [weekStart])

  const openCreate = () => {
    setEditingPublication(null)
    setForm({
      ...emptyForm,
      publish_at: formatDateTimeLocalInput(new Date()),
    })
    setPendingFiles([])
    setIsModalOpen(true)
  }

  const openEdit = (pub) => {
    setEditingPublication(pub)
    setForm({
      title: pub.title,
      description: pub.description || '',
      platform: pub.platform,
      status: pub.status,
      publish_at: formatDateTimeLocalInput(pub.publish_at),
      responsible_id: pub.responsible?.id || '',
    })
    setPendingFiles([])
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPublication(null)
    setForm(emptyForm)
    setPendingFiles([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        responsible_id: form.responsible_id || null,
      }
      let pub
      if (editingPublication) {
        const res = await api.put(`/media-plan/publications/${editingPublication.id}/`, payload)
        pub = res.data
      } else {
        const res = await api.post('/media-plan/publications/', payload)
        pub = res.data
        setEditingPublication(pub)
      }
      if (pendingFiles.length) {
        for (const item of pendingFiles) {
          const data = new FormData()
          data.append('file', item.file)
          data.append('caption', item.caption)
          await api.post(`/media-plan/publications/${pub.id}/add_attachment/`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
        setPendingFiles([])
        const refreshed = await api.get(`/media-plan/publications/${pub.id}/`)
        setEditingPublication(refreshed.data)
      }
      if (!editingPublication && pendingFiles.length === 0) {
        closeModal()
      }
      loadPublications()
    } catch (err) {
      console.error(err)
      alert('Не удалось сохранить публикацию')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pub) => {
    if (!confirm(`Удалить публикацию «${pub.title}»?`)) return
    try {
      await api.delete(`/media-plan/publications/${pub.id}/`)
      loadPublications()
    } catch (err) {
      console.error(err)
      alert('Не удалось удалить публикацию')
    }
  }

  const handleCreateTask = async (pub) => {
    try {
      const res = await api.post(`/media-plan/publications/${pub.id}/create_task/`)
      loadPublications()
      if (confirm(`Задача #${res.data.id} создана. Открыть?`)) {
        window.open(`/tasks?task=${res.data.id}`, '_blank')
      }
    } catch (err) {
      console.error(err)
      alert('Не удалось создать задачу')
    }
  }

  const handleDeleteAttachment = async (id) => {
    if (!confirm('Удалить вложение?')) return
    try {
      await api.delete(`/media-plan/attachments/${id}/`)
      if (editingPublication) {
        const refreshed = await api.get(`/media-plan/publications/${editingPublication.id}/`)
        setEditingPublication(refreshed.data)
      }
      loadPublications()
    } catch (err) {
      console.error(err)
      alert('Не удалось удалить вложение')
    }
  }

  const addPendingFile = () => {
    const input = document.getElementById('media-plan-file-input')
    if (!input?.files?.[0]) return
    setPendingFiles(prev => [...prev, { file: input.files[0], caption: '' }])
    input.value = ''
  }

  const updatePendingCaption = (idx, caption) => {
    setPendingFiles(prev => prev.map((item, i) => i === idx ? { ...item, caption } : item))
  }

  const removePendingFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const userOptions = [{ value: '', label: 'Не назначен' }, ...users.map(u => ({ value: u.id, label: formatShortName(u) }))]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Медиа-план</h1>
          <p className="text-text-muted">Календарь публикаций на неделю</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" />
          Новая публикация
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart(d => addDays(d, -7))}
              className="p-1.5 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold text-text min-w-[180px] text-center">{weekLabel}</h2>
            <button
              type="button"
              onClick={() => setWeekStart(d => addDays(d, 7))}
              className="p-1.5 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="text-sm text-primary hover:underline"
          >
            Сегодня
          </button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((date, idx) => (
              <div key={idx} className="px-3 py-2 text-center border-r border-border last:border-r-0">
                <div className="text-xs text-text-muted uppercase">
                  {date.toLocaleDateString('ru', { weekday: 'short' })}
                </div>
                <div className={`text-sm font-semibold ${isSameDay(date, new Date()) ? 'text-primary' : 'text-text'}`}>
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[300px]">
            {weekDays.map((date, idx) => {
              const dayPubs = publications.filter(p => p.publish_at && isSameDay(new Date(p.publish_at), date))
              return (
                <div
                  key={idx}
                  className={`p-2 border-r border-border last:border-r-0 min-h-[300px] ${isSameDay(date, new Date()) ? 'bg-primary/5' : 'bg-surface'}`}
                >
                  <div className="flex flex-col gap-2">
                    {dayPubs.map(pub => (
                      <button
                        key={pub.id}
                        type="button"
                        onClick={() => openEdit(pub)}
                        className="text-left p-2 rounded-lg bg-subtle hover:bg-hover border border-border transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Badge variant={platformBadgeVariant[pub.platform]}>{pub.platform_label}</Badge>
                          {pub.linked_task && (
                            <Link
                              to={`/tasks?task=${pub.linked_task.id}`}
                              onClick={e => e.stopPropagation()}
                              className="text-text-muted hover:text-primary"
                              title="Открыть задачу"
                            >
                              <Briefcase size={12} />
                            </Link>
                          )}
                        </div>
                        <div className="text-sm font-medium text-text line-clamp-2 mb-1">{pub.title}</div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={statusBadgeVariant[pub.status]}>{pub.status_label}</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-text-muted">
                            {new Date(pub.publish_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {pub.responsible && <Avatar user={pub.responsible} size={16} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPublication ? 'Изменить публикацию' : 'Новая публикация'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Тема" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Текст / описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SearchableSelect
              label="Платформа"
              value={form.platform}
              onChange={val => setForm({ ...form, platform: val })}
              options={platformOptions}
            />
            <SearchableSelect
              label="Статус"
              value={form.status}
              onChange={val => setForm({ ...form, status: val })}
              options={statusOptions}
            />
            <Input
              label="Дата и время"
              type="datetime-local"
              value={form.publish_at}
              onChange={e => setForm({ ...form, publish_at: e.target.value })}
              required
            />
          </div>
          <SearchableSelect
            label="Ответственный"
            value={form.responsible_id}
            onChange={val => setForm({ ...form, responsible_id: val })}
            options={userOptions}
          />

          {editingPublication && (
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-medium text-text">Вложения</h4>
              {editingPublication.attachments?.length > 0 && (
                <div className="space-y-2">
                  {editingPublication.attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 bg-subtle rounded-lg">
                      <a href={att.file} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate">
                        {att.caption || att.file.split('/').pop()}
                      </a>
                      <button type="button" onClick={() => handleDeleteAttachment(att.id)} className="p-1 text-text-muted hover:text-danger">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  id="media-plan-file-input"
                  type="file"
                  className="block w-full text-sm text-text file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white"
                />
                <Button type="button" onClick={addPendingFile} size="sm">Добавить</Button>
              </div>
              {pendingFiles.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Подпись к файлу"
                    value={item.caption}
                    onChange={e => updatePendingCaption(idx, e.target.value)}
                    className="flex-1"
                  />
                  <button type="button" onClick={() => removePendingFile(idx)} className="p-1.5 text-text-muted hover:text-danger">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              {editingPublication && (
                <>
                  {!editingPublication.linked_task ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleCreateTask(editingPublication)}>
                      <Briefcase size={14} className="mr-1" />
                      Создать задачу
                    </Button>
                  ) : (
                    <Link to={`/tasks?task=${editingPublication.linked_task.id}`} target="_blank">
                      <Button type="button" variant="secondary" size="sm">
                        <ExternalLink size={14} className="mr-1" />
                        Открыть задачу #{editingPublication.linked_task.id}
                      </Button>
                    </Link>
                  )}
                  <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(editingPublication)}>
                    <Trash2 size={14} className="mr-1" />
                    Удалить
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={closeModal}>Отмена</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Сохранение...' : (editingPublication ? 'Сохранить' : 'Создать')}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
