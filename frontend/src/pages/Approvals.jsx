import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FileCheck2, MessageSquareText, Plus, Trash2 } from 'lucide-react'

import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'

const statusLabels = {
  pending: 'Ожидает решения',
  approved: 'Согласовано',
  changes_requested: 'Нужны правки',
}

const statusVariants = {
  pending: 'yellow',
  approved: 'green',
  changes_requested: 'red',
}

const emptyForm = {
  client: '', project: '', production: '', title: '', description: '',
  external_url: '', due_date: '', file: null,
}

export default function Approvals() {
  const { user } = useAuth()
  const canManage = user?.capabilities?.includes('approvals.manage')
  const [items, setItems] = useState([])
  const [options, setOptions] = useState({ clients: [], projects: [], productions: [] })
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await api.get('/client-portal/approvals/', { params: filter ? { status: filter } : {} })
    setItems(res.data.results || res.data)
  }

  useEffect(() => { load() }, [filter])
  useEffect(() => {
    if (canManage) api.get('/client-portal/approval-options/').then(res => setOptions(res.data))
  }, [canManage])

  const openCreate = () => {
    setForm(emptyForm)
    setOpen(true)
  }

  const headerActions = useMemo(() => canManage ? (
    <Button onClick={openCreate}><Plus size={16} />Отправить материал</Button>
  ) : null, [canManage])
  usePageHeaderContent(headerActions)

  const submit = async event => {
    event.preventDefault()
    setSaving(true)
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '' && value !== null) payload.append(key, value)
    })
    try {
      await api.post('/client-portal/approvals/', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOpen(false)
      setForm(emptyForm)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async item => {
    if (!confirm(`Удалить согласование «${item.title}»?`)) return
    await api.delete(`/client-portal/approvals/${item.id}/`)
    load()
  }

  return (
    <div className="space-y-5">
      <section className="soft-panel rounded-[28px] p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            ['', 'Все'], ['pending', 'Ожидают'], ['approved', 'Согласованы'], ['changes_requested', 'Нужны правки'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? 'bg-primary text-white' : 'bg-subtle text-text-muted hover:text-text'}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {items.length ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {items.map(item => (
            <article key={item.id} className="soft-panel flex min-h-64 flex-col rounded-[24px] p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileCheck2 size={20} /></span>
                <Badge variant={statusVariants[item.status]}>{statusLabels[item.status]}</Badge>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text">{item.title}</h3>
              <div className="mt-1 text-sm text-text-muted">{item.client_name}{item.project_name ? ` · ${item.project_name}` : ''}</div>
              {item.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">{item.description}</p>}
              {item.client_comment && (
                <div className="mt-3 rounded-2xl bg-subtle p-3 text-sm text-text">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-text-muted"><MessageSquareText size={14} />Комментарий клиента</div>
                  {item.client_comment}
                </div>
              )}
              <div className="mt-auto flex items-center gap-2 pt-4">
                {(item.file || item.external_url) && (
                  <a href={item.file || item.external_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-text hover:border-primary/40 hover:text-primary">
                    <ExternalLink size={15} />Открыть
                  </a>
                )}
                {canManage && (
                  <button type="button" onClick={() => remove(item)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-muted hover:border-danger/30 hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="soft-panel flex min-h-64 flex-col items-center justify-center rounded-[28px] px-5 text-center">
          <FileCheck2 size={38} className="mb-3 text-text-muted/40" />
          <div className="font-semibold text-text">Согласований пока нет</div>
          <div className="mt-1 text-sm text-text-muted">Отправленные клиентам материалы появятся здесь.</div>
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Новое согласование">
        <form onSubmit={submit} className="space-y-4">
          <Select label="Клиент" required value={form.client} onChange={event => setForm({ ...form, client: event.target.value })} options={[{ value: '', label: 'Выберите клиента' }, ...options.clients.map(x => ({ value: x.id, label: x.name }))]} />
          <Select label="Проект" value={form.project} onChange={event => setForm({ ...form, project: event.target.value })} options={[{ value: '', label: 'Без проекта' }, ...options.projects.map(x => ({ value: x.id, label: x.name }))]} />
          <Input label="Название материала" required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
          <div>
            <label className="mb-2 block text-sm font-semibold text-text">Комментарий клиенту</label>
            <textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={4} className="w-full rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary" />
          </div>
          <Input label="Ссылка на материал" type="url" placeholder="https://…" value={form.external_url} onChange={event => setForm({ ...form, external_url: event.target.value })} />
          <Input label="Или загрузите файл" type="file" onChange={event => setForm({ ...form, file: event.target.files?.[0] || null })} />
          <Input label="Желаемый срок ответа" type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} />
          <div className="modal-actions flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Отправляем…' : 'Отправить клиенту'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
