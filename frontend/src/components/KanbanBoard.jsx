import { useEffect, useRef, useState } from 'react'

import api from '../api/axios'
import { formatShortName } from '../utils/format'
import Avatar from './ui/Avatar'

const columns = [
  { key: 'new', title: 'Новые', accent: 'from-blue-500 to-blue-400' },
  { key: 'in_progress', title: 'В работе', accent: 'from-amber-400 to-yellow-300' },
  { key: 'approval', title: 'На согласовании', accent: 'from-pink-500 to-fuchsia-400' },
  { key: 'review', title: 'На проверке', accent: 'from-violet-500 to-purple-400' },
  { key: 'content_placement', title: 'Выкладка контента', accent: 'from-indigo-500 to-blue-500' },
  { key: 'done', title: 'Выполнены', accent: 'from-emerald-500 to-teal-400' },
]

const priorityStyles = {
  low: 'bg-[rgba(15,23,40,0.06)] text-text-muted',
  medium: 'bg-[rgba(34,80,255,0.12)] text-[color:#2449c7]',
  high: 'bg-[rgba(184,134,11,0.12)] text-[color:#916f12]',
  critical: 'bg-[rgba(195,65,76,0.12)] text-[color:#9c3340]',
}

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
}

const normalizeTaskStatus = (status) => (
  status === 'shooting' || status === 'editing' ? 'in_progress' : status
)

export default function KanbanBoard({ tasks, onTaskMoved, onTaskClick }) {
  const [dragging, setDragging] = useState(null)
  const topScrollRef = useRef(null)
  const boardRef = useRef(null)

  useEffect(() => {
    const top = topScrollRef.current
    const board = boardRef.current
    if (!top || !board) return

    const sync = (source, target) => () => {
      target.scrollLeft = source.scrollLeft
    }

    const onTopScroll = sync(top, board)
    const onBoardScroll = sync(board, top)

    top.addEventListener('scroll', onTopScroll)
    board.addEventListener('scroll', onBoardScroll)
    return () => {
      top.removeEventListener('scroll', onTopScroll)
      board.removeEventListener('scroll', onBoardScroll)
    }
  }, [])

  const handleDragStart = (task) => {
    setDragging(task)
  }

  const handleDrop = async (status) => {
    if (!dragging || normalizeTaskStatus(dragging.status) === status) return
    await api.patch(`/tasks/${dragging.id}/`, { status })
    setDragging(null)
    onTaskMoved()
  }

  return (
    <div className="space-y-3">
      <div ref={topScrollRef} className="hidden h-4 overflow-x-auto md:block">
        <div className="grid grid-flow-col auto-cols-[320px] gap-4 md:gap-5">
          {columns.map(column => (
            <div key={column.key} className="h-px" />
          ))}
        </div>
      </div>

      <div ref={boardRef} className="grid grid-flow-col auto-cols-[84vw] gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:auto-cols-[320px] md:gap-5">
        {columns.map(column => {
          const columnTasks = tasks.filter(task => normalizeTaskStatus(task.status) === column.key)
          return (
            <section
              key={column.key}
              className="soft-panel min-h-[540px] snap-start rounded-[30px] p-4"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(column.key)}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={`mb-3 h-1.5 w-20 rounded-full bg-gradient-to-r ${column.accent}`} />
                  <h3 className="text-base font-semibold text-text">{column.title}</h3>
                </div>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-surface/80 px-2 text-xs font-semibold text-text-muted shadow-[0_8px_18px_rgba(15,23,40,0.08)]">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnTasks.map(task => (
                  <article
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    className={`rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,255,0.98))] p-4 shadow-[0_12px_24px_rgba(15,23,40,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,40,0.1)] dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.94),rgba(14,21,31,0.98))] ${
                      dragging?.id === task.id ? 'opacity-55' : ''
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <button
                        onClick={() => onTaskClick?.(task.id)}
                        className="text-left text-[15px] font-semibold leading-6 text-text hover:text-primary"
                      >
                        {task.title}
                      </button>
                    </div>

                    {task.project && (
                      <div className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-primary">
                        {task.project.name}
                      </div>
                    )}

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {task.tags?.slice(0, 3).map(tag => (
                        <span
                          key={tag.id}
                          className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${priorityStyles[task.priority]}`}>
                        {priorityLabels[task.priority]}
                      </span>

                      {task.assignees?.length > 0 && (
                        <div className="flex items-center gap-1">
                          {task.assignees.slice(0, 2).map(user => (
                            <Avatar key={user.id} user={user} size={24} title={formatShortName(user)} />
                          ))}
                          {task.assignees.length > 2 && (
                            <span className="text-xs text-text-muted">+{task.assignees.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}

                {columnTasks.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-border/80 bg-surface/40 px-4 py-8 text-center text-sm text-text-muted">
                    В этой колонке пока нет задач
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
