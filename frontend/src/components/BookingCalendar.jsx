import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'

const START_HOUR = 8
const END_HOUR = 22
const SLOT_MINUTES = 30
const SLOT_HEIGHT = 48
const SLOTS_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES
const GRID_HEIGHT = SLOTS_COUNT * SLOT_HEIGHT

const serviceColors = [
  'border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100',
  'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
  'border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100',
  'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
  'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100',
]

const paymentStyles = {
  paid: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950',
  partial: 'bg-amber-500 text-amber-950 dark:bg-amber-400',
  unpaid: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white',
}

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

function toDateKey(value) {
  return format(typeof value === 'string' ? parseISO(value) : value, 'yyyy-MM-dd')
}

function getPaymentStatus(booking) {
  const price = Number(booking.service?.price || 0)
  const paid = Number(booking.paid_amount || 0)

  if (price > 0 && paid >= price) return { key: 'paid', label: 'Полностью', detail: `${moneyFormatter.format(paid)} ₽ из ${moneyFormatter.format(price)} ₽` }
  if (paid > 0) return { key: 'partial', label: 'Частично', detail: `${moneyFormatter.format(paid)} ₽ из ${moneyFormatter.format(price)} ₽` }
  return { key: 'unpaid', label: 'Не оплачено', detail: `К оплате ${moneyFormatter.format(price)} ₽` }
}

function getMinutesFromStart(date) {
  return date.getHours() * 60 + date.getMinutes() - START_HOUR * 60
}

function formatBookingCount(count) {
  const lastTwoDigits = count % 100
  const lastDigit = count % 10
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} записей`
  if (lastDigit === 1) return `${count} запись`
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} записи`
  return `${count} записей`
}

function MiniCalendar({ bookings, month, selectedWeekStart, onMonthChange, onDateSelect }) {
  const monthStart = startOfMonth(month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const monthEnd = endOfMonth(monthStart)
  const rowsNeeded = Math.ceil((differenceInCalendarDays(monthEnd, calendarStart) + 1) / 7)
  const calendarDays = Array.from({ length: rowsNeeded * 7 }, (_, index) => addDays(calendarStart, index))
  const selectedWeekEnd = addDays(selectedWeekStart, 6)
  const bookedDates = useMemo(
    () => new Set(bookings.filter(booking => booking.status !== 'canceled').map(booking => toDateKey(booking.start_time))),
    [bookings],
  )

  return (
    <aside className="w-full max-w-[340px] rounded-2xl border border-border bg-surface p-4 shadow-[0_14px_40px_rgba(15,23,40,0.05)] xl:max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Календарь</div>
          <div className="mt-1 text-sm font-bold capitalize text-text">{format(monthStart, 'LLLL yyyy', { locale: ru })}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(monthStart, -1))}
            className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-subtle hover:text-text"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(monthStart, 1))}
            className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-subtle hover:text-text"
            aria-label="Следующий месяц"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-text-muted">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1">
        {calendarDays.map(day => {
          const inSelectedWeek = day >= selectedWeekStart && day <= selectedWeekEnd
          const isToday = isSameDay(day, new Date())
          const hasBooking = bookedDates.has(toDateKey(day))

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateSelect(day)}
              className={`relative mx-auto grid h-8 w-8 place-items-center rounded-lg text-xs font-medium ${
                isToday
                  ? 'bg-primary text-white shadow-[0_6px_14px_rgba(34,80,255,0.24)]'
                  : inSelectedWeek
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-subtle'
              } ${!isSameMonth(day, monthStart) ? 'opacity-35' : ''}`}
              aria-label={`${format(day, 'd MMMM', { locale: ru })}${hasBooking ? ', есть записи' : ''}`}
            >
              {format(day, 'd')}
              {hasBooking && (
                <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isToday ? 'bg-white' : 'bg-primary'}`} />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Точка — на дату есть запись
      </div>
    </aside>
  )
}

function BookingCard({ booking, top, height, dragging, onClick, onDragStart, onDragEnd }) {
  const payment = getPaymentStatus(booking)
  const start = parseISO(booking.start_time)
  const end = parseISO(booking.end_time)
  const isCompact = height < 70

  return (
    <div
      draggable
      onDragStart={event => onDragStart(event, booking)}
      onDragEnd={onDragEnd}
      onClick={event => {
        event.stopPropagation()
        onClick?.(booking)
      }}
      className={`absolute left-1 right-1 z-20 cursor-grab overflow-hidden rounded-lg border px-2 py-1.5 text-[11px] shadow-[0_6px_18px_rgba(15,23,40,0.10)] active:cursor-grabbing ${
        serviceColors[(booking.service?.id || 0) % serviceColors.length]
      } ${dragging ? 'opacity-40' : ''} ${booking.status === 'canceled' ? 'grayscale opacity-55' : ''}`}
      style={{ top, height }}
      title={`${booking.service?.name || 'Запись'} · ${payment.detail}`}
    >
      <div className="flex min-w-0 items-center gap-1 text-[9px]">
        <span className="shrink-0 font-bold tabular-nums">{format(start, 'HH:mm')}–{format(end, 'HH:mm')}</span>
        <span className={`ml-auto shrink-0 rounded px-1 py-0.5 text-[8px] font-extrabold leading-none ${paymentStyles[payment.key]}`}>
          {payment.label}
        </span>
      </div>
      <div className="mt-0.5 truncate font-bold leading-tight">{booking.service?.name || 'Без услуги'}</div>
      {!isCompact && (
        <>
          <div className="mt-0.5 truncate opacity-75">{booking.contact_name || booking.client?.name || 'Без имени'}</div>
          <div className="mt-1 truncate text-[10px] font-medium opacity-70">{payment.detail}</div>
        </>
      )}
    </div>
  )
}

export default function BookingCalendar({ bookings, onSlotClick, onBookingClick, onBookingMove }) {
  const todayWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])
  const [selectedWeekStart, setSelectedWeekStart] = useState(todayWeekStart)
  const [month, setMonth] = useState(startOfMonth(todayWeekStart))
  const [draggingId, setDraggingId] = useState(null)

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(selectedWeekStart, index)),
    [selectedWeekStart],
  )
  const slots = useMemo(() => Array.from({ length: SLOTS_COUNT }, (_, index) => index), [])
  const timeLabels = useMemo(() => Array.from({ length: SLOTS_COUNT / 2 + 1 }, (_, index) => START_HOUR + index), [])

  const bookingsByDay = useMemo(() => {
    const grouped = new Map(days.map(day => [toDateKey(day), []]))
    bookings.forEach(booking => {
      const key = toDateKey(booking.start_time)
      if (grouped.has(key)) grouped.get(key).push(booking)
    })
    return grouped
  }, [bookings, days])

  const selectDate = (date) => {
    const nextWeekStart = startOfWeek(date, { weekStartsOn: 1 })
    setSelectedWeekStart(nextWeekStart)
    setMonth(startOfMonth(date))
  }

  const moveWeek = (amount) => {
    const nextWeekStart = addDays(selectedWeekStart, amount * 7)
    setSelectedWeekStart(nextWeekStart)
    setMonth(startOfMonth(nextWeekStart))
  }

  const goToday = () => {
    setSelectedWeekStart(todayWeekStart)
    setMonth(startOfMonth(new Date()))
  }

  const handleDragStart = (event, booking) => {
    setDraggingId(booking.id)
    event.dataTransfer.setData('text/plain', String(booking.id))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (event, day, slotIndex) => {
    event.preventDefault()
    event.stopPropagation()
    const bookingId = event.dataTransfer.getData('text/plain')
    if (bookingId && onBookingMove) {
      const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES
      const newStart = setMinutes(setHours(day, Math.floor(totalMinutes / 60)), totalMinutes % 60)
      onBookingMove(Number(bookingId), newStart)
    }
    setDraggingId(null)
  }

  const weekBookingsCount = Array.from(bookingsByDay.values()).reduce((total, dayBookings) => (
    total + dayBookings.filter(booking => booking.status !== 'canceled').length
  ), 0)

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
      <MiniCalendar
        bookings={bookings}
        month={month}
        selectedWeekStart={selectedWeekStart}
        onMonthChange={setMonth}
        onDateSelect={selectDate}
      />

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_50px_rgba(15,23,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text hover:border-primary hover:text-primary"
            >
              Сегодня
            </button>
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button type="button" onClick={() => moveWeek(-1)} className="grid h-9 w-9 place-items-center text-text-muted hover:bg-subtle hover:text-text" aria-label="Предыдущая неделя">
                <ChevronLeft size={17} />
              </button>
              <button type="button" onClick={() => moveWeek(1)} className="grid h-9 w-9 place-items-center border-l border-border text-text-muted hover:bg-subtle hover:text-text" aria-label="Следующая неделя">
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="ml-1">
              <div className="text-sm font-bold text-text">
                {format(days[0], 'd MMMM', { locale: ru })} — {format(days[6], 'd MMMM yyyy', { locale: ru })}
              </div>
              <div className="text-[11px] text-text-muted">{formatBookingCount(weekBookingsCount)} на неделе</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
            <span className="text-text-muted">Оплата:</span>
            <span className={`rounded px-2 py-1 ${paymentStyles.paid}`}>Полностью</span>
            <span className={`rounded px-2 py-1 ${paymentStyles.partial}`}>Частично</span>
            <span className={`rounded px-2 py-1 ${paymentStyles.unpaid}`}>Не оплачено</span>
          </div>
        </div>

        <div className="overflow-auto">
          <div className="min-w-[1050px]">
            <div className="sticky top-0 z-30 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border bg-surface/95 backdrop-blur">
              <div className="flex items-center justify-center border-r border-border text-text-muted">
                <CalendarDays size={17} />
              </div>
              {days.map(day => {
                const count = (bookingsByDay.get(toDateKey(day)) || []).filter(booking => booking.status !== 'canceled').length
                const isToday = isSameDay(day, new Date())
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => selectDate(day)}
                    className={`border-r border-border px-3 py-3 text-left last:border-r-0 ${isToday ? 'bg-primary/[0.06]' : 'hover:bg-subtle'}`}
                  >
                    <div className={`text-[10px] font-bold uppercase tracking-[0.08em] ${isToday ? 'text-primary' : 'text-text-muted'}`}>
                      {format(day, 'EEEE', { locale: ru })}
                    </div>
                    <div className="mt-0.5 flex items-end justify-between gap-2">
                      <span className={`text-xl font-extrabold ${isToday ? 'text-primary' : 'text-text'}`}>{format(day, 'd MMM', { locale: ru })}</span>
                      {count > 0 && <span className="mb-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">{count}</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-[72px_minmax(0,1fr)]">
              <div className="relative border-r border-border bg-subtle/35" style={{ height: GRID_HEIGHT }}>
                {timeLabels.map(hour => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 flex -translate-y-1/2 items-center justify-center gap-1 text-[10px] font-semibold tabular-nums text-text-muted"
                    style={{ top: (hour - START_HOUR) * SLOT_HEIGHT * 2 }}
                  >
                    <Clock3 size={10} />
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {days.map(day => {
                  const dayBookings = bookingsByDay.get(toDateKey(day)) || []
                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative border-r border-border last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary/[0.025]' : ''}`}
                      style={{
                        height: GRID_HEIGHT,
                        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 47px, var(--border) 48px, transparent 49px, transparent 95px, color-mix(in srgb, var(--border) 72%, transparent) 96px)',
                        backgroundSize: `100% ${SLOT_HEIGHT * 2}px`,
                      }}
                    >
                      {slots.map(slotIndex => {
                        const slotMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES
                        const hour = Math.floor(slotMinutes / 60)
                        const minute = slotMinutes % 60
                        return (
                          <button
                            key={slotIndex}
                            type="button"
                            className={`absolute left-0 right-0 z-10 hover:bg-primary/[0.055] ${draggingId ? 'hover:bg-primary/10' : ''}`}
                            style={{ top: slotIndex * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                            onClick={() => onSlotClick?.(day, hour, minute)}
                            onDragOver={event => {
                              event.preventDefault()
                              event.dataTransfer.dropEffect = 'move'
                            }}
                            onDrop={event => handleDrop(event, day, slotIndex)}
                            aria-label={`Новая запись ${format(day, 'd MMMM', { locale: ru })} в ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
                          />
                        )
                      })}

                      {dayBookings.map(booking => {
                        const start = parseISO(booking.start_time)
                        const end = parseISO(booking.end_time)
                        const startMinutes = Math.max(0, getMinutesFromStart(start))
                        const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60000)
                        const top = (startMinutes / SLOT_MINUTES) * SLOT_HEIGHT + 2
                        const height = Math.min((durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT - 4, GRID_HEIGHT - top)

                        if (top >= GRID_HEIGHT || height <= 0) return null

                        return (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            top={top}
                            height={height}
                            dragging={draggingId === booking.id}
                            onClick={onBookingClick}
                            onDragStart={handleDragStart}
                            onDragEnd={() => setDraggingId(null)}
                          />
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
