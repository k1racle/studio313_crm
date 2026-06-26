import { useEffect, useState, useRef, useCallback } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { Plus, Pencil, Trash2, Search, Mail, Send, Phone, FileText, Eye, Archive, RotateCcw, Copy, ExternalLink } from 'lucide-react'

const emptyForm = { name: '', phone: '', email: '', telegram: '', notes: '', is_archived: false }

const bookingStatusLabels = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Выполнена',
  canceled: 'Отменена',
}

const bookingStatusVariant = {
  pending: 'yellow',
  confirmed: 'blue',
  completed: 'green',
  canceled: 'gray',
}

const taskStatusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  shooting: 'Съемка',
  editing: 'Монтаж',
  approval: 'На согласовании',
  review: 'На проверке',
  done: 'Выполнена',
  canceled: 'Отменена',
}

const taskStatusVariant = {
  new: 'blue',
  in_progress: 'yellow',
  shooting: 'orange',
  editing: 'cyan',
  approval: 'pink',
  review: 'purple',
  done: 'green',
  canceled: 'gray',
}

export default function Clients() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const [detailClient, setDetailClient] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [portalLink, setPortalLink] = useState('')
  const [portalCopied, setPortalCopied] = useState(false)

  const loadClients = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true)
    try {
      const params = { search, page: pageNum }
      if (showArchived) params.archived = '1'
      const res = await api.get('/clients/', { params })
      const results = res.data.results || []
      setClients(prev => append ? [...prev, ...results] : results)
      setHasMore(!!res.data.next)
    } finally {
      setLoading(false)
    }
  }, [search, showArchived])

  useEffect(() => {
    setPage(1)
    setClients([])
    setHasMore(true)
  }, [search, showArchived])

  useEffect(() => {
    loadClients(page, page > 1)
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

  const resetForm = () => {
    setForm(emptyForm)
    setEditingClient(null)
  }

  const openCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEdit = (client, e) => {
    e?.stopPropagation()
    setEditingClient(client)
    setForm({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      telegram: client.telegram || '',
      notes: client.notes || '',
      is_archived: client.is_archived,
    })
    setIsModalOpen(true)
  }

  const openDetail = async (client) => {
    setDetailClient(client)
    setIsDetailOpen(true)
    setPortalLink('')
    setPortalCopied(false)
    try {
      const res = await api.get(`/clients/${client.id}/`)
      setDetailData(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const generatePortalLink = async () => {
    if (!detailData) return
    try {
      const res = await api.post('/client-portal/tokens/', { client: detailData.id })
      setPortalLink(res.data.url)
    } catch (err) {
      console.error(err)
      alert('Ошибка создания ссылки')
    }
  }

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalLink)
    setPortalCopied(true)
    setTimeout(() => setPortalCopied(false), 2000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingClient) {
      await api.put(`/clients/${editingClient.id}/`, form)
    } else {
      await api.post('/clients/', form)
    }
    setIsModalOpen(false)
    resetForm()
    loadClients(1, false)
  }

  const handleDelete = async (client, e) => {
    e?.stopPropagation()
    if (!confirm(`Удалить клиента «${client.name}»?`)) return
    await api.delete(`/clients/${client.id}/`)
    loadClients(1, false)
  }

  const toggleArchive = async (client, e) => {
    e?.stopPropagation()
    await api.patch(`/clients/${client.id}/`, { is_archived: !client.is_archived })
    loadClients(1, false)
    if (detailClient?.id === client.id) {
      const res = await api.get(`/clients/${client.id}/`)
      setDetailData(res.data)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Клиенты</h1>
          <p className="text-text-muted">Клиентская база студии</p>
        </div>
        {user?.is_manager && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Новый клиент
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по имени, телефону, email, Telegram..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 max-w-md"
          />
          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            Показать архив
          </label>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-3 font-medium w-1/4">Имя</th>
                <th className="pb-3 font-medium">Телефон</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Telegram</th>
                <th className="pb-3 font-medium w-24">Статус</th>
                <th className="pb-3 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr
                  key={c.id}
                  className={`border-b border-border hover:bg-subtle cursor-pointer ${c.is_archived ? 'opacity-60' : ''}`}
                  onClick={() => openDetail(c)}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-text truncate">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-text-muted">{c.phone || '—'}</td>
                  <td className="py-3 text-text-muted truncate">{c.email || '—'}</td>
                  <td className="py-3 text-text-muted truncate">{c.telegram ? `@${c.telegram}` : '—'}</td>
                  <td className="py-3">{c.is_archived && <Badge variant="gray">Архив</Badge>}</td>
                  <td className="py-3">
                    {user?.is_manager && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => openEdit(c, e)} className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors" title="Изменить">
                          <Pencil size={16} />
                        </button>
                        <button onClick={(e) => toggleArchive(c, e)} className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors" title={c.is_archived ? 'Восстановить' : 'В архив'}>
                          {c.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                        </button>
                        <button onClick={(e) => handleDelete(c, e)} className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors" title="Удалить">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingClient ? 'Изменить клиента' : 'Новый клиент'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Имя" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Телефон" icon={<Phone size={16} />} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" icon={<Mail size={16} />} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input label="Telegram" icon={<Send size={16} />} value={form.telegram} onChange={e => setForm({ ...form, telegram: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Заметки</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows="3"
            />
          </div>
          {editingClient && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_archived}
                onChange={e => setForm({ ...form, is_archived: e.target.checked })}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-text">В архиве</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="submit">{editingClient ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={detailClient?.name || 'Клиент'} size="lg">
        <div className="space-y-6">
          {!detailData ? (
            <div className="text-text-muted">Загрузка...</div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-semibold shrink-0">
                  {detailData.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-text">{detailData.name}</h2>
                  <div className="flex flex-wrap gap-3 text-sm text-text-muted mt-2">
                    {detailData.phone && <div className="flex items-center gap-1"><Phone size={14} /> {detailData.phone}</div>}
                    {detailData.email && <div className="flex items-center gap-1"><Mail size={14} /> {detailData.email}</div>}
                    {detailData.telegram && <div className="flex items-center gap-1"><Send size={14} /> @{detailData.telegram}</div>}
                  </div>
                  {detailData.notes && (
                    <div className="mt-3 text-sm text-text bg-subtle p-3 rounded-lg">
                      {detailData.notes}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">История записей</h3>
                {detailData.bookings?.length ? (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-text-muted">
                          <th className="pb-2 font-medium">Услуга</th>
                          <th className="pb-2 font-medium">Дата</th>
                          <th className="pb-2 font-medium">Статус</th>
                          <th className="pb-2 font-medium">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.bookings.map(b => (
                          <tr key={b.id} className="border-b border-border">
                            <td className="py-2 text-text">{b.service?.name || '—'}</td>
                            <td className="py-2 text-text-muted">{new Date(b.start_time).toLocaleString('ru')}</td>
                            <td className="py-2"><Badge variant={bookingStatusVariant[b.status]}>{bookingStatusLabels[b.status]}</Badge></td>
                            <td className="py-2 text-text">{b.service?.price} ₽</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="text-text-muted text-sm">Нет записей</div>}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Проекты в работе</h3>
                {detailData.projects?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {detailData.projects.map(p => (
                      <span key={p.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {p.name}
                      </span>
                    ))}
                  </div>
                ) : <div className="text-text-muted text-sm">Нет активных проектов</div>}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Текущие задачи</h3>
                {detailData.tasks?.length ? (
                  <div className="space-y-2">
                    {detailData.tasks.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-subtle rounded-lg">
                        <div>
                          <div className="font-medium text-text">{t.title}</div>
                          <div className="text-xs text-text-muted">{t.project?.name || 'Без проекта'}</div>
                        </div>
                        <Badge variant={taskStatusVariant[t.status]}>{taskStatusLabels[t.status]}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-text-muted text-sm">Нет активных задач</div>}
              </div>

              {user?.is_manager && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text">Клиентский портал</span>
                    <Button size="sm" variant="secondary" onClick={generatePortalLink}>
                      <ExternalLink size={14} className="mr-1.5" />
                      {portalLink ? 'Обновить ссылку' : 'Сгенерировать ссылку'}
                    </Button>
                  </div>
                  {portalLink && (
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={portalLink}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-subtle text-text"
                      />
                      <Button size="sm" onClick={copyPortalLink}>
                        <Copy size={14} className="mr-1.5" />
                        {portalCopied ? 'Скопировано' : 'Копировать'}
                      </Button>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => openEdit(detailData)}>
                      <Pencil size={14} className="mr-1.5" />
                      Изменить
                    </Button>
                    <Button variant={detailData.is_archived ? 'secondary' : 'ghost'} onClick={(e) => toggleArchive(detailData, e)}>
                      {detailData.is_archived ? <RotateCcw size={14} className="mr-1.5" /> : <Archive size={14} className="mr-1.5" />}
                      {detailData.is_archived ? 'Восстановить' : 'В архив'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
