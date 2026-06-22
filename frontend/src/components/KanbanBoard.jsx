import { useState } from 'react'
import api from '../api/axios'

const columns = [
  { key: 'new', title: 'Новые', color: 'border-blue-400' },
  { key: 'in_progress', title: 'В работе', color: 'border-yellow-400' },
  { key: 'review', title: 'На проверке', color: 'border-purple-400' },
  { key: 'done', title: 'Выполнены', color: 'border-green-400' },
]

const priorityColors = {
  low: 'bg-subtle text-text-muted',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
}

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
}

export default function KanbanBoard({ tasks, onTaskMoved, onTaskClick }) {
  const [dragging, setDragging] = useState(null)

  const handleDragStart = (task) => {
    setDragging(task)
  }

  const handleDrop = async (status) => {
    if (!dragging || dragging.status === status) return
    await api.patch(`/tasks/${dragging.id}/`, { status })
    setDragging(null)
    onTaskMoved()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key)
        return (
          <div
            key={col.key}
            className="bg-subtle rounded-xl p-3 min-h-[400px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.color}`}>
              <h3 className="font-semibold text-text">{col.title}</h3>
              <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">{colTasks.length}</span>
            </div>
            <div className="space-y-3">
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  className={`bg-surface p-4 rounded-lg shadow-sm border border-border cursor-move hover:shadow-md transition-shadow ${dragging?.id === task.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button
                      onClick={() => onTaskClick?.(task.id)}
                      className="font-medium text-text hover:text-primary text-left line-clamp-2"
                    >
                      {task.title}
                    </button>
                  </div>
                  {task.project && (
                    <div className="text-xs text-primary mb-2">{task.project.name}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                      {priorityLabels[task.priority]}
                    </span>
                    {task.assignee && (
                      <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center" title={task.assignee.first_name || task.assignee.username}>
                        {(task.assignee.first_name?.[0] || task.assignee.username?.[0]).toUpperCase()}
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
  )
}
