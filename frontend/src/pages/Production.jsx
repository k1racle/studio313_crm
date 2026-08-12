import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import ProductionKanbanBoard from '../components/ProductionKanbanBoard'
import ProductionCalendar from '../components/ProductionCalendar'
import GanttChart from '../components/GanttChart'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import SearchableSelect from '../components/ui/SearchableSelect'
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect'
import Subtasks from '../components/Subtasks'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'
import ProductionDetail from '../pages/ProductionDetail'
import Avatar from '../components/ui/Avatar'
import { Plus, Pencil, Trash2, Search, List, LayoutGrid, Calendar as CalendarIcon, BarChart3, Download } from 'lucide-react'
import { formatShortName } from '../utils/format'
import { downloadExport } from '../utils/export'

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

const emptyForm = {
  title: '',
  description: '',
  status: 'new',
  assignee_ids: [],
  project_id: '',
  client_id: '',
  due_date: '',
}

export default function Production() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [view, setView] = useState('kanban')
  const [filters, setFilters] = useState({
    status: '',
    assignees: '',
    project: '',
    search: '',
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItemId, setDetailItemId] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [pendingDetailId, setPendingDetailId] = useState(null)

  const loadItems = async () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.assignees) params.assignees = filters.assignees
    if (filters.project) params.project = filters.project
    if (filters.search) params.search = filters.search
    const res = await api.get('/production/', { params })
    setItems(res.data.results || res.data)
  }

  useEffect(() => {
    loadItems()
    if (user?.is_manager) {
      api.get('/auth/users/').then(res => setUsers(res.data.results || res.data))
      api.get('/clients/').then(res => setClients(res.data.results || res.data))
    }
    api.get('/projects/').then(res => setProjects(res.data.results || res.data))
  }, [user])

  useEffect(() => {
    const timeout = setTimeout(loadItems, 300)
    return () => clearTimeout(timeout)
  }, [filters])

  const openCreate = () => {
    setEditingItem(null)
    setForm({ ...emptyForm, project_id: filters.project })
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm({
      title: item.title,
      description: item.description || '',
      status: item.status,
      assignee_ids: item.assignees?.map(a => a.id) || [],
      project_id: item.project?.id || '',
      client_id: item.client?.id || '',
      due_date: item.due_date ? item.due_date.slice(0, 10) : '',
    })
    setIsModalOpen(true)
  }

  const openDetail = (id) => {
    setDetailItemId(id)
    setDetailItem(null)
    setDetailOpen(true)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailItemId(null)
    setDetailItem(null)
  }

  const handleEditDetail = () => {
    if (!detailItem) return
    setPendingDetailId(detailItem.id)
    closeDetail()
    openEdit(detailItem)
  }

  const handleDeleteDetail = async () => {
    if (!detailItem || !confirm(`Удалить «${detailItem.title}»?`)) return
    await api.delete(`/production/${detailItem.id}/`)
    closeDetail()
    loadItems()
  }

  const handleCloseEdit = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    if (pendingDetailId) {
      openDetail(pendingDetailId)
      setPendingDetailId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      assignee_ids: form.assignee_ids,
      project_id: form.project_id || null,
      client_id: form.client_id || null,
      due_date: form.due_date ? form.due_date + 'T00:00:00' : null,
    }
    try {
      if (editingItem) {
        await api.put(`/production/${editingItem.id}/`, payload)
      } else {
        await api.post('/production/', payload)
      }
      setForm(emptyForm)
      setEditingItem(null)
      setIsModalOpen(false)
      await loadItems()
      if (pendingDetailId) {
        openDetail(pendingDetailId)
        setPendingDetailId(null)
      }
    } catch (err) {
      console.error('Ошибка сохранения:', err)
      alert('Не удалось сохранить. Проверьте данные и попробуйте снова.')
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Удалить «${item.title}»?`)) return
    await api.delete(`/production/${item.id}/`)
    loadItems()
  }

  const handleExport = async () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.assignees) params.assignees = filters.assignees
    if (filters.project) params.project = filters.project
    if (filters.search) params.search = filters.search
    try {
      await downloadExport('/production/export/', params, 'production.xlsx')
    } catch (err) {
      console.error('Ошибка выгрузки производства:', err)
      alert('Не удалось выгрузить производство')
    }
  }

  const userOptions = [{ value: '', label: 'Все исполнители' }, ...users.map(u => ({ value: u.id, label: formatShortName(u) }))]
  const projectOptions = [{ value: '', label: 'Все проекты' }, ...projects.map(p => ({ value: p.id, label: p.name }))]
  const clientOptions = [{ value: '', label: 'Без клиента' }, ...clients.map(c => ({ value: c.id, label: c.name }))]
  const statusOptions = [{ value: '', label: 'Все статусы' }, ...Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))]
  const headerActions = useMemo(() => (
    user?.is_manager ? (
      <Button onClick={openCreate}>
        <Plus size={16} />
        Новая заявка
      </Button>
    ) : null
  ), [user?.is_manager])

  usePageHeaderContent(headerActions)

  return (
    <div>
      <Card className="mb-6">
        <div className="flex flex-nowrap sm:flex-wrap items-end gap-3 overflow-x-auto pb-2 sm:overflow-visible">
          <div className="flex shrink-0 gap-2 bg-subtle p-1 rounded-lg">
            {[
              { key: 'kanban', label: 'Kanban', icon: LayoutGrid },
              { key: 'gantt', label: 'Gantt', icon: BarChart3 },
              { key: 'calendar', label: 'Календарь', icon: CalendarIcon },
              { key: 'list', label: 'Список', icon: List },
            ].map(v => {
              const Icon = v.icon
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    view === v.key ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Icon size={14} />
                  {v.label}
                </button>
              )
            })}
          </div>
          <div className="shrink-0 w-40">
            <Select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })} options={projectOptions} />
          </div>
          {view !== 'kanban' && (
            <div className="shrink-0 w-36">
              <Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} options={statusOptions} />
            </div>
          )}
          <div className="shrink-0 w-44">
            <SearchableSelect value={filters.assignees} onChange={val => setFilters({ ...filters, assignees: val })} options={userOptions} />
          </div>
          <div className="flex shrink-0 items-center gap-3 w-auto">
            <Input
              icon={<Search size={16} />}
              placeholder="Поиск..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="w-48 sm:w-64"
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} className="mr-1" />
              Excel
            </Button>
          </div>
        </div>
      </Card>

      {view === 'kanban' && (
        <ProductionKanbanBoard items={items} onItemMoved={loadItems} onItemClick={(item) => openDetail(item.id)} />
      )}

      {view === 'gantt' && (
        <GanttChart tasks={items} onTaskClick={(id) => openDetail(id)} />
      )}

      {view === 'calendar' && (
        <ProductionCalendar items={items} onItemMoved={loadItems} onItemClick={(item) => openDetail(item.id)} />
      )}

      {view === 'list' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[900px] table-fixed">
              <thead>
                <tr className="border-b border-border text-left text-sm text-text-muted">
                  <th className="pb-3 font-medium w-12">ID</th>
                  <th className="pb-3 font-medium w-40">Проект</th>
                  <th className="pb-3 font-medium w-40">Клиент</th>
                  <th className="pb-3 font-medium w-64">Название</th>
                  <th className="pb-3 font-medium w-36">Статус</th>
                  <th className="pb-3 font-medium w-44">Исполнители</th>
                  <th className="pb-3 font-medium w-28">Срок</th>
                  <th className="pb-3 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.map(item => (
                  <tr key={item.id} className="border-b border-border hover:bg-subtle">
                    <td className="py-3 text-text-muted">#{item.id}</td>
                    <td className="py-3 truncate">{item.project?.name || '—'}</td>
                    <td className="py-3 truncate">{item.client?.name || '—'}</td>
                    <td className="py-3">
                      <button
                        onClick={() => openDetail(item.id)}
                        className="font-medium text-text hover:text-primary text-left block whitespace-normal break-words leading-snug"
                      >
                        {item.title}
                      </button>
                    </td>
                    <td className="py-3"><Badge variant={statusBadgeVariant[item.status]}>{statusLabels[item.status]}</Badge></td>
                    <td className="py-3">
                      {item.assignees?.length ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {item.assignees.slice(0, 2).map(u => (
                            <span key={u.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-subtle rounded text-xs" title={formatShortName(u)}>
                              <Avatar user={u} size={16} />
                              <span className="truncate max-w-[80px]">{formatShortName(u)}</span>
                            </span>
                          ))}
                          {item.assignees.length > 2 && (
                            <span className="text-xs text-text-muted">+{item.assignees.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 text-text-muted">{item.due_date ? new Date(item.due_date).toLocaleDateString('ru') : '—'}</td>
                    <td className="py-3">
                      {user?.is_manager && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                            title="Изменить"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseEdit} title={editingItem ? 'Изменить производство' : 'Новая заявка'}>
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
          {editingItem ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Статус"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))}
              />
              <Input label="Срок" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          ) : (
            <Input label="Срок" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          )}
          <SearchableMultiSelect
            label="Исполнители"
            value={form.assignee_ids}
            onChange={val => setForm({ ...form, assignee_ids: val })}
            options={users.map(u => ({ value: u.id, label: formatShortName(u) }))}
          />
          {editingItem && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-text-muted uppercase mb-3">Подзадачи</h4>
              <Subtasks
                parentId={editingItem.id}
                listEndpoint={`/production/${editingItem.id}/subtasks/`}
                detailEndpointPrefix="/production/subtasks"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleCloseEdit}>Отмена</Button>
            <Button type="submit">{editingItem ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={detailOpen}
        onClose={closeDetail}
        title={`Производство #${detailItemId}`}
        size="xl"
        headerActions={
          detailItem && user?.is_manager ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="secondary" size="sm" onClick={handleEditDetail} title="Редактировать">
                <Pencil size={16} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Редактировать</span>
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteDetail} title="Удалить">
                <Trash2 size={16} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Удалить</span>
              </Button>
            </div>
          ) : null
        }
      >
        <ProductionDetail
          id={detailItemId}
          isPanel
          onClose={closeDetail}
          onLoad={setDetailItem}
        />
      </Modal>
    </div>
  )
}
