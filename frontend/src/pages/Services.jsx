import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import { Clock, CreditCard, Plus, Pencil, Trash2, CheckCircle2, XCircle, Search, GripVertical, Loader2 } from 'lucide-react'

export default function Services() {
  const { user } = useAuth()
  const canManage = user?.is_manager || user?.capabilities?.includes('bookings.manage')
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draggedServiceId, setDraggedServiceId] = useState(null)
  const [dragOverServiceId, setDragOverServiceId] = useState(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    price: '',
    price_type: 'hourly',
    is_active: true,
  })

  const load = async () => {
    const firstResponse = await api.get('/booking/services/')
    const firstPage = firstResponse.data
    if (!Array.isArray(firstPage?.results)) {
      setServices(firstPage)
      return
    }

    if (!firstPage.count || firstPage.results.length >= firstPage.count || firstPage.results.length === 0) {
      setServices(firstPage.results)
      return
    }

    const pageCount = Math.ceil(firstPage.count / firstPage.results.length)
    const remainingPages = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) => api.get('/booking/services/', { params: { page: index + 2 } })),
    )
    setServices([firstPage, ...remainingPages.map(response => response.data)].flatMap(page => page.results || []))
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setForm({ name: '', description: '', duration_minutes: 60, price: '', price_type: 'hourly', is_active: true })
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEdit = (service) => {
    setEditingId(service.id)
    setForm({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price,
      price_type: service.price_type || 'hourly',
      is_active: service.is_active,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      price: form.price === '' ? 0 : parseFloat(form.price),
      duration_minutes: parseInt(form.duration_minutes, 10),
    }
    if (editingId) {
      await api.put(`/booking/services/${editingId}/`, payload)
    } else {
      await api.post('/booking/services/', payload)
    }
    setIsModalOpen(false)
    resetForm()
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить услугу? Это может повлиять на существующие записи.')) return
    await api.delete(`/booking/services/${id}/`)
    load()
  }

  const visibleServices = useMemo(() => services.filter(service => {
    const matchesSearch = `${service.name} ${service.description || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchesActive = activeFilter === 'all' || (activeFilter === 'active' ? service.is_active : !service.is_active)
    return matchesSearch && matchesActive
  }), [services, search, activeFilter])

  const isFullListVisible = search.trim() === '' && activeFilter === 'all'
  const canReorder = canManage && isFullListVisible && services.length > 1 && !isSavingOrder

  const persistOrder = async (nextServices, previousServices) => {
    setServices(nextServices)
    setIsSavingOrder(true)
    setOrderError('')
    try {
      const response = await api.post('/booking/services/reorder/', {
        service_ids: nextServices.map(service => service.id),
      })
      setServices(response.data)
    } catch (error) {
      setServices(previousServices)
      setOrderError(error?.response?.data?.service_ids || 'Не удалось сохранить порядок. Попробуйте ещё раз.')
    } finally {
      setIsSavingOrder(false)
    }
  }

  const moveService = (sourceId, targetId) => {
    if (!canReorder || sourceId === targetId) return
    const sourceIndex = services.findIndex(service => service.id === sourceId)
    const targetIndex = services.findIndex(service => service.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return

    const previousServices = services
    const nextServices = [...services]
    const [movedService] = nextServices.splice(sourceIndex, 1)
    nextServices.splice(targetIndex, 0, movedService)
    persistOrder(nextServices, previousServices)
  }

  const moveServiceByOffset = (serviceId, offset) => {
    if (!canReorder) return
    const sourceIndex = services.findIndex(service => service.id === serviceId)
    const targetIndex = sourceIndex + offset
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= services.length) return
    moveService(serviceId, services[targetIndex].id)
  }

  const handleDragStart = (event, serviceId) => {
    if (!canReorder) return
    setDraggedServiceId(serviceId)
    setDragOverServiceId(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(serviceId))
    const card = event.currentTarget.closest('section')
    if (card) event.dataTransfer.setDragImage(card, 32, 24)
  }

  const handleDrop = (event, targetId) => {
    event.preventDefault()
    const sourceId = Number(event.dataTransfer.getData('text/plain') || draggedServiceId)
    setDraggedServiceId(null)
    setDragOverServiceId(null)
    if (sourceId) moveService(sourceId, targetId)
  }
  const headerActions = useMemo(() => (
    canManage ? (
      <Button onClick={openCreate}>
        <Plus size={16} />
        Новая услуга
      </Button>
    ) : null
  ), [canManage])

  usePageHeaderContent(headerActions)

  return (
    <div>
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-border/70 bg-subtle/72 p-1.5">
            {[
              { key: 'all', label: 'Все' },
              { key: 'active', label: 'Активные' },
              { key: 'inactive', label: 'Неактивные' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeFilter === f.key ? 'bg-white text-primary shadow-[0_8px_18px_rgba(15,23,40,0.08)]' : 'text-text-muted hover:text-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {canManage && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4 text-sm text-text-muted">
            {isSavingOrder ? <Loader2 size={17} className="animate-spin text-primary" /> : <GripVertical size={17} className="text-primary" />}
            <span>
              {isSavingOrder
                ? 'Сохраняем порядок…'
                : isFullListVisible
                  ? 'Перетащите услуги за ручку. Порядок сразу появится в виджете.'
                  : 'Чтобы изменить порядок, очистите поиск и выберите фильтр «Все».'}
            </span>
          </div>
        )}
        {orderError && <div className="mt-3 text-sm font-medium text-danger" role="alert">{orderError}</div>}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {visibleServices.map((service, serviceIndex) => (
          <Card
            key={service.id}
            onDragOver={(event) => {
              if (!canReorder || draggedServiceId === service.id) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDragOverServiceId(service.id)
            }}
            onDrop={(event) => handleDrop(event, service.id)}
            className={`transition-all hover:shadow-md ${
              draggedServiceId === service.id ? 'scale-[0.98] opacity-45' : ''
            } ${dragOverServiceId === service.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg' : ''}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex min-w-0 items-start gap-2">
                {canManage && (
                  <button
                    type="button"
                    draggable={canReorder}
                    disabled={!canReorder}
                    onDragStart={(event) => handleDragStart(event, service.id)}
                    onDragEnd={() => {
                      setDraggedServiceId(null)
                      setDragOverServiceId(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                        event.preventDefault()
                        moveServiceByOffset(service.id, -1)
                      }
                      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                        event.preventDefault()
                        moveServiceByOffset(service.id, 1)
                      }
                    }}
                    className="-ml-2 inline-flex min-h-10 min-w-10 shrink-0 cursor-grab items-center justify-center rounded-xl text-text-muted hover:bg-subtle hover:text-primary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Изменить позицию услуги «${service.name}». Используйте стрелки для перемещения`}
                    title="Перетащите для изменения порядка"
                  >
                    <GripVertical size={19} />
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-text">{service.name}</h3>
                  {isFullListVisible && <div className="mt-1 text-xs text-text-muted">Позиция {serviceIndex + 1}</div>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {service.is_active ? (
                  <span className="text-success" title="Активна"><CheckCircle2 size={18} /></span>
                ) : (
                  <span className="text-text-muted" title="Неактивна"><XCircle size={18} /></span>
                )}
              </div>
            </div>
            <p className="text-sm text-text-muted mb-4 line-clamp-3 min-h-[2.5rem]">{service.description || 'Нет описания'}</p>
            <div className="flex items-center gap-4 text-sm mb-4">
              <div className="flex items-center gap-1.5 text-text-muted">
                <Clock size={16} className="text-primary" />
                {service.duration_minutes} мин
              </div>
              <div className="flex items-center gap-1.5 text-text-muted">
                <CreditCard size={16} className="text-primary" />
                {service.price} ₽ / {service.price_type === 'fixed' ? 'услуга' : 'час'}
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(service)}>
                  <Pencil size={14} className="mr-1.5" />
                  Изменить
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(service.id)}>
                  <Trash2 size={14} className="mr-1.5" />
                  Удалить
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Изменить услугу' : 'Новая услуга'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Название"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows="3"
            />
          </div>
          <Select
            label="Расчёт стоимости"
            value={form.price_type}
            onChange={e => setForm({ ...form, price_type: e.target.value })}
            options={[
              { value: 'hourly', label: 'За час' },
              { value: 'fixed', label: 'За услугу' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Длительность, мин"
              type="number"
              min={1}
              value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
              required
            />
            <Input
              label="Цена, ₽"
              type="number"
              step="0.01"
              min={0}
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm text-text">Активна</span>
          </label>
          <div className="modal-actions flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingId ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
