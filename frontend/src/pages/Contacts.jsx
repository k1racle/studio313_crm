import { useEffect, useState, useRef, useCallback } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import MobileFiltersSheet from '../components/ui/MobileFiltersSheet'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import SearchableSelect from '../components/ui/SearchableSelect'
import { Plus, Pencil, Trash2, Search, Phone, Mail, MessageCircle, Building2, User, Download, Share2, Cake, MapPin, Zap, X, SlidersHorizontal } from 'lucide-react'

const messengerOptions = ['Telegram', 'WhatsApp', 'Viber', 'MAX', 'VK']

const socialOptions = ['VK', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'Одноклассники', 'Другое']

// Поля хранятся как JSON-строка вида [{"name": "Telegram", "link": "https://t.me/..."}]
const parseLinks = (raw) => {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      return arr
        .filter(i => i && typeof i === 'object')
        .map(i => ({ name: i.name || '', link: i.link || '' }))
    }
  } catch {
    // старый формат — просто текст: "Telegram, WhatsApp" или свободная строка
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ name: s, link: '' }))
}

const serializeLinks = (entries) =>
  JSON.stringify(entries.filter(e => e.name.trim() || e.link.trim()))

const linkHref = (link) => /^https?:\/\//i.test(link) ? link : null

function LinksEditor({ label, options, entries, onChange, linkPlaceholder }) {
  const addEntry = () => onChange([...entries, { name: options[0], link: '' }])
  const updateEntry = (idx, patch) =>
    onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
  const removeEntry = (idx) => onChange(entries.filter((_, i) => i !== idx))

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1.5">{label}</label>
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={entry.name}
              onChange={e => updateEntry(idx, { name: e.target.value })}
              className="w-36 shrink-0 px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {options.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <input
              type="text"
              value={entry.link}
              onChange={e => updateEntry(idx, { link: e.target.value })}
              placeholder={linkPlaceholder}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => removeEntry(idx)}
              className="p-2 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors shrink-0"
              title="Удалить"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addEntry}
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Plus size={14} />
        Добавить
      </button>
    </div>
  )
}

function LinksCell({ icon: Icon, raw }) {
  const entries = parseLinks(raw)
  if (entries.length === 0) return null
  return (
    <div className="flex items-start gap-1.5 text-text">
      <Icon size={14} className="text-text-muted mt-0.5 shrink-0" />
      <div className="space-y-0.5">
        {entries.map((e, i) => {
          const href = linkHref(e.link)
          if (!e.link) {
            return <div key={i} className="whitespace-nowrap">{e.name}</div>
          }
          return (
            <div key={i} className="whitespace-nowrap">
              <span className="text-text-muted">{e.name}:</span>{' '}
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {e.link}
                </a>
              ) : (
                <span>{e.link}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const emptyForm = {
  full_name: '',
  organization: '',
  position: '',
  phone: '',
  email: '',
  messengers: [],
  social_networks: [],
  birth_date: '',
  city: '',
  quick_communication: 'no',
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
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const sentinelRef = useRef(null)

  const loadContacts = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true)
    try {
      const params = { page: pageNum }
      if (search.trim()) params.search = search.trim()
      if (orgFilter) params.organization = orgFilter
      const res = await api.get('/contacts/', { params })
      const results = res.data.results || []
      setContacts(prev => append ? [...prev, ...results] : results)
      setHasMore(!!res.data.next)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, orgFilter])

  useEffect(() => {
    setPage(1)
    setContacts([])
    setHasMore(true)
  }, [search, orgFilter])

  useEffect(() => {
    loadContacts(page, page > 1)
  }, [page])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        setPage(p => p + 1)
      }
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading])

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
      messengers: parseLinks(contact.messengers),
      social_networks: parseLinks(contact.social_networks),
      birth_date: contact.birth_date || '',
      city: contact.city || '',
      quick_communication: contact.quick_communication ? 'yes' : 'no',
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
      messengers: serializeLinks(form.messengers),
      social_networks: serializeLinks(form.social_networks),
      birth_date: form.birth_date || null,
      quick_communication: form.quick_communication === 'yes',
    }
    try {
      if (editingContact) {
        await api.put(`/contacts/${editingContact.id}/`, payload)
      } else {
        await api.post('/contacts/', payload)
      }
      closeModal()
      loadContacts(1, false)
    } catch (err) {
      console.error(err)
      alert('Не удалось сохранить контакт')
    }
  }

  const handleDelete = async (contact) => {
    if (!confirm(`Удалить контакт «${contact.full_name}»?`)) return
    try {
      await api.delete(`/contacts/${contact.id}/`)
      loadContacts(1, false)
    } catch (err) {
      console.error(err)
      alert('Не удалось удалить контакт')
    }
  }

  const orgOptions = [{ value: '', label: 'Все организации' }, ...organizations.map(o => ({ value: o, label: o }))]

  const handleExport = async () => {
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (orgFilter) params.organization = orgFilter
      const res = await api.get('/contacts/export/', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'contacts.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Не удалось выгрузить контакты')
    }
  }

  usePageHeaderContent(
    <div className="flex flex-wrap items-center justify-end gap-2">
      {user?.is_manager && (
        <Button onClick={openCreate}>
          <Plus size={16} />
          Новый контакт
        </Button>
      )}
      <Button variant="secondary" onClick={handleExport}>
        <Download size={16} />
        Выгрузить
      </Button>
    </div>
  )

  const activeFilterCount = orgFilter ? 1 : 0

  return (
    <div>
      <Card className="mb-6" bodyClassName="space-y-3">
        <div className="space-y-3 md:hidden">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по ФИО или организации..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button type="button" variant="secondary" className="w-full" onClick={() => setMobileFiltersOpen(true)}>
            <SlidersHorizontal size={16} />
            Фильтры
            {activeFilterCount > 0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="hidden grid-cols-1 gap-3 md:grid xl:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <Input
              icon={<Search size={16} />}
              placeholder="Поиск по ФИО или организации..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div>
            <SearchableSelect
              value={orgFilter}
              onChange={val => setOrgFilter(val)}
              options={orgOptions}
            />
          </div>
        </div>
      </Card>

      <MobileFiltersSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Фильтры контактов"
        footer={(
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOrgFilter('')}>
              Сбросить
            </Button>
            <Button type="button" className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
              Применить
            </Button>
          </div>
        )}
      >
        <SearchableSelect
          value={orgFilter}
          onChange={val => setOrgFilter(val)}
          options={orgOptions}
        />
      </MobileFiltersSheet>

      <div className="space-y-3 md:hidden">
        {contacts.map(contact => (
          <Card key={contact.id} bodyClassName="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-primary/10 p-2.5 text-primary">
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-text">{contact.full_name}</div>
                <div className="mt-1 text-sm text-text-muted">{contact.organization || 'Без организации'}</div>
                {contact.position ? <div className="mt-1 text-sm text-text-muted">{contact.position}</div> : null}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {contact.phone ? <div className="text-text">{contact.phone}</div> : null}
              {contact.email ? <div className="text-text">{contact.email}</div> : null}
              {contact.city ? <div className="text-text-muted">{contact.city}</div> : null}
              {contact.birth_date ? <div className="text-text-muted">{new Date(contact.birth_date + 'T00:00:00').toLocaleDateString('ru-RU')}</div> : null}
            </div>

            {(parseLinks(contact.messengers).length > 0 || parseLinks(contact.social_networks).length > 0) ? (
              <div className="space-y-2 text-sm">
                <LinksCell icon={MessageCircle} raw={contact.messengers} />
                <LinksCell icon={Share2} raw={contact.social_networks} />
              </div>
            ) : null}

            {user?.is_manager && (
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(contact)}>
                  <Pencil size={14} />
                  Изменить
                </Button>
                <button
                  onClick={() => handleDelete(contact)}
                  className="rounded-full border border-border/70 bg-surface/75 p-2.5 text-text-muted transition-colors hover:bg-subtle hover:text-danger"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </Card>
        ))}
        {contacts.length === 0 && (
          <Card bodyClassName="py-8 text-center text-text-muted">Контакты не найдены</Card>
        )}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[1600px]">
            <thead>
              <tr className="border-b border-border text-left text-sm text-text-muted">
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">ФИО</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Организация</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Должность</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Телефон</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Email</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Мессенджеры</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Соцсети</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Дата рождения</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Город</th>
                <th className="pb-3 pr-6 font-medium whitespace-nowrap">Опер. канал</th>
                <th className="pb-3 font-medium whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {contacts.map(contact => (
                <tr key={contact.id} className="border-b border-border hover:bg-subtle">
                  <td className="py-3 pr-6 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-primary" />
                      <span className="font-medium text-text">{contact.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap">
                    {contact.organization && (
                      <div className="flex items-center gap-1.5 text-text">
                        <Building2 size={14} className="text-text-muted" />
                        {contact.organization}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap text-text">{contact.position || '—'}</td>
                  <td className="py-3 pr-6 whitespace-nowrap">
                    {contact.phone && (
                      <div className="flex items-center gap-1.5 text-text">
                        <Phone size={14} className="text-text-muted" />
                        {contact.phone}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Mail size={14} />
                        {contact.email}
                      </a>
                    )}
                  </td>
                  <td className="py-3 pr-6 align-top">
                    <LinksCell icon={MessageCircle} raw={contact.messengers} />
                  </td>
                  <td className="py-3 pr-6 align-top">
                    <LinksCell icon={Share2} raw={contact.social_networks} />
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap">
                    {contact.birth_date && (
                      <div className="flex items-center gap-1.5 text-text">
                        <Cake size={14} className="text-text-muted" />
                        {new Date(contact.birth_date + 'T00:00:00').toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap">
                    {contact.city && (
                      <div className="flex items-center gap-1.5 text-text">
                        <MapPin size={14} className="text-text-muted" />
                        {contact.city}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap">
                    {contact.quick_communication && (
                      <div className="flex items-center gap-1.5 text-text">
                        <Zap size={14} className="text-primary" />
                        Да
                      </div>
                    )}
                  </td>
                  <td className="py-3 whitespace-nowrap">
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
                  <td colSpan={11} className="py-8 text-center text-text-muted">Контакты не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div ref={sentinelRef} className="h-4 mt-4" />
      {loading && (
        <div className="text-center py-6 text-text-muted">
          <span className="inline-block w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
          Загрузка...
        </div>
      )}

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
          <LinksEditor
            label="Мессенджеры"
            options={messengerOptions}
            entries={form.messengers}
            onChange={entries => setForm({ ...form, messengers: entries })}
            linkPlaceholder="Ссылка или ник, например https://t.me/username"
          />
          <LinksEditor
            label="Соцсети"
            options={socialOptions}
            entries={form.social_networks}
            onChange={entries => setForm({ ...form, social_networks: entries })}
            linkPlaceholder="Ссылка на профиль"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Город"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Дата рождения"
              type="date"
              value={form.birth_date}
              onChange={e => setForm({ ...form, birth_date: e.target.value })}
            />
            <Select
              label="Оперативный канал связи"
              value={form.quick_communication}
              onChange={e => setForm({ ...form, quick_communication: e.target.value })}
              options={[
                { value: 'no', label: 'Нет' },
                { value: 'yes', label: 'Да' },
              ]}
            />
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
          <div className="modal-actions flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeModal}>Отмена</Button>
            <Button type="submit">{editingContact ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
