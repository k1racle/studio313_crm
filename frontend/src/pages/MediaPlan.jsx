import { useEffect, useState, useMemo } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import SearchableSelect from '../components/ui/SearchableSelect'
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect'
import MobileFiltersSheet from '../components/ui/MobileFiltersSheet'
import Avatar from '../components/ui/Avatar'
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Calendar, Briefcase, ExternalLink, Search, Download, SlidersHorizontal } from 'lucide-react'
import { formatShortName } from '../utils/format'
import { downloadExport } from '../utils/export'
import { Link } from 'react-router-dom'

const statusOptions = [
  { value: 'draft', label: 'Черновик' },
  { value: 'approval', label: 'На согласовании' },
  { value: 'scheduled', label: 'Запланировано' },
  { value: 'published', label: 'Опубликовано' },
  { value: 'cancelled', label: 'Отменено' },
]

const statusLabels = {
  draft: 'Черновик',
  approval: 'На согласовании',
  scheduled: 'Запланировано',
  published: 'Опубликовано',
  cancelled: 'Отменено',
}

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

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
}

const priorityBadgeVariant = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  critical: 'red',
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
  platform_ids: [],
  status: 'draft',
  priority: 'medium',
  publish_at: '',
  responsible_id: '',
  project_id: '',
}

export default function MediaPlan() {
  const { user } = useAuth()
  const [publications, setPublications] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPublication, setEditingPublication] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [pendingFiles, setPendingFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    responsible: '',
    project: '',
    search: '',
  })
  const [platforms, setPlatforms] = useState([])

  const loadPublications = async () => {
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.responsible) params.responsible = filters.responsible
      if (filters.project) params.project = filters.project
      if (filters.search) params.search = filters.search
      const res = await api.get('/media-plan/publications/', { params })
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

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects/')
      setProjects(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadPlatforms = async () => {
    try {
      const res = await api.get('/media-plan/platforms/')
      setPlatforms(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadPublications()
  }, [filters])

  useEffect(() => {
    loadUsers()
    loadProjects()
    loadPlatforms()
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
      platform_ids: (pub.platforms || []).map(p => p.id),
      status: pub.status,
      priority: pub.priority || 'medium',
      publish_at: formatDateTimeLocalInput(pub.publish_at),
      responsible_id: pub.responsible?.id || '',
      project_id: pub.project?.id || '',
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
        project_id: form.project_id || null,
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

  const handleExport = async () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.responsible) params.responsible = filters.responsible
    if (filters.project) params.project = filters.project
    if (filters.search) params.search = filters.search
    const start = new Date(weekStart)
    start.setHours(0, 0, 0, 0)
    const end = addDays(weekStart, 6)
    end.setHours(23, 59, 59, 999)
    params.start = start.toISOString()
    params.end = end.toISOString()
    try {
      await downloadExport('/media-plan/publications/export/', params, 'media_plan.xlsx')
    } catch (err) {
      console.error('Ошибка выгрузки медиа-плана:', err)
      alert('Не удалось выгрузить медиа-план')
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
  const responsibleFilterOptions = [{ value: '', label: 'Все ответственные' }, ...users.map(u => ({ value: u.id, label: formatShortName(u) }))]
  const projectOptions = [{ value: '', label: 'Все проекты' }, ...projects.map(p => ({ value: p.id, label: p.name }))]
  const priorityFilterOptions = [{ value: '', label: 'Все приоритеты' }, ...Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))]
  const statusFilterOptions = [{ value: '', label: 'Все статусы' }, ...Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))]

  const activeFilterCount = [filters.project, filters.responsible, filters.priority, filters.status].filter(Boolean).length

  usePageHeaderContent(
    <Button onClick={openCreate}>
      <Plus size={16} />
      Новая публикация
    </Button>
  )

  return (
    <div>
      <Card className="mb-6" bodyClassName="space-y-3">
        <div className="space-y-3 md:hidden">
          <Input
            icon={<Search size={16} />}
            placeholder="РџРѕРёСЃРє..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <Button type="button" variant="secondary" onClick={() => setMobileFiltersOpen(true)}>
              <SlidersHorizontal size={16} />
              Р¤РёР»СЊС‚СЂС‹
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} />
              Excel
            </Button>
          </div>
        </div>

        <div className="hidden grid-cols-1 gap-3 md:grid 2xl:grid-cols-[minmax(0,1.1fr)_180px_220px_180px_180px_auto] xl:grid-cols-[minmax(0,1fr)_180px_220px_180px_180px]">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
          <div>
            <Select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })} options={projectOptions} />
          </div>
          <div>
            <SearchableSelect value={filters.responsible} onChange={val => setFilters({ ...filters, responsible: val })} options={responsibleFilterOptions} />
          </div>
          <div>
            <Select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} options={priorityFilterOptions} />
          </div>
          <div>
            <Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} options={statusFilterOptions} />
          </div>
          <div className="flex items-center 2xl:justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} className="mr-1" />
              Excel
            </Button>
          </div>
        </div>
      </Card>

      <MobileFiltersSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Р¤РёР»СЊС‚СЂС‹ РјРµРґРёР°-РїР»Р°РЅР°"
        footer={(
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setFilters(prev => ({ ...prev, status: '', priority: '', responsible: '', project: '' }))}
            >
              РЎР±СЂРѕСЃРёС‚СЊ
            </Button>
            <Button type="button" className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
              РџСЂРёРјРµРЅРёС‚СЊ
            </Button>
          </div>
        )}
      >
        <Select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })} options={projectOptions} />
        <SearchableSelect value={filters.responsible} onChange={val => setFilters({ ...filters, responsible: val })} options={responsibleFilterOptions} />
        <Select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} options={priorityFilterOptions} />
        <Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} options={statusFilterOptions} />
      </MobileFiltersSheet>

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
                          <div className="flex flex-wrap gap-1">
                            {(pub.platforms || []).length > 0 ? (
                              pub.platforms.map(p => (
                                <Badge key={p.id} variant={platformBadgeVariant[p.slug] || 'gray'}>{p.name}</Badge>
                              ))
                            ) : (
                              <Badge variant="gray">-</Badge>
                            )}
                          </div>
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
                        {pub.project && (
                          <div className="text-[10px] text-primary mb-1 truncate">{pub.project.name}</div>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={statusBadgeVariant[pub.status]}>{pub.status_label}</Badge>
                          <Badge variant={priorityBadgeVariant[pub.priority]}>{priorityLabels[pub.priority]}</Badge>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchableSelect
              label="Проект"
              value={form.project_id}
              onChange={val => setForm({ ...form, project_id: val })}
              options={projectOptions}
            />
            <SearchableSelect
              label="Ответственный"
              value={form.responsible_id}
              onChange={val => setForm({ ...form, responsible_id: val })}
              options={userOptions}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SearchableMultiSelect
              label="Платформы"
              value={form.platform_ids}
              onChange={val => setForm({ ...form, platform_ids: val })}
              options={platforms.map(p => ({ value: p.id, label: p.name }))}
            />
            <SearchableSelect
              label="Статус"
              value={form.status}
              onChange={val => setForm({ ...form, status: val })}
              options={statusOptions}
            />
            <Select
              label="Приоритет"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>
          <Input
            label="Дата и время"
            type="datetime-local"
            value={form.publish_at}
            onChange={e => setForm({ ...form, publish_at: e.target.value })}
            required
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
