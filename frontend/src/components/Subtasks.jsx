import { useEffect, useState } from 'react'
import api from '../api/axios'
import Input from './ui/Input'
import Button from './ui/Button'
import { Plus, Trash2, Check } from 'lucide-react'

export default function Subtasks({ parentId, listEndpoint, detailEndpointPrefix }) {
  const [items, setItems] = useState([])
  const [newTitle, setNewTitle] = useState('')

  const load = async () => {
    if (!parentId) return
    try {
      const res = await api.get(listEndpoint)
      setItems(res.data.results || res.data)
    } catch (err) {
      console.error('Ошибка загрузки подзадач:', err)
    }
  }

  useEffect(() => {
    load()
  }, [parentId, listEndpoint])

  const add = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      await api.post(listEndpoint, { title: newTitle.trim() })
      setNewTitle('')
      load()
    } catch (err) {
      console.error('Ошибка добавления подзадачи:', err)
      alert('Не удалось добавить подзадачу')
    }
  }

  const toggle = async (item) => {
    try {
      await api.patch(`${detailEndpointPrefix}/${item.id}/`, { is_done: !item.is_done })
      load()
    } catch (err) {
      console.error('Ошибка обновления подзадачи:', err)
    }
  }

  const remove = async (item) => {
    if (!confirm(`Удалить подзадачу «${item.title}»?`)) return
    try {
      await api.delete(`${detailEndpointPrefix}/${item.id}/`)
      load()
    } catch (err) {
      console.error('Ошибка удаления подзадачи:', err)
      alert('Не удалось удалить подзадачу')
    }
  }

  const doneCount = items.filter(i => i.is_done).length
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-text-muted mb-1">
            <span>Прогресс</span>
            <span>{doneCount} из {items.length}</span>
          </div>
          <div className="h-2 bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={add} className="flex gap-2 mb-3">
        <Input
          placeholder="Новая подзадача..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          <Plus size={16} className="mr-1" />
          Добавить
        </Button>
      </form>

      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-2 p-2 bg-subtle rounded-lg ${item.is_done ? 'opacity-60' : ''}`}
          >
            <button
              type="button"
              onClick={() => toggle(item)}
              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                item.is_done
                  ? 'bg-primary border-primary text-white'
                  : 'border-border hover:border-primary'
              }`}
            >
              {item.is_done && <Check size={12} />}
            </button>
            <span className={`flex-1 text-sm text-text ${item.is_done ? 'line-through text-text-muted' : ''}`}>
              {item.title}
            </span>
            <button
              type="button"
              onClick={() => remove(item)}
              className="p-1 text-text-muted hover:text-danger rounded"
              title="Удалить"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-text-muted">Нет подзадач</div>
        )}
      </div>
    </div>
  )
}
