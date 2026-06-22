import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const emptyForm = { name: '', color: '#3b82f6' }

export default function Tags() {
  const { user } = useAuth()
  const [tags, setTags] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    const res = await api.get('/tags/')
    setTags(res.data.results || res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingTag(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (tag) => {
    setEditingTag(tag)
    setForm({ name: tag.name, color: tag.color })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingTag) {
      await api.put(`/tags/${editingTag.id}/`, form)
    } else {
      await api.post('/tags/', form)
    }
    setIsModalOpen(false)
    setForm(emptyForm)
    setEditingTag(null)
    load()
  }

  const handleDelete = async (tag) => {
    if (!confirm(`Удалить тег «${tag.name}»?`)) return
    await api.delete(`/tags/${tag.id}/`)
    load()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Теги</h1>
          <p className="text-text-muted">Управление тегами задач</p>
        </div>
        {user?.is_manager && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Новый тег
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-wrap gap-3">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              {user?.is_manager && (
                <div className="flex items-center gap-1 ml-1">
                  <button onClick={() => openEdit(tag)} className="hover:bg-white/20 rounded p-0.5" title="Изменить">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(tag)} className="hover:bg-white/20 rounded p-0.5" title="Удалить">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!tags.length && <div className="text-text-muted text-sm">Нет тегов</div>}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTag ? 'Изменить тег' : 'Новый тег'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Название" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Цвет</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="h-10 w-16 rounded border border-border bg-surface"
              />
              <Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="flex-1" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingTag ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
