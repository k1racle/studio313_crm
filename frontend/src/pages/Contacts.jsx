import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import SearchableSelect from '../components/ui/SearchableSelect'
import { Plus, Pencil, Trash2, Search, Phone, Mail, MessageCircle, Building2, User, StickyNote } from 'lucide-react'

const messengerOptions = [
  { value: 'Telegram', label: 'Telegram' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Viber', label: 'Viber' },
  { value: 'MAX', label: 'MAX' },
  { value: 'VK', label: 'VK' },
]

const emptyForm = {
  full_name: '',
  organization: '',
  position: '',
  phone: '',
  email: '',
  messengers: [],
  notes: '',
}

export default function Contacts() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [orgFilter, setOrgFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadContacts = async () => {
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (orgFilter) params.organization = orgFilter
      const res = await api.get('/contacts/', { params })
      setContacts(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadContacts, 300)
    return () => clearTimeout(timeout)
  }, [search, orgFilter])

  const organizations = [...new Set(contacts.map(c => c.organization).filter(Boolean))].sort()

  const openCreate = () => {
    setEditingContact(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (contact) => {
    setEditingContact(contact)
    setForm({
      full_name: contact.full_name,
      organization: contact.organization || '',
      position: contact.position || '',
      phone: contact.phone || '',
      email: contact.email || '',
      messengers: contact.messengers ? contact.messengers.split(',').map(s => s.trim()).filter(Boolean) : [],
      notes: contact.notes || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingContact(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      messengers: form.messengers.join(', '),
    }
    try {
      if (editingContact) {
        await api.put(`/contacts/${editingContact.id}/`, payload)
      } else {
        await api.post('/contacts/', payload)
      }
      closeModal()
      loadContacts()
    } catch (err) {
      console.error(err)
      alert('Не удалось сохранить контакт')
    }
  }

  const handleDelete = async (contact) => {
    if (!confirm(`Удалить контакт «${contact.full_name}»?`)) return
    try {
      await api.delete(`/contacts/${contact.id}/`)
      loadContacts()
    } catch (err) {
      console.error(err)
      alert('Не удалось удалить контакт')
    }
  }

  const orgOptions = [{ value: '', label: 'Все организации' }, ...organizations.map(o => ({ value: o, label: o }))]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Контакты</h1>
          <p className="text-text-muted">Адресная книга</p>
        </div>
        {user?.is_manager && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Новый контакт
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              icon={<Search size={16} />}
              placeholder="Поиск по ФИО или организации..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={orgFilter}
              onChange={val => setOrgFilter(val)}
              options={orgOptions}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border text-left text-sm text-text-muted">
                <th className="pb-3 font-medium w-48">ФИО</th>
                <th className="pb-3 font-medium w-40">Организация</th>
                <th className="pb-3 font-medium w-40">Должность</th>
                <th className="pb-3 font-medium w-36">Телефон</th>
                <th className="pb-3 font-medium w-40">Email</th>
                <th className="pb-3 font-medium w-40">Мессенджеры</th>
                <th className="pb-3 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {contacts.map(contact => (
                <tr key={contact.id} className="border-b border-border hover:bg-subtle">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-primary" />
                      <span className="font-medium text-text">{contact.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    {contact.organization && (
                      <div className="flex items-center gap-1.5 text-text">
                        <Building2 size={14} className="text-text-muted" />
                        {contact.organization}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-text">{contact.position || '—'}</td>
                  <td className="py-3">
                    {contact.phone && (
                      <div className="flex items-center gap-1.5 text-text">
                        <Phone size={14} className="text-text-muted" />
                        {contact.phone}
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Mail size={14} />
                        {contact.email}
                      </a>
                    )}
                  </td>
                  <td className="py-3">
                    {contact.messengers && (
                      <div className="flex items-center gap-1.5 text-text">
                        <MessageCircle size={14} className="text-text-muted" />
                        {contact.messengers}
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    {user?.is_manager && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(contact)}
                          className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                          title="Изменить"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(contact)}
                          className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">Контакты не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingContact ? 'Изменить контакт' : 'Новый контакт'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ФИО"
            value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Организация"
              value={form.organization}
              onChange={e => setForm({ ...form, organization: e.target.value })}
            />
            <Input
              label="Должность"
              value={form.position}
              onChange={e => setForm({ ...form, position: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Телефон"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Мессенджеры</label>
            <select
              multiple
              value={form.messengers}
              onChange={e => {
                const options = Array.from(e.target.selectedOptions).map(o => o.value)
                setForm({ ...form, messengers: options })
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              style={{ minHeight: '6rem' }}
            >
              {messengerOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Заметки</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeModal}>Отмена</Button>
            <Button type="submit">{editingContact ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
