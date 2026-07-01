import { useMemo } from 'react'
import { format, addDays, startOfWeek, differenceInDays, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ArrowRight } from 'lucide-react'

const DAY_WIDTH = 50

export default function GanttChart({ tasks, onTaskClick }) {
  const { startDate, endDate, days } = useMemo(() => {
    if (!tasks.length) {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 })
      const end = addDays(start, 13)
      const d = []
      for (let i = 0; i <= differenceInDays(end, start); i++) d.push(addDays(start, i))
      return { startDate: start, endDate: end, days: d }
    }
    const dates = tasks
      .filter(t => t.created_at)
      .map(t => new Date(t.created_at))
    const start = startOfWeek(new Date(Math.min(...dates)), { weekStartsOn: 1 })
    const end = addDays(new Date(Math.max(...dates)), 7)
    const d = []
    for (let i = 0; i <= differenceInDays(end, start); i++) d.push(addDays(start, i))
    return { startDate: start, endDate: end, days: d }
  }, [tasks])

  const getBarStyle = (task) => {
    const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at)
    const offset = differenceInDays(taskDate, startDate)
    const duration = task.due_date && task.created_at
      ? Math.max(differenceInDays(new Date(task.due_date), new Date(task.created_at)), 1)
      : 1
    return {
      left: `${offset * DAY_WIDTH}px`,
      width: `${duration * DAY_WIDTH}px`,
    }
  }

  const statusColors = {
    new: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    shooting: 'bg-orange-500',
    editing: 'bg-cyan-500',
    approval: 'bg-pink-500',
    review: 'bg-purple-500',
    content_placement: 'bg-indigo-500',
    done: 'bg-green-500',
    canceled: 'bg-gray-400',
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex border-b border-border">
            <div className="w-64 p-3 font-semibold text-sm border-r border-border bg-subtle sticky left-0 z-10 text-text">Задача</div>
            <div className="flex">
              {days.map(day => (
                <div
                  key={day.toISOString()}
                  className={`p-2 text-center text-xs border-r border-border ${isSameDay(day, new Date()) ? 'bg-primary/10' : 'bg-subtle'}`}
                  style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                >
                  <div className="font-medium text-text">{format(day, 'dd')}</div>
                  <div className="text-text-muted">{format(day, 'EEE', { locale: ru })}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Rows */}
          {tasks.map(task => (
            <div key={task.id} className="flex border-b border-border hover:bg-subtle">
              <div className="w-64 p-3 border-r border-border bg-surface sticky left-0 z-10">
                <button
                  onClick={() => onTaskClick?.(task.id)}
                  className="text-sm font-medium text-text hover:text-primary text-left line-clamp-1"
                >
                  {task.title}
                </button>
                <div className="text-xs text-text-muted">{task.project?.name || 'Без проекта'}</div>
              </div>
              <div className="relative" style={{ width: days.length * DAY_WIDTH }}>
                <div
                  className={`absolute top-3 h-6 rounded-md text-xs text-white flex items-center px-2 shadow-sm ${statusColors[task.status]}`}
                  style={getBarStyle(task)}
                >
                  {format(new Date(task.created_at), 'dd.MM')} {task.due_date && <><ArrowRight size={10} className="mx-1 inline" /> {format(new Date(task.due_date), 'dd.MM')}</>}
                </div>
              </div>
            </div>
          ))}
          {!tasks.length && (
            <div className="p-8 text-center text-text-muted">Нет задач для отображения</div>
          )}
        </div>
      </div>
    </div>
  )
}
