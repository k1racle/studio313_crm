import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import MobileFiltersSheet from '../components/ui/MobileFiltersSheet'
import { Plus, Pencil, Trash2, Users, ArrowRight, CheckCircle2, XCircle, Archive, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { formatShortName } from '../utils/format'

const emptyForm = { name: '', description: '', member_ids: [], is_archived: false }

export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [memberSearch, setMemberSearch] = useState('')

  const load = async () => {
    const params = {}
    if (showArchived) params.archived = '1'
    const [p, u] = await Promise.all([
      api.get('/projects/', { params }),
      user?.is_manager ? api.get('/auth/users/') : Promise.resolve({ data: { results: [] } }),
    ])
    setProjects(p.data.results || p.data)
    setUsers(u.data.results || u.data)
  }

  useEffect(() => {
    load()
  }, [user, showArchived])

  const openCreate = () => {
    setEditingProject(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (project) => {
    setEditingProject(project)
    setForm({
      name: project.name,
      description: project.description || '',
      member_ids: project.members?.map(m => m.id) || [],
      is_archived: project.is_archived,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingProject) {
      await api.put(`/projects/${editingProject.id}/`, form)
    } else {
      await api.post('/projects/', form)
    }
    setForm(emptyForm)
    setEditingProject(null)
    setIsModalOpen(false)
    load()
  }

  const handleDelete = async (project) => {
    if (!confirm(`Удалить проект «${project.name}»?`)) return
    await api.delete(`/projects/${project.id}/`)
    load()
  }

  const toggleArchive = async (project) => {
    await api.patch(`/projects/${project.id}/`, { is_archived: !project.is_archived })
    load()
  }

  const toggleMember = (id) => {
    const ids = form.member_ids.includes(id)
      ? form.member_ids.filter(x => x !== id)
      : [...form.member_ids, id]
    setForm({ ...form, member_ids: ids })
  }

  const filteredUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => formatShortName(u).toLowerCase().includes(q))
  }, [users, memberSearch])

  const headerActions = useMemo(() => (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Button
        type="button"
        onClick={() => setMobileFiltersOpen(true)}
        variant="secondary"
        className="md:hidden"
        title="Фильтры"
        aria-label="Фильтры"
      >
        <SlidersHorizontal size={16} />
        {showArchived ? '1' : ''}
      </Button>
      <label className="hidden md:inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/78 px-4 py-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={e => setShowArchived(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary"
        />
        Показать архив
      </label>
      {user?.is_manager && (
        <Button onClick={openCreate}>
          <Plus size={16} />
          Новый проект
        </Button>
      )}
    </div>
  ), [showArchived, user?.is_manager])

  usePageHeaderContent(headerActions)

  return (
    <div>
      <MobileFiltersSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Фильтры проектов"
        footer={(
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowArchived(false)}>
              Сбросить
            </Button>
            <Button type="button" className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
              Применить
            </Button>
          </div>
        )}
      >
        <label className="flex items-center gap-3 rounded-[20px] border border-border/70 bg-surface/72 px-4 py-3 text-sm text-text">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary"
          />
          <span>Показать архив</span>
        </label>
      </MobileFiltersSheet>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {projects.map(p => (
          <Card key={p.id} className={`hover:shadow-md transition-shadow ${p.is_archived ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-text">{p.name}</h3>
              <div className="flex items-center gap-1">
                {p.is_active ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle2 size={12} />
                    Активен
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-subtle text-text-muted">
                    <XCircle size={12} />
                    Неактивен
                  </span>
                )}
                {p.is_archived && <Badge variant="gray">Архив</Badge>}
              </div>
            </div>
            <p className="text-sm text-text-muted mb-4 line-clamp-2">{p.description || 'Нет описания'}</p>
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-xs text-text-muted uppercase mb-2">
                <Users size={12} />
                Участники
              </div>
              <div className="flex flex-wrap gap-1">
                {p.members?.length ? p.members.map(m => (
                  <span key={m.id} className="text-xs px-2 py-1 bg-subtle rounded-full text-text">{formatShortName(m)}</span>
                )) : <span className="text-sm text-text-muted">Нет участников</span>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Link to={`/tasks?project=${p.id}`} className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                Перейти к задачам
                <ArrowRight size={14} />
              </Link>
              {user?.is_manager && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                    title="Изменить"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => toggleArchive(p)}
                    className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                    title={p.is_archived ? 'Восстановить' : 'В архив'}
                  >
                    {p.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Изменить проект' : 'Новый проект'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Название" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Участники</label>
            <Input
              placeholder="Поиск по ФИО"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="mb-2"
            />
            <div className="space-y-2 max-h-48 overflow-auto border border-border rounded-lg p-3 bg-surface">
              {filteredUsers.map(u => (
                <label key={u.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.member_ids.includes(u.id)}
                    onChange={() => toggleMember(u.id)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-text">{formatShortName(u)}</span>
                </label>
              ))}
            </div>
          </div>
          {editingProject && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_archived}
                onChange={e => setForm({ ...form, is_archived: e.target.checked })}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-text">В архиве</span>
            </label>
          )}
          <div className="modal-actions flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingProject ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
