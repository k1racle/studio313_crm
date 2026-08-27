import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Phone, Mail, Send, Calendar, CreditCard, CheckSquare, ExternalLink, FileCheck2 } from 'lucide-react'

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
  review: 'На проверке',
  content_placement: 'Выкладка контента',
  done: 'Выполнена',
  canceled: 'Отменена',
}

const taskStatusVariant = {
  new: 'blue',
  in_progress: 'yellow',
  review: 'purple',
  content_placement: 'indigo',
  done: 'green',
  canceled: 'gray',
}

const paymentStatusLabels = {
  pending: 'В ожидании',
  success: 'Успешно',
  failed: 'Ошибка',
  canceled: 'Отменён',
}

const paymentStatusVariant = {
  pending: 'yellow',
  success: 'green',
  failed: 'red',
  canceled: 'gray',
}

export default function ClientPortal() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [comments, setComments] = useState({})
  const [responding, setResponding] = useState(null)
  const [actionError, setActionError] = useState('')

  const load = () => {
    api.get(`/client-portal/${token}/`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Не удалось загрузить данные'))
  }

  useEffect(load, [token])

  const respondToApproval = async (approval, status) => {
    setResponding(approval.id)
    setActionError('')
    try {
      await api.post(`/client-portal/${token}/approvals/${approval.id}/respond/`, {
        status,
        comment: comments[approval.id] || '',
      })
      await load()
    } catch (err) {
      setActionError(err.response?.data?.comment?.[0] || err.response?.data?.detail || 'Не удалось сохранить решение')
    } finally {
      setResponding(null)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center text-danger">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-text-muted">Загрузка...</div>
      </div>
    )
  }

  const { client, bookings, payments, tasks, approvals = [] } = data

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-semibold">
            {client.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{client.name}</h1>
            <p className="text-text-muted">Личный кабинет клиента</p>
          </div>
        </div>

        <Card className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {client.phone && <div className="flex items-center gap-2 text-text"><Phone size={16} className="text-primary" /> {client.phone}</div>}
            {client.email && <div className="flex items-center gap-2 text-text"><Mail size={16} className="text-primary" /> {client.email}</div>}
            {client.telegram && <div className="flex items-center gap-2 text-text"><Send size={16} className="text-primary" /> @{client.telegram}</div>}
          </div>
          {client.notes && <div className="mt-4 text-sm text-text-muted bg-subtle p-3 rounded-lg">{client.notes}</div>}
        </Card>

        <Card title="Материалы на согласование" className="mb-6" action={<FileCheck2 size={18} className="text-primary" />}>
          {actionError && <div className="mb-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{actionError}</div>}
          {approvals.length ? (
            <div className="space-y-4">
              {approvals.map(approval => (
                <div key={approval.id} className="rounded-[20px] border border-border bg-subtle/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-text">{approval.title}</div>
                      <div className="mt-1 text-xs text-text-muted">{approval.project_name || 'Без проекта'}{approval.due_date ? ` · Ответ до ${new Date(approval.due_date).toLocaleDateString('ru-RU')}` : ''}</div>
                    </div>
                    <Badge variant={approval.status === 'approved' ? 'green' : approval.status === 'changes_requested' ? 'red' : 'yellow'}>{approval.status_display}</Badge>
                  </div>
                  {approval.description && <p className="mt-3 text-sm leading-6 text-text-muted">{approval.description}</p>}
                  {(approval.file || approval.external_url) && (
                    <a href={approval.file || approval.external_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-primary">
                      <ExternalLink size={15} />Открыть материал
                    </a>
                  )}
                  {approval.status === 'pending' ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <label className="mb-2 block text-sm font-semibold text-text">Комментарий</label>
                      <textarea value={comments[approval.id] || ''} onChange={event => setComments(current => ({ ...current, [approval.id]: event.target.value }))} rows={3} placeholder="Если нужны правки, опишите их здесь" className="w-full rounded-[18px] border border-border bg-surface px-4 py-3 text-base text-text outline-none focus:border-primary" />
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button type="button" disabled={responding === approval.id} onClick={() => respondToApproval(approval, 'changes_requested')} className="min-h-11 rounded-full border border-danger/30 px-4 text-sm font-semibold text-danger disabled:opacity-50">Нужны правки</button>
                        <button type="button" disabled={responding === approval.id} onClick={() => respondToApproval(approval, 'approved')} className="min-h-11 rounded-full bg-success px-4 text-sm font-semibold text-white disabled:opacity-50">Согласовать</button>
                      </div>
                    </div>
                  ) : approval.client_comment ? (
                    <div className="mt-3 rounded-2xl bg-surface p-3 text-sm text-text">{approval.client_comment}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : <div className="text-text-muted text-sm">Нет материалов, ожидающих согласования</div>}
        </Card>

        <Card title="Записи" className="mb-6" action={<Calendar size={18} className="text-primary" />}>
          {bookings.length ? (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-subtle rounded-lg">
                  <div>
                    <div className="font-medium text-text">{b.service__name}</div>
                    <div className="text-xs text-text-muted">{new Date(b.start_time).toLocaleString('ru')}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={bookingStatusVariant[b.status]}>{bookingStatusLabels[b.status]}</Badge>
                    <div className="text-xs text-text-muted mt-1">{b.service__price.toLocaleString('ru')} ₽</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-text-muted text-sm">Нет записей</div>}
        </Card>

        <Card title="Платежи" className="mb-6" action={<CreditCard size={18} className="text-primary" />}>
          {payments.length ? (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-subtle rounded-lg">
                  <div>
                    <div className="font-medium text-text">{p.booking__service__name}</div>
                    <div className="text-xs text-text-muted">{new Date(p.created_at).toLocaleString('ru')}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={paymentStatusVariant[p.status]}>{paymentStatusLabels[p.status]}</Badge>
                    <div className="text-xs text-text-muted mt-1">{p.amount.toLocaleString('ru')} ₽</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-text-muted text-sm">Нет платежей</div>}
        </Card>

        <Card title="Задачи" action={<CheckSquare size={18} className="text-primary" />}>
          {tasks.length ? (
            <div className="space-y-3">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-subtle rounded-lg">
                  <div>
                    <div className="font-medium text-text">{t.title}</div>
                    <div className="text-xs text-text-muted">{t.project__name || 'Без проекта'}</div>
                  </div>
                    <Badge variant={taskStatusVariant[t.status]}>{taskStatusLabels[t.status]}</Badge>
                </div>
              ))}
            </div>
          ) : <div className="text-text-muted text-sm">Нет активных задач</div>}
        </Card>
      </div>
    </div>
  )
}
