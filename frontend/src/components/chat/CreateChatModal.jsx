import { useState, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { formatShortName } from '../../utils/format'

export default function CreateChatModal({ isOpen, onClose, users, onCreate }) {
  const [type, setType] = useState('direct')
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')

  const toggle = (id) => {
    if (type === 'direct') {
      setSelectedIds([id])
    } else {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => formatShortName(u).toLowerCase().includes(q))
  }, [users, search])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedIds.length === 0) return
    onCreate({ type, name, member_ids: selectedIds })
    setName('')
    setSelectedIds([])
    setType('direct')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый чат">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 bg-subtle p-1 rounded-lg">
          {['direct', 'group'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setSelectedIds([]) }}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                type === t ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              {t === 'direct' ? 'Личный' : 'Групповой'}
            </button>
          ))}
        </div>
        {type === 'group' && (
          <Input label="Название группы" value={name} onChange={e => setName(e.target.value)} required />
        )}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            {type === 'direct' ? 'Выберите собеседника' : 'Выберите участников'}
          </label>
          <Input
            placeholder="Поиск по ФИО"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="space-y-2 max-h-64 overflow-auto border border-border rounded-lg p-3 bg-surface">
            {filteredUsers.map(u => (
              <label key={u.id} className="flex items-center gap-3 cursor-pointer hover:bg-subtle p-2 rounded-lg">
                <input
                  type={type === 'direct' ? 'radio' : 'checkbox'}
                  name="members"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => toggle(u.id)}
                  className="w-4 h-4 text-primary"
                />
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
                  {(u.last_name?.[0] || u.first_name?.[0] || u.username?.[0]).toUpperCase()}
                </div>
                <span className="text-sm text-text">{formatShortName(u)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={selectedIds.length === 0}>Создать чат</Button>
        </div>
      </form>
    </Modal>
  )
}
