import { useEffect, useState } from 'react'
import { format, setHours, setMinutes } from 'date-fns'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import BookingCalendar from '../components/BookingCalendar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import SearchableSelect from '../components/ui/SearchableSelect'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { Plus, Pencil, Trash2, CreditCard, X, Save, CalendarDays, List } from 'lucide-react'

const statusLabels = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Выполнена',
  canceled: 'Отменена',
}

const statusBadgeVariant = {
  pending: 'yellow',
  confirmed: 'blue',
  completed: 'green',
  canceled: 'gray',
}

const statusOptions = [
  { value: 'pending', label: 'Ожидает' },
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'completed', label: 'Выполнена' },
  { value: 'canceled', label: 'Отменена' },
]

const emptyForm = { client_id: '', service_id: '', start_time: '', notes: '', status: 'pending' }

export default function Bookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [clients, setClients] = useState([])
  const [view, setView] = useState('calendar')
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ bookingId: null, amount: '' })
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    const [b, s, c] = await Promise.all([
      api.get('/booking/'),
      api.get('/booking/services/'),
      api.get('/clients/'),
    ])
    setBookings(b.data.results || b.data)
    setServices(s.data.results || s.data)
    setClients(c.data.results || c.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSlotClick = (day, hour) => {
    const dt = setMinutes(setHours(day, hour), 0)
    setEditingBooking(null)
    setForm({ ...emptyForm, start_time: format(dt, "yyyy-MM-dd'T'HH:mm") })
    setIsBookingModalOpen(true)
  }

  const openCreate = () => {
    setEditingBooking(null)
    setForm(emptyForm)
    setIsBookingModalOpen(true)
  }

  const openEdit = (booking) => {
    setEditingBooking(booking)
    setForm({
      client_id: booking.client?.id || '',
      service_id: booking.service?.id || '',
      start_time: booking.start_time ? booking.start_time.slice(0, 16) : '',
      notes: booking.notes || '',
      status: booking.status,
    })
    setIsBookingModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingBooking) {
      await api.put(`/booking/${editingBooking.id}/`, form)
    } else {
      await api.post('/booking/', form)
    }
    setForm(emptyForm)
    setEditingBooking(null)
    setIsBookingModalOpen(false)
    load()
  }

  const handleBookingMove = async (id, newStart) => {
    await api.patch(`/booking/${id}/`, { start_time: format(newStart, "yyyy-MM-dd'T'HH:mm") })
    load()
  }

  const handleDelete = async (booking) => {
    if (!confirm(`Удалить запись «${booking.service?.name}» для ${booking.client?.name}?`)) return
    await api.delete(`/booking/${booking.id}/`)
    load()
  }

  const createPayment = async (e) => {
    e.preventDefault()
    if (!paymentForm.bookingId || !paymentForm.amount) return
    const res = await api.post('/payments/', {
      booking: paymentForm.bookingId,
      amount: paymentForm.amount,
    })
    await api.post('/payments/callback/', { orderId: res.data.bank_order_id })
    setPaymentForm({ bookingId: null, amount: '' })
    load()
  }

  const clientOptions = [{ value: '', label: 'Выберите клиента' }, ...clients.map(c => ({ value: c.id, label: c.name }))]
  const serviceOptions = [{ value: '', label: 'Выберите услугу' }, ...services.map(s => ({ value: s.id, label: `${s.name} (${s.duration_minutes} мин)` }))]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Запись на услуги</h1>
          <p className="text-text-muted">Календарь и список записей с оплатой</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 bg-subtle p-1 rounded-lg">
            {[
              { key: 'calendar', label: 'Календарь', icon: CalendarDays },
              { key: 'list', label: 'Список', icon: List },
            ].map(v => {
              const Icon = v.icon
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === v.key ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Icon size={16} />
                  {v.label}
                </button>
              )
            })}
          </div>
          {user?.is_manager && (
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-1.5" />
              Новая запись
            </Button>
          )}
        </div>
      </div>

      {view === 'calendar' && (
        <BookingCalendar bookings={bookings} services={services} onSlotClick={handleSlotClick} onBookingClick={openEdit} onBookingMove={handleBookingMove} />
      )}

      {view === 'list' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border text-left text-sm text-text-muted">
                  <th className="pb-3 font-medium">Клиент</th>
                  <th className="pb-3 font-medium">Услуга</th>
                  <th className="pb-3 font-medium">Начало</th>
                  <th className="pb-3 font-medium">Статус</th>
                  <th className="pb-3 font-medium">Цена</th>
                  <th className="pb-3 font-medium">Оплачено</th>
                  <th className="pb-3 font-medium">Осталось</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {bookings.map(b => (
                  <tr key={b.id} className="border-b border-border hover:bg-subtle">
                    <td className="py-3 font-medium text-text">{b.client?.name}</td>
                    <td className="py-3 text-text">{b.service?.name}</td>
                    <td className="py-3 text-text-muted">{new Date(b.start_time).toLocaleString('ru')}</td>
                    <td className="py-3"><Badge variant={statusBadgeVariant[b.status]}>{statusLabels[b.status]}</Badge></td>
                    <td className="py-3 text-text">{b.service?.price} ₽</td>
                    <td className="py-3 text-success font-medium">{b.paid_amount} ₽</td>
                    <td className="py-3 text-text-muted">{b.remaining_amount} ₽</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {b.remaining_amount > 0 && (
                          paymentForm.bookingId === b.id ? (
                            <form onSubmit={createPayment} className="flex items-center gap-2 mr-2">
                              <input
                                type="number"
                                step="0.01"
                                max={b.remaining_amount}
                                value={paymentForm.amount}
                                onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                className="w-24 px-2 py-1 text-sm border border-border rounded bg-surface text-text"
                                required
                              />
                              <Button type="submit" size="sm">
                                <Save size={14} className="mr-1" />
                                Оплатить
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setPaymentForm({ bookingId: null, amount: '' })}>
                                <X size={16} />
                              </Button>
                            </form>
                          ) : (
                            <Button size="sm" onClick={() => setPaymentForm({ bookingId: b.id, amount: b.remaining_amount })}>
                              <CreditCard size={14} className="mr-1" />
                              Оплатить
                            </Button>
                          )
                        )}
                        {user?.is_manager && (
                          <>
                            <button
                              onClick={() => openEdit(b)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                              title="Изменить"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(b)}
                              className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} title={editingBooking ? 'Изменить запись' : 'Новая запись'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect label="Клиент" value={form.client_id} onChange={val => setForm({ ...form, client_id: val })} options={clientOptions} />
          <Select label="Услуга" value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} options={serviceOptions} required />
          <Input label="Дата и время" type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
          <Select label="Статус" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={statusOptions} />
          <Input label="Примечания" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsBookingModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingBooking ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
