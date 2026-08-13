import { useEffect, useMemo, useState } from 'react'
import { format, setHours, setMinutes } from 'date-fns'
import { CalendarDays, CreditCard, List, Pencil, Plus, Save, Trash2, X } from 'lucide-react'

import api from '../api/axios'
import BookingCalendar from '../components/BookingCalendar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import SearchableSelect from '../components/ui/SearchableSelect'
import Select from '../components/ui/Select'
import { useAuth } from '../contexts/AuthContext'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'

const statusLabels = {
  pending: 'На согласовании',
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
  { value: 'pending', label: 'На согласовании' },
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'completed', label: 'Выполнена' },
  { value: 'canceled', label: 'Отменена' },
]

const emptyForm = {
  client_id: '',
  requester_name: '',
  requester_phone: '',
  service_id: '',
  start_time: '',
  notes: '',
  status: 'pending',
}

function formatError(error) {
  const data = error?.response?.data
  if (!data) return 'Не удалось выполнить операцию.'
  if (typeof data.detail === 'string') return data.detail
  if (typeof data === 'string') return data

  return Object.entries(data)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ') || 'Не удалось выполнить операцию.'
}

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
    const [bookingResponse, serviceResponse, clientResponse] = await Promise.all([
      api.get('/booking/'),
      api.get('/booking/services/'),
      api.get('/clients/'),
    ])
    setBookings(bookingResponse.data.results || bookingResponse.data)
    setServices(serviceResponse.data.results || serviceResponse.data)
    setClients(clientResponse.data.results || clientResponse.data)
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
      requester_name: booking.requester_name || booking.contact_name || '',
      requester_phone: booking.requester_phone || booking.contact_phone || '',
      service_id: booking.service?.id || '',
      start_time: booking.start_time ? booking.start_time.slice(0, 16) : '',
      notes: booking.notes || '',
      status: booking.status,
    })
    setIsBookingModalOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      client_id: form.client_id || null,
    }
    try {
      if (editingBooking) {
        await api.put(`/booking/${editingBooking.id}/`, payload)
      } else {
        await api.post('/booking/', payload)
      }
      setForm(emptyForm)
      setEditingBooking(null)
      setIsBookingModalOpen(false)
      await load()
    } catch (error) {
      alert(formatError(error))
    }
  }

  const handleBookingMove = async (id, newStart) => {
    try {
      await api.patch(`/booking/${id}/`, { start_time: format(newStart, "yyyy-MM-dd'T'HH:mm") })
      await load()
    } catch (error) {
      alert(formatError(error))
    }
  }

  const handleDelete = async (booking) => {
    if (!confirm(`Удалить запись «${booking.service?.name}» для ${booking.contact_name || 'клиента'}?`)) return
    await api.delete(`/booking/${booking.id}/`)
    await load()
  }

  const createPayment = async (event) => {
    event.preventDefault()
    if (!paymentForm.bookingId || !paymentForm.amount) return
    const response = await api.post('/payments/', {
      booking: paymentForm.bookingId,
      amount: paymentForm.amount,
    })
    await api.post('/payments/callback/', { orderId: response.data.bank_order_id })
    setPaymentForm({ bookingId: null, amount: '' })
    await load()
  }

  const clientOptions = [{ value: '', label: 'Выберите клиента' }, ...clients.map(client => ({ value: client.id, label: client.name }))]
  const serviceOptions = [{ value: '', label: 'Выберите услугу' }, ...services.map(service => ({ value: service.id, label: `${service.name} (${service.duration_minutes} мин)` }))]

  const headerActions = useMemo(() => (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex gap-2 rounded-full border border-border/70 bg-surface/75 p-1">
        {[
          { key: 'calendar', label: 'Календарь', icon: CalendarDays },
          { key: 'list', label: 'Список', icon: List },
        ].map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                view === item.key ? 'bg-white text-primary shadow-[0_8px_18px_rgba(15,23,40,0.08)]' : 'text-text-muted hover:text-text'
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          )
        })}
      </div>
      {user?.is_manager && (
        <Button onClick={openCreate}>
          <Plus size={16} />
          Новая запись
        </Button>
      )}
    </div>
  ), [user?.is_manager, view])

  usePageHeaderContent(headerActions)

  return (
    <div>
      {view === 'calendar' && (
        <BookingCalendar bookings={bookings} services={services} onSlotClick={handleSlotClick} onBookingClick={openEdit} onBookingMove={handleBookingMove} />
      )}

      {view === 'list' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-border text-left text-sm text-text-muted">
                  <th className="pb-3 font-medium">Клиент / заявка</th>
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
                {bookings.map(booking => (
                  <tr key={booking.id} className="border-b border-border hover:bg-subtle">
                    <td className="py-3 text-text">
                      <div className="font-medium">{booking.contact_name || '—'}</div>
                      <div className="text-xs text-text-muted">{booking.contact_phone || 'Без телефона'}</div>
                      {booking.is_pending_request && <div className="mt-1 text-xs font-medium text-primary">Заявка еще не подтверждена</div>}
                    </td>
                    <td className="py-3 text-text">{booking.service?.name}</td>
                    <td className="py-3 text-text-muted">{new Date(booking.start_time).toLocaleString('ru')}</td>
                    <td className="py-3"><Badge variant={statusBadgeVariant[booking.status]}>{statusLabels[booking.status]}</Badge></td>
                    <td className="py-3 text-text">{booking.service?.price} ₽</td>
                    <td className="py-3 font-medium text-success">{booking.paid_amount} ₽</td>
                    <td className="py-3 text-text-muted">{booking.remaining_amount} ₽</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {booking.client && booking.remaining_amount > 0 && (
                          paymentForm.bookingId === booking.id ? (
                            <form onSubmit={createPayment} className="mr-2 flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                max={booking.remaining_amount}
                                value={paymentForm.amount}
                                onChange={event => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                                className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-text"
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
                            <Button size="sm" onClick={() => setPaymentForm({ bookingId: booking.id, amount: booking.remaining_amount })}>
                              <CreditCard size={14} className="mr-1" />
                              Оплатить
                            </Button>
                          )
                        )}
                        {user?.is_manager && (
                          <>
                            <button
                              onClick={() => openEdit(booking)}
                              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-primary"
                              title="Изменить"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(booking)}
                              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-danger"
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
          <SearchableSelect label="Клиент" value={form.client_id} onChange={value => setForm({ ...form, client_id: value })} options={clientOptions} />
          <Input label="Имя заявителя" value={form.requester_name} onChange={event => setForm({ ...form, requester_name: event.target.value })} />
          <Input label="Телефон заявителя" type="tel" value={form.requester_phone} onChange={event => setForm({ ...form, requester_phone: event.target.value })} />
          <Select label="Услуга" value={form.service_id} onChange={event => setForm({ ...form, service_id: event.target.value })} options={serviceOptions} required />
          <Input label="Дата и время" type="datetime-local" value={form.start_time} onChange={event => setForm({ ...form, start_time: event.target.value })} required />
          <Select label="Статус" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} options={statusOptions} />
          <Input label="Примечания" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
          <div className="modal-actions flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsBookingModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingBooking ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
