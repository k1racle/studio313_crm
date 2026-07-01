import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { User, Phone, Mail, Send, Calendar, CreditCard, CheckSquare } from 'lucide-react'

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

  useEffect(() => {
    api.get(`/client-portal/${token}/`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Не удалось загрузить данные'))
  }, [token])

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

  const { client, bookings, payments, tasks } = data

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
