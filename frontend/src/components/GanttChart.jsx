import { useMemo } from 'react'
import { addDays, differenceInDays, format, isSameDay, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ArrowRight } from 'lucide-react'

const DAY_WIDTH = 56

const normalizeTaskStatus = (status) => (
  status === 'shooting' || status === 'editing' ? 'in_progress' : status
)

const statusColors = {
  new: 'bg-blue-500',
  in_progress: 'bg-amber-400',
  approval: 'bg-pink-500',
  review: 'bg-violet-500',
  content_placement: 'bg-indigo-500',
  corrections: 'bg-pink-500',
  sent_to_client: 'bg-emerald-500',
  done: 'bg-emerald-500',
  canceled: 'bg-slate-400',
}

export default function GanttChart({ tasks, onTaskClick }) {
  const { startDate, days } = useMemo(() => {
    if (!tasks.length) {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 })
      const end = addDays(start, 13)
      const items = []
      for (let i = 0; i <= differenceInDays(end, start); i += 1) items.push(addDays(start, i))
      return { startDate: start, days: items }
    }

    const dates = tasks
      .filter(task => task.created_at)
      .map(task => new Date(task.created_at))
    const start = startOfWeek(new Date(Math.min(...dates)), { weekStartsOn: 1 })
    const end = addDays(new Date(Math.max(...dates)), 7)
    const items = []
    for (let i = 0; i <= differenceInDays(end, start); i += 1) items.push(addDays(start, i))
    return { startDate: start, days: items }
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

  return (
    <section className="soft-panel overflow-hidden rounded-[32px]">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex border-b border-border/70">
            <div className="sticky left-0 z-10 w-72 border-r border-border/70 bg-surface/90 p-4 text-sm font-semibold text-text backdrop-blur">
              Задача
            </div>
            <div className="flex">
              {days.map(day => (
                <div
                  key={day.toISOString()}
                  className={`border-r border-border/60 p-2 text-center text-xs ${isSameDay(day, new Date()) ? 'bg-primary/10' : 'bg-subtle/70'}`}
                  style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                >
                  <div className="font-semibold text-text">{format(day, 'dd')}</div>
                  <div className="uppercase tracking-[0.08em] text-text-muted">{format(day, 'EEE', { locale: ru })}</div>
                </div>
              ))}
            </div>
          </div>

          {tasks.map(task => (
            <div key={task.id} className="flex border-b border-border/60 last:border-b-0 hover:bg-subtle/35">
              <div className="sticky left-0 z-10 w-72 border-r border-border/60 bg-surface/92 p-4 backdrop-blur">
                <button
                  onClick={() => onTaskClick?.(task.id)}
                  className="line-clamp-1 text-left text-sm font-semibold text-text hover:text-primary"
                >
                  {task.title}
                </button>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-text-muted">
                  {task.project?.name || 'Без проекта'}
                </div>
              </div>
              <div className="relative h-[72px]" style={{ width: days.length * DAY_WIDTH }}>
                <div
                  className={`absolute top-5 flex h-8 items-center rounded-full px-3 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,23,40,0.14)] ${statusColors[normalizeTaskStatus(task.status)] || 'bg-slate-400'}`}
                  style={getBarStyle(task)}
                >
                  {format(new Date(task.created_at), 'dd.MM')}
                  {task.due_date && (
                    <>
                      <ArrowRight size={10} className="mx-1.5" />
                      {format(new Date(task.due_date), 'dd.MM')}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!tasks.length && (
            <div className="p-10 text-center text-sm text-text-muted">Нет задач для отображения</div>
          )}
        </div>
      </div>
    </section>
  )
}
