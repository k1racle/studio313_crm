import { useState, useMemo } from 'react'
import { addDays, startOfWeek, format, isSameDay, parseISO, setHours, setMinutes } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'

const START_HOUR = 8
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

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
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [weekStart, weekOffset])

  const getBookingsForDayAndHour = (day, hour) => {
    return bookings.filter(b => {
      const start = parseISO(b.start_time)
      return isSameDay(start, day) && start.getHours() === hour
    })
  }

  const getServiceColor = (serviceId) => serviceColors[(serviceId || 0) % serviceColors.length]

  const handleDragStart = (e, booking) => {
    setDraggingId(booking.id)
    e.dataTransfer.setData('text/plain', String(booking.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggingId(null)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, day, hour) => {
    e.preventDefault()
    const bookingId = e.dataTransfer.getData('text/plain')
    if (bookingId && onBookingMove) {
      const newStart = setMinutes(setHours(day, hour), 0)
      onBookingMove(Number(bookingId), newStart)
    }
    setDraggingId(null)
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-base md:text-lg font-semibold text-text">
          {format(days[0], 'dd MMM', { locale: ru })} — {format(days[6], 'dd MMM yyyy', { locale: ru })}
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-border">
            <div className="p-3 text-sm font-medium text-text-muted bg-subtle border-r border-border">Время</div>
            {days.map(day => (
              <div key={day.toISOString()} className="p-3 text-center bg-subtle border-r border-border last:border-r-0">
                <div className="text-sm font-semibold capitalize text-text">{format(day, 'EEEE', { locale: ru })}</div>
                <div className={`text-xs ${isSameDay(day, new Date()) ? 'text-primary font-bold' : 'text-text-muted'}`}>
                  {format(day, 'dd.MM')}
                </div>
              </div>
            ))}
          </div>
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0">
              <div className="p-2 text-xs text-center text-text-muted bg-subtle border-r border-border">{`${hour}:00`}</div>
              {days.map(day => {
                const slotBookings = getBookingsForDayAndHour(day, hour)
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`min-h-[90px] p-1 border-r border-border last:border-r-0 transition-colors ${draggingId ? 'bg-primary/5' : 'hover:bg-subtle'}`}
                    onClick={() => onSlotClick && onSlotClick(day, hour)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, hour)}
                  >
                    {slotBookings.map(b => (
                      <div
                        key={b.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, b)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => { e.stopPropagation(); onBookingClick?.(b) }}
                        className={`text-xs p-2 rounded-md border mb-1 cursor-grab active:cursor-grabbing ${getServiceColor(b.service?.id)} ${draggingId === b.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-1">
                          <GripVertical size={12} className="shrink-0 mt-0.5 opacity-60" />
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{b.service?.name}</div>
                            <div className="truncate">{b.client?.name}</div>
                            <div>{format(parseISO(b.start_time), 'HH:mm')} - {format(parseISO(b.end_time), 'HH:mm')}</div>
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
