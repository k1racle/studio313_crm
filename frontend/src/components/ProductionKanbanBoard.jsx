import { useEffect, useRef, useState } from 'react'

import api from '../api/axios'
import { formatShortName } from '../utils/format'
import Avatar from './ui/Avatar'

const columns = [
  { key: 'new', title: 'Новые', accent: 'from-blue-500 to-blue-400' },
  { key: 'shooting', title: 'Съёмка', accent: 'from-amber-400 to-yellow-300' },
  { key: 'editing', title: 'Монтаж', accent: 'from-cyan-500 to-sky-400' },
  { key: 'review', title: 'Отсмотр', accent: 'from-violet-500 to-purple-400' },
  { key: 'corrections', title: 'Правки', accent: 'from-pink-500 to-fuchsia-400' },
  { key: 'sent_to_client', title: 'Отправлено', accent: 'from-emerald-500 to-teal-400' },
]

const dueDateStyles = {
  overdue: 'bg-[rgba(195,65,76,0.12)] text-[color:#9c3340]',
  upcoming: 'bg-[rgba(184,134,11,0.12)] text-[color:#916f12]',
  neutral: 'bg-[rgba(15,23,40,0.06)] text-text-muted',
}

function getDueDateMeta(dueDate) {
  if (!dueDate) {
    return { label: 'Без срока', className: dueDateStyles.neutral }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(dueDate)
  target.setHours(0, 0, 0, 0)

  if (target < today) {
    return { label: target.toLocaleDateString('ru-RU'), className: dueDateStyles.overdue }
  }

  return { label: target.toLocaleDateString('ru-RU'), className: dueDateStyles.upcoming }
}

export default function ProductionKanbanBoard({ items, onItemMoved, onItemClick }) {
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

  const handleDragStart = (item) => {
    setDragging(item)
  }

  const handleDrop = async (status) => {
    if (!dragging || dragging.status === status) return
    await api.patch(`/production/${dragging.id}/`, { status })
    setDragging(null)
    onItemMoved()
  }

  return (
    <div className="space-y-3">
      <div ref={topScrollRef} className="h-4 overflow-x-auto">
        <div className="grid grid-flow-col auto-cols-[320px] gap-5">
          {columns.map(column => (
            <div key={column.key} className="h-px" />
          ))}
        </div>
      </div>

      <div ref={boardRef} className="grid grid-flow-col auto-cols-[320px] gap-5 overflow-x-auto pb-4">
        {columns.map(column => {
          const columnItems = items.filter(item => item.status === column.key)

          return (
            <section
              key={column.key}
              className="soft-panel min-h-[540px] rounded-[30px] p-4"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(column.key)}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={`mb-3 h-1.5 w-20 rounded-full bg-gradient-to-r ${column.accent}`} />
                  <h3 className="text-base font-semibold text-text">{column.title}</h3>
                </div>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-surface/80 px-2 text-xs font-semibold text-text-muted shadow-[0_8px_18px_rgba(15,23,40,0.08)]">
                  {columnItems.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnItems.map(item => {
                  const dueDateMeta = getDueDateMeta(item.due_date)

                  return (
                    <article
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item)}
                      className={`rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,255,0.98))] p-4 shadow-[0_12px_24px_rgba(15,23,40,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,40,0.1)] dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.94),rgba(14,21,31,0.98))] ${
                        dragging?.id === item.id ? 'opacity-55' : ''
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <button
                          onClick={() => onItemClick?.(item)}
                          className="text-left text-[15px] font-semibold leading-6 text-text hover:text-primary"
                        >
                          {item.title}
                        </button>
                      </div>

                      {item.project && (
                        <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
                          {item.project.name}
                        </div>
                      )}

                      {item.client && (
                        <div className="mb-3 text-xs text-text-muted">
                          {item.client.name}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${dueDateMeta.className}`}>
                          {dueDateMeta.label}
                        </span>

                        {item.assignees?.length > 0 && (
                          <div className="flex items-center gap-1">
                            {item.assignees.slice(0, 2).map(user => (
                              <Avatar key={user.id} user={user} size={24} title={formatShortName(user)} />
                            ))}
                            {item.assignees.length > 2 && (
                              <span className="text-xs text-text-muted">+{item.assignees.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}

                {columnItems.length === 0 && (
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
