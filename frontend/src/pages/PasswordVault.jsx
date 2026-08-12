import { useEffect, useMemo, useState } from 'react'
import { Copy, Eye, EyeOff, Key, Link as LinkIcon, Pencil, Plus, Search, Trash2 } from 'lucide-react'

import api from '../api/axios'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'

const emptyForm = {
  category: '',
  title: '',
  login: '',
  password: '',
  url: '',
  notes: '',
  shared_user_ids: [],
}

const categoryBadgeVariant = {
  it: 'blue',
  social: 'pink',
  email: 'yellow',
}

export default function PasswordVault() {
  const [meta, setMeta] = useState(null)
  const [entries, setEntries] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [visiblePasswords, setVisiblePasswords] = useState({})

  const categories = meta?.categories || []
  const currentPermissions = meta?.current_permissions || {}
  const shareOptions = useMemo(
    () => (meta?.users || []).map(user => ({ value: user.id, label: user.full_name || user.short_name })),
    [meta]
  )
  const canCreate = categories.some(category => currentPermissions[category.value]?.add)

  const loadMeta = async () => {
    const res = await api.get('/password-vault/meta/')
    setMeta(res.data)
  }

  const loadEntries = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (categoryFilter) params.category = categoryFilter
      const res = await api.get('/password-vault/entries/', { params })
      setEntries(res.data.results || res.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([loadMeta(), loadEntries()]).catch(console.error)
  }, [])

  useEffect(() => {
    loadEntries().catch(console.error)
  }, [search, categoryFilter])

  const openCreate = () => {
    const defaultCategory = categories.find(category => currentPermissions[category.value]?.add)?.value || ''
    setEditingEntry(null)
    setForm({ ...emptyForm, category: defaultCategory })
    setIsModalOpen(true)
  }

  const openEdit = (entry) => {
    setEditingEntry(entry)
    setForm({
      category: entry.category,
      title: entry.title || '',
      login: entry.login || '',
      password: entry.password || '',
      url: entry.url || '',
      notes: entry.notes || '',
      shared_user_ids: (entry.shared_users || []).map(user => user.id),
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingEntry(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        category: form.category,
        title: form.title,
        login: form.login,
        password: form.password,
        url: form.url,
        notes: form.notes,
        shared_user_ids: form.shared_user_ids,
      }
      if (editingEntry) {
        await api.put(`/password-vault/entries/${editingEntry.id}/`, payload)
      } else {
        await api.post('/password-vault/entries/', payload)
      }
      await loadEntries()
      closeModal()
    } catch (error) {
      alert(error.response?.data?.detail || 'Не удалось сохранить запись.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry) => {
    if (!confirm(`Удалить запись «${entry.title}»?`)) return
    try {
      await api.delete(`/password-vault/entries/${entry.id}/`)
      await loadEntries()
    } catch (error) {
      alert(error.response?.data?.detail || 'Не удалось удалить запись.')
    }
  }

  const togglePasswordVisibility = (entryId) => {
    setVisiblePasswords(prev => ({ ...prev, [entryId]: !prev[entryId] }))
  }

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value || '')
    } catch {
      alert(`Не удалось скопировать ${label}.`)
    }
  }

  const createCategories = categories.filter(category => currentPermissions[category.value]?.add)
  const editCategories = editingEntry
    ? categories.filter(category => category.value === editingEntry.category || currentPermissions[category.value]?.add)
    : createCategories
  const headerActions = useMemo(() => (
    canCreate ? (
      <Button onClick={openCreate}>
        <Plus size={16} />
        Новая запись
      </Button>
    ) : null
  ), [canCreate])

  usePageHeaderContent(headerActions)

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по названию, логину, ссылке или комментарию..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="flex-1"
          />
          <div className="w-full lg:w-64">
            <label className="block text-sm font-medium text-text mb-1.5">Категория</label>
            <select
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Все категории</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-3 font-medium">Категория</th>
                <th className="pb-3 font-medium">Название</th>
                <th className="pb-3 font-medium">Логин</th>
                <th className="pb-3 font-medium">Пароль</th>
                <th className="pb-3 font-medium">Кому выдано</th>
                <th className="pb-3 font-medium">Обновлено</th>
                <th className="pb-3 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-border hover:bg-subtle/70">
                  <td className="py-3">
                    <Badge variant={categoryBadgeVariant[entry.category] || 'gray'}>
                      {entry.category_label}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="font-medium text-text">{entry.title}</div>
                    {entry.url && (
                      <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline">
                        <LinkIcon size={12} />
                        {entry.url}
                      </a>
                    )}
                    {entry.notes && (
                      <div className="text-xs text-text-muted mt-1 line-clamp-2">{entry.notes}</div>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-text">{entry.login || '—'}</span>
                      {entry.login && (
                        <button
                          type="button"
                          onClick={() => copyText(entry.login, 'логин')}
                          className="p-1 text-text-muted hover:text-primary hover:bg-surface rounded transition-colors"
                          title="Скопировать логин"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text">{visiblePasswords[entry.id] ? entry.password : '••••••••••'}</span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(entry.id)}
                        className="p-1 text-text-muted hover:text-primary hover:bg-surface rounded transition-colors"
                        title={visiblePasswords[entry.id] ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {visiblePasswords[entry.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(entry.password, 'пароль')}
                        className="p-1 text-text-muted hover:text-primary hover:bg-surface rounded transition-colors"
                        title="Скопировать пароль"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3">
                    {entry.shared_users?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {entry.shared_users.map(user => (
                          <span key={user.id} className="px-2 py-0.5 rounded-full bg-subtle text-xs text-text">
                            {user.short_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-muted">Только автор</span>
                    )}
                  </td>
                  <td className="py-3 text-text-muted">
                    <div>{new Date(entry.updated_at).toLocaleDateString('ru-RU')}</div>
                    <div className="text-xs">{entry.updated_by?.short_name || '—'}</div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      {entry.can_edit && (
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="p-1.5 text-text-muted hover:text-primary hover:bg-surface rounded-lg transition-colors"
                          title="Изменить"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {entry.can_delete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          className="p-1.5 text-text-muted hover:text-danger hover:bg-surface rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && entries.length === 0 && (
          <div className="px-6 pb-6 text-sm text-text-muted">Доступных записей пока нет.</div>
        )}
        {loading && (
          <div className="px-6 pb-6 text-sm text-text-muted">Загрузка...</div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingEntry ? 'Изменить запись' : 'Новая запись'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Категория</label>
              <select
                value={form.category}
                onChange={event => setForm(prev => ({ ...prev, category: event.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="" disabled>Выберите категорию</option>
                {(editingEntry ? editCategories : createCategories).map(category => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Название"
              value={form.title}
              onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Логин"
              value={form.login}
              onChange={event => setForm(prev => ({ ...prev, login: event.target.value }))}
            />
            <Input
              label="Пароль"
              type="text"
              value={form.password}
              onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
              required
            />
          </div>

          <Input
            label="Ссылка"
            value={form.url}
            onChange={event => setForm(prev => ({ ...prev, url: event.target.value }))}
            placeholder="https://..."
          />

          <SearchableMultiSelect
            label="Кому выдан доступ"
            options={shareOptions}
            value={form.shared_user_ids}
            onChange={value => setForm(prev => ({ ...prev, shared_user_ids: value }))}
            placeholder="Выберите сотрудников"
          />

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Комментарий</label>
            <textarea
              value={form.notes}
              onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              rows="4"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Отмена</Button>
            <Button type="submit" disabled={saving}>
              <Key size={14} className="mr-1.5" />
              {saving ? 'Сохранение...' : editingEntry ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
