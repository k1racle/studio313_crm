import { useEffect, useMemo, useState } from 'react'
import { format, setHours, setMinutes } from 'date-fns'
import { CalendarDays, Check, Copy, CreditCard, ExternalLink, List, Mail, Pencil, Plus, Trash2 } from 'lucide-react'

import api from '../api/axios'
import BookingCalendar, { BookingFilters } from '../components/BookingCalendar'
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

const emptyFilters = {
  clientQuery: '',
  serviceId: '',
  statuses: [],
  paymentStatuses: [],
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

function getPaymentChoices(booking) {
  const servicePrice = Number(booking.service?.price || 0)
  const paidAmount = Number(booking.paid_amount || 0)
  const remainingAmount = Number(booking.remaining_amount || 0)
  const partialTarget = Math.round(servicePrice * 50) / 100
  const partialAmount = Math.min(Math.max(partialTarget - paidAmount, 0), remainingAmount)

  return {
    partialAmount,
    fullAmount: remainingAmount,
    canPartial: partialAmount > 0,
    canFull: remainingAmount > 0,
  }
}

function getBookingPaymentStatus(booking) {
  const price = Number(booking.service?.price || 0)
  const paid = Number(booking.paid_amount || 0)
  if (price > 0 && paid >= price) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

async function loadAllPages(path) {
  const firstResponse = await api.get(path)
  const firstPage = firstResponse.data
  if (!Array.isArray(firstPage?.results)) return firstPage
  if (!firstPage.count || firstPage.results.length >= firstPage.count || firstPage.results.length === 0) return firstPage.results

  const pageSize = firstPage.results.length
  const pageCount = Math.ceil(firstPage.count / pageSize)
  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => api.get(path, { params: { page: index + 2 } })),
  )
  return [firstPage, ...remainingPages.map(response => response.data)].flatMap(page => page.results || [])
}

export default function Bookings() {
  const { user } = useAuth()
  const canManage = user?.is_manager || user?.capabilities?.includes('bookings.manage')
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [clients, setClients] = useState([])
  const [filters, setFilters] = useState(emptyFilters)
  const [view, setView] = useState('calendar')
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentBooking, setPaymentBooking] = useState(null)
  const [paymentType, setPaymentType] = useState('partial')
  const [sendEmail, setSendEmail] = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)

  const load = async () => {
    const [bookingResponse, serviceResponse, clientResponse] = await Promise.all([
      loadAllPages('/booking/'),
      loadAllPages('/booking/services/'),
      loadAllPages('/clients/'),
    ])
    setBookings(bookingResponse)
    setServices(serviceResponse)
    setClients(clientResponse)
  }

  useEffect(() => {
    load()
  }, [])

  const filteredBookings = useMemo(() => {
    const query = filters.clientQuery.trim().toLocaleLowerCase('ru-RU')

    return bookings.filter(booking => {
      if (query) {
        const clientSearchValue = [
          booking.contact_name,
          booking.contact_phone,
          booking.client?.name,
          booking.client?.phone,
          booking.client?.email,
        ].filter(Boolean).join(' ').toLocaleLowerCase('ru-RU')
        if (!clientSearchValue.includes(query)) return false
      }
      if (filters.serviceId && String(booking.service?.id) !== String(filters.serviceId)) return false
      if (filters.statuses.length > 0 && !filters.statuses.includes(booking.status)) return false
      if (filters.paymentStatuses.length > 0 && !filters.paymentStatuses.includes(getBookingPaymentStatus(booking))) return false
      return true
    })
  }, [bookings, filters])

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

  const handleSlotClick = (day, hour, minute = 0) => {
    const dateTime = setMinutes(setHours(day, hour), minute)
    setEditingBooking(null)
    setForm({ ...emptyForm, start_time: format(dateTime, "yyyy-MM-dd'T'HH:mm") })
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
    if (!window.confirm(`Удалить запись «${booking.service?.name}» для ${booking.contact_name || 'клиента'}?`)) return
    await api.delete(`/booking/${booking.id}/`)
    await load()
  }

  const openPaymentModal = (booking) => {
    const choices = getPaymentChoices(booking)
    setPaymentBooking(booking)
    setPaymentType(choices.canPartial ? 'partial' : 'full')
    setSendEmail(Boolean(booking.client?.email))
    setPaymentResult(null)
    setIsPaymentModalOpen(true)
  }

  const createPaymentLink = async (event) => {
    event.preventDefault()
    if (!paymentBooking) return

    setIsCreatingPayment(true)
    try {
      const response = await api.post('/payments/', {
        booking: paymentBooking.id,
        payment_type: paymentType,
        send_email: sendEmail,
      })
      setPaymentResult(response.data)
      await load()
    } catch (error) {
      alert(formatError(error))
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const copyPaymentLink = async () => {
    if (!paymentResult?.payment_url) return
    await navigator.clipboard.writeText(paymentResult.payment_url)
  }

  const clientOptions = [{ value: '', label: 'Выберите клиента' }, ...clients.map((client) => ({ value: client.id, label: client.name }))]
  const serviceOptions = [{ value: '', label: 'Выберите услугу' }, ...services.map((service) => ({ value: service.id, label: `${service.name} (${service.duration_minutes} мин)` }))]

  const headerActions = useMemo(() => (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex gap-2 rounded-full border border-border/70 bg-surface/75 p-1">
        {[
          { key: 'calendar', label: 'Календарь', icon: CalendarDays },
          { key: 'list', label: 'Список', icon: List },
        ].map((item) => {
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
      {canManage && (
        <Button onClick={openCreate}>
          <Plus size={16} />
          Новая запись
        </Button>
      )}
    </div>
  ), [canManage, view])

  usePageHeaderContent(headerActions)

  const paymentChoices = paymentBooking ? getPaymentChoices(paymentBooking) : null

  return (
    <div>
      {view === 'calendar' && (
        <BookingCalendar
          bookings={filteredBookings}
          services={services}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters(emptyFilters)}
          totalBookingsCount={bookings.length}
          onSlotClick={handleSlotClick}
          onBookingClick={openEdit}
          onBookingMove={handleBookingMove}
        />
      )}

      {view === 'list' && (
        <div className="grid items-start gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
          <BookingFilters
            services={services}
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyFilters)}
            shownCount={filteredBookings.length}
            totalCount={bookings.length}
          />
          <Card className="min-w-0 overflow-hidden">
            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full min-w-[1080px]">
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
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="font-semibold text-text">По выбранным фильтрам записей нет</div>
                      <button type="button" onClick={() => setFilters(emptyFilters)} className="mt-2 text-xs font-semibold text-primary hover:underline">
                        Сбросить фильтры
                      </button>
                    </td>
                  </tr>
                )}
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-border hover:bg-subtle">
                    <td className="py-3 text-text">
                      <div className="font-medium">{booking.contact_name || '—'}</div>
                      <div className="text-xs text-text-muted">{booking.contact_phone || 'Без телефона'}</div>
                      {booking.client?.email && <div className="text-xs text-text-muted">{booking.client.email}</div>}
                      {booking.is_pending_request && <div className="mt-1 text-xs font-medium text-primary">Публичная заявка без привязанного клиента</div>}
                    </td>
                    <td className="py-3 text-text">{booking.service?.name}</td>
                    <td className="py-3 text-text-muted">{new Date(booking.start_time).toLocaleString('ru-RU')}</td>
                    <td className="py-3">
                      <Badge variant={statusBadgeVariant[booking.status]}>{statusLabels[booking.status]}</Badge>
                    </td>
                    <td className="py-3 text-text">{booking.service?.price} ₽</td>
                    <td className="py-3 font-medium text-success">{booking.paid_amount} ₽</td>
                    <td className="py-3 text-text-muted">{booking.remaining_amount} ₽</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {Number(booking.remaining_amount || 0) > 0 && (
                          <Button size="sm" onClick={() => openPaymentModal(booking)}>
                            <CreditCard size={14} className="mr-1" />
                            Ссылка на оплату
                          </Button>
                        )}
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(booking)}
                              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-primary"
                              title="Изменить"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
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
        </div>
      )}

      <Modal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} title={editingBooking ? 'Изменить запись' : 'Новая запись'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect label="Клиент" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value })} options={clientOptions} />
          <Input label="Имя заявителя" value={form.requester_name} onChange={(event) => setForm({ ...form, requester_name: event.target.value })} />
          <Input label="Телефон заявителя" type="tel" value={form.requester_phone} onChange={(event) => setForm({ ...form, requester_phone: event.target.value })} />
          <Select label="Услуга" value={form.service_id} onChange={(event) => setForm({ ...form, service_id: event.target.value })} options={serviceOptions} required />
          <Input label="Дата и время" type="datetime-local" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} required />
          <Select label="Статус" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} options={statusOptions} />
          <Input label="Примечания" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsBookingModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingBooking ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Ссылка на оплату">
        {paymentBooking && paymentChoices && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-subtle/60 p-4">
              <div className="text-sm font-medium text-text">{paymentBooking.contact_name}</div>
              <div className="mt-1 text-sm text-text-muted">{paymentBooking.service?.name}</div>
              <div className="mt-1 text-sm text-text-muted">Остаток к оплате: {paymentChoices.fullAmount} ₽</div>
              <div className="mt-1 text-sm text-text-muted">Email: {paymentBooking.client?.email || 'не указан'}</div>
            </div>

            <form onSubmit={createPaymentLink} className="space-y-4">
              <div className="space-y-2">
                {paymentChoices.canPartial && (
                  <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${paymentType === 'partial' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <input type="radio" name="payment_type" value="partial" checked={paymentType === 'partial'} onChange={() => setPaymentType('partial')} />
                    <div>
                      <div className="font-medium text-text">Частичная оплата 50%</div>
                      <div className="text-sm text-text-muted">Клиент оплатит {paymentChoices.partialAmount} ₽.</div>
                    </div>
                  </label>
                )}
                {paymentChoices.canFull && (
                  <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${paymentType === 'full' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <input type="radio" name="payment_type" value="full" checked={paymentType === 'full'} onChange={() => setPaymentType('full')} />
                    <div>
                      <div className="font-medium text-text">Полная оплата</div>
                      <div className="text-sm text-text-muted">Клиент оплатит {paymentChoices.fullAmount} ₽.</div>
                    </div>
                  </label>
                )}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-border p-4 text-sm text-text">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(event) => setSendEmail(event.target.checked)}
                  disabled={!paymentBooking.client?.email}
                />
                Сразу отправить ссылку клиенту на email
                {!paymentBooking.client?.email && <span className="text-text-muted">(email не указан)</span>}
              </label>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>Закрыть</Button>
                <Button type="submit" disabled={isCreatingPayment}>
                  <Mail size={16} className="mr-1.5" />
                  {isCreatingPayment ? 'Создаем...' : 'Создать ссылку'}
                </Button>
              </div>
            </form>

            {paymentResult && (
              <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2 font-medium text-text">
                  <Check size={16} />
                  Ссылка создана
                </div>
                <div className="mt-2 break-all text-sm text-text-muted">{paymentResult.payment_url}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {paymentResult.payment_url && (
                    <a href={paymentResult.payment_url} target="_blank" rel="noreferrer">
                      <Button type="button" size="sm">
                        <ExternalLink size={14} className="mr-1" />
                        Открыть
                      </Button>
                    </a>
                  )}
                  {paymentResult.payment_url && (
                    <Button type="button" size="sm" variant="secondary" onClick={copyPaymentLink}>
                      <Copy size={14} className="mr-1" />
                      Скопировать
                    </Button>
                  )}
                  {paymentResult.email_sent_at && (
                    <div className="flex items-center text-sm text-success">Письмо клиенту отправлено.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
