import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/axios'
import Avatar from './ui/Avatar'
import { formatShortName } from '../utils/format'

const statusBorderColor = {
  new: 'border-blue-500',
  shooting: 'border-orange-500',
  editing: 'border-cyan-500',
  review: 'border-purple-500',
  corrections: 'border-pink-500',
  sent_to_client: 'border-green-500',
}

function formatYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalendarDays(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const startDay = (start.getDay() + 6) % 7
  const days = []
  const prevEnd = new Date(year, month, 0)
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevEnd.getDate() - i))
  }
  const monthEnd = new Date(year, month + 1, 0)
  for (let i = 1; i <= monthEnd.getDate(); i++) {
    days.push(new Date(year, month, i))
  }
  const tail = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= tail; i++) {
    days.push(new Date(year, month + 1, i))
  }
  return days
}

export default function ProductionCalendar({ items, onItemMoved, onItemClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  return (
    <div className="bg-surface rounded-xl border border-border overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-1.5 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="text-lg font-semibold text-text min-w-[170px] text-center capitalize">
              {currentMonth.toLocaleString('ru', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              type="button"
              onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-1.5 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="text-sm text-primary hover:underline"
          >
            Сегодня
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-border bg-subtle">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="px-2 py-2 text-xs font-medium text-text-muted text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {getCalendarDays(currentMonth).map((date, idx) => {
            const ymd = formatYMD(date)
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
            const isToday = ymd === formatYMD(new Date())
            const dayItems = items.filter(t => t.due_date && formatYMD(new Date(t.due_date)) === ymd)
            return (
              <div
                key={idx}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5') }}
                onDragLeave={e => { e.currentTarget.classList.remove('bg-primary/5') }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('bg-primary/5')
                  const itemId = e.dataTransfer.getData('production/id')
                  if (!itemId) return
                  const item = items.find(t => String(t.id) === itemId)
                  if (!item) return
                  const newDue = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
                  try {
                    await api.patch(`/production/${item.id}/`, { due_date: newDue.toISOString() })
                    onItemMoved()
                  } catch (err) {
                    console.error(err)
                    alert('Не удалось перенести заявку')
                  }
                }}
                className={`min-h-[140px] p-2 border-b border-r border-border flex flex-col gap-1 transition-colors ${
                  isCurrentMonth ? 'bg-surface' : 'bg-subtle/50'
                } ${isToday ? 'ring-1 ring-inset ring-primary bg-primary/5' : ''}`}
              >
                <div className={`text-xs font-medium text-right ${isToday ? 'text-primary' : isCurrentMonth ? 'text-text' : 'text-text-muted'}`}>
                  {date.getDate()}
                </div>
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                  {dayItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      draggable
                      onClick={() => onItemClick?.(item)}
                      onDragStart={e => e.dataTransfer.setData('production/id', String(item.id))}
                      className={`text-left text-xs px-2 py-1 rounded bg-subtle border-l-2 ${statusBorderColor[item.status] || 'border-gray-500'} hover:bg-hover cursor-grab active:cursor-grabbing`}
                      title={item.title}
                    >
                      <span className="line-clamp-2 leading-tight">{item.title}</span>
                      {item.assignee && (
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-text-muted">
                          <Avatar user={item.assignee} size={14} />
                          <span className="truncate">{formatShortName(item.assignee)}</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
