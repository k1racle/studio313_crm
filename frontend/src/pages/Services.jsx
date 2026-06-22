import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { Clock, CreditCard, Plus, Pencil, Trash2, CheckCircle2, XCircle, Search, Filter } from 'lucide-react'

export default function Services() {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    price: '',
    is_active: true,
  })

  const load = async () => {
    const res = await api.get('/booking/services/')
    setServices(res.data.results || res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setForm({ name: '', description: '', duration_minutes: 60, price: '', is_active: true })
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Услуги</h1>
          <p className="text-text-muted">Каталог услуг студии</p>
        </div>
        {user?.is_manager && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Новая услуга
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
          <div className="flex items-center gap-2 bg-subtle p-1 rounded-lg">
            {[
              { key: 'all', label: 'Все' },
              { key: 'active', label: 'Активные' },
              { key: 'inactive', label: 'Неактивные' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === f.key ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {services
          .filter(s => {
            const matchesSearch = (s.name + ' ' + (s.description || '')).toLowerCase().includes(search.toLowerCase())
            const matchesActive = activeFilter === 'all' || (activeFilter === 'active' ? s.is_active : !s.is_active)
            return matchesSearch && matchesActive
          })
          .map(service => (
          <Card key={service.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-text">{service.name}</h3>
              <div className="flex items-center gap-1 shrink-0">
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
                {service.price} ₽
              </div>
            </div>
            {user?.is_manager && (
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
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingId ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
