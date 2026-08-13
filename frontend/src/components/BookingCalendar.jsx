import { useMemo, useState } from 'react'
import { addDays, format, isSameDay, parseISO, setHours, setMinutes, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'

const START_HOUR = 8
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index)

const serviceColors = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
  'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800',
  'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200 border-pink-200 dark:border-pink-800',
]

export default function BookingCalendar({ bookings, services, onSlotClick, onBookingClick, onBookingMove }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [draggingId, setDraggingId] = useState(null)

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])

  const days = useMemo(() => {
    const start = addDays(weekStart, weekOffset * 7)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [weekOffset, weekStart])

  const getBookingsForDayAndHour = (day, hour) => bookings.filter(booking => {
    const start = parseISO(booking.start_time)
    return isSameDay(start, day) && start.getHours() === hour
  })

  const getServiceColor = (serviceId) => serviceColors[(serviceId || 0) % serviceColors.length]

  const handleDragStart = (event, booking) => {
    setDraggingId(booking.id)
    event.dataTransfer.setData('text/plain', String(booking.id))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggingId(null)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (event, day, hour) => {
    event.preventDefault()
    const bookingId = event.dataTransfer.getData('text/plain')
    if (bookingId && onBookingMove) {
      const newStart = setMinutes(setHours(day, hour), 0)
      onBookingMove(Number(bookingId), newStart)
    }
    setDraggingId(null)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border p-4">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-subtle hover:text-text"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-semibold text-text md:text-lg">
          {format(days[0], 'dd MMM', { locale: ru })} - {format(days[6], 'dd MMM yyyy', { locale: ru })}
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-subtle hover:text-text"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-border">
            <div className="border-r border-border bg-subtle p-3 text-sm font-medium text-text-muted">Время</div>
            {days.map(day => (
              <div key={day.toISOString()} className="border-r border-border bg-subtle p-3 text-center last:border-r-0">
                <div className="text-sm font-semibold capitalize text-text">{format(day, 'EEEE', { locale: ru })}</div>
                <div className={`text-xs ${isSameDay(day, new Date()) ? 'font-bold text-primary' : 'text-text-muted'}`}>
                  {format(day, 'dd.MM')}
                </div>
              </div>
            ))}
          </div>
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0">
              <div className="border-r border-border bg-subtle p-2 text-center text-xs text-text-muted">{`${hour}:00`}</div>
              {days.map(day => {
                const slotBookings = getBookingsForDayAndHour(day, hour)
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`min-h-[90px] border-r border-border p-1 transition-colors last:border-r-0 ${draggingId ? 'bg-primary/5' : 'hover:bg-subtle'}`}
                    onClick={() => onSlotClick && onSlotClick(day, hour)}
                    onDragOver={handleDragOver}
                    onDrop={event => handleDrop(event, day, hour)}
                  >
                    {slotBookings.map(booking => (
                      <div
                        key={booking.id}
                        draggable
                        onDragStart={event => handleDragStart(event, booking)}
                        onDragEnd={handleDragEnd}
                        onClick={event => {
                          event.stopPropagation()
                          onBookingClick?.(booking)
                        }}
                        className={`mb-1 cursor-grab rounded-md border p-2 text-xs active:cursor-grabbing ${getServiceColor(booking.service?.id)} ${draggingId === booking.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-1">
                          <GripVertical size={12} className="mt-0.5 shrink-0 opacity-60" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{booking.service?.name}</div>
                            <div className="truncate">{booking.contact_name || booking.client?.name || 'Без имени'}</div>
                            <div>{format(parseISO(booking.start_time), 'HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
