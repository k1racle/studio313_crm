import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'

const emptyForm = { task_id: '', start_time: '', end_time: '', note: '' }

export default function Timesheets() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [tasks, setTasks] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    const [e, t] = await Promise.all([
      api.get('/time-entries/'),
      user?.is_manager ? api.get('/tasks/') : api.get('/tasks/'),
    ])
    setEntries(e.data.results || e.data)
    setTasks(t.data.results || t.data)
  }

  useEffect(() => {
    load()
  }, [])

  const taskOptions = [{ value: '', label: 'Выберите задачу' }, ...tasks.map(t => ({ value: t.id, label: t.title }))]

  const totalMinutes = entries.reduce((sum, en) => sum + (en.duration_minutes || 0), 0)

  const openCreate = () => {
    setEditingEntry(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (entry) => {
    setEditingEntry(entry)
    setForm({
      task_id: entry.task?.id || '',
      start_time: entry.start_time ? entry.start_time.slice(0, 16) : '',
      end_time: entry.end_time ? entry.end_time.slice(0, 16) : '',
      note: entry.note || '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    if (editingEntry) {
      await api.put(`/time-entries/${editingEntry.id}/`, payload)
    } else {
      await api.post('/time-entries/', payload)
    }
    setIsModalOpen(false)
    setForm(emptyForm)
    setEditingEntry(null)
    load()
  }

  const handleDelete = async (entry) => {
    if (!confirm('Удалить запись времени?')) return
    await api.delete(`/time-entries/${entry.id}/`)
    load()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Таймшиты</h1>
          <p className="text-text-muted">Учёт затраченного времени</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" />
          Добавить запись
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-primary" />
          <div>
            <div className="text-sm text-text-muted">Всего времени</div>
            <div className="text-xl font-bold text-text">{Math.floor(totalMinutes / 60)} ч {totalMinutes % 60} мин</div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-left text-sm text-text-muted">
                <th className="pb-3 font-medium">Задача</th>
                <th className="pb-3 font-medium">Начало</th>
                <th className="pb-3 font-medium">Окончание</th>
                <th className="pb-3 font-medium">Длительность</th>
                <th className="pb-3 font-medium">Примечание</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-border hover:bg-subtle">
                  <td className="py-3 text-text">{entry.task?.title || '—'}</td>
                  <td className="py-3 text-text-muted">{entry.start_time ? new Date(entry.start_time).toLocaleString('ru') : '—'}</td>
                  <td className="py-3 text-text-muted">{entry.end_time ? new Date(entry.end_time).toLocaleString('ru') : '—'}</td>
                  <td className="py-3 text-text">{entry.duration_minutes ? `${entry.duration_minutes} мин` : '—'}</td>
                  <td className="py-3 text-text-muted">{entry.note || '—'}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(entry)} className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors" title="Изменить">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(entry)} className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors" title="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!entries.length && <tr><td colSpan="6" className="py-6 text-text-muted text-sm">Нет записей</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEntry ? 'Изменить запись' : 'Новая запись'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Задача" value={form.task_id} onChange={e => setForm({ ...form, task_id: e.target.value })} options={taskOptions} required />
          <Input label="Начало" type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
          <Input label="Окончание" type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required />
          <Input label="Примечание" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingEntry ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
