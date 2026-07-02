import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { formatShortName } from '../utils/format'
import Avatar from './ui/Avatar'

const columns = [
  { key: 'new', title: 'Новая', color: 'border-blue-400' },
  { key: 'shooting', title: 'Съёмка', color: 'border-orange-400' },
  { key: 'editing', title: 'Монтаж', color: 'border-cyan-400' },
  { key: 'review', title: 'Отсмотр', color: 'border-purple-400' },
  { key: 'corrections', title: 'Внесение правок', color: 'border-pink-400' },
  { key: 'sent_to_client', title: 'Отправлено клиенту', color: 'border-green-400' },
]

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
    <div>
      <div ref={topScrollRef} className="overflow-x-auto h-4 mb-2">
        <div className="grid grid-flow-col auto-cols-[280px] gap-4">
          {columns.map(col => (
            <div key={col.key} className="h-px" />
          ))}
        </div>
      </div>
      <div ref={boardRef} className="grid grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const colItems = items.filter(t => t.status === col.key)
          return (
            <div
              key={col.key}
              className="bg-subtle rounded-xl p-3 min-h-[400px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.key)}
            >
              <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.color}`}>
                <h3 className="font-semibold text-text">{col.title}</h3>
                <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">{colItems.length}</span>
              </div>
              <div className="space-y-3">
                {colItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item)}
                    className={`bg-surface p-4 rounded-lg shadow-sm border border-border cursor-move hover:shadow-md transition-shadow ${dragging?.id === item.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <button
                        onClick={() => onItemClick?.(item)}
                        className="font-medium text-text hover:text-primary text-left line-clamp-2"
                      >
                        {item.title}
                      </button>
                    </div>
                    {item.project && (
                      <div className="text-xs text-primary mb-2">{item.project.name}</div>
                    )}
                    <div className="flex items-center justify-between">
                      {item.assignee && (
                        <div className="flex items-center gap-1.5" title={formatShortName(item.assignee)}>
                          <Avatar user={item.assignee} size={24} />
                          <span className="text-xs text-text-muted">{formatShortName(item.assignee)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
