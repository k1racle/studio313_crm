import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

import api from '../api/axios'

const statusLabels = {
  pending: 'Проверяем статус платежа...',
  success: 'Оплата прошла успешно',
  failed: 'Оплата не прошла',
  canceled: 'Платеж отменен',
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const paymentId = searchParams.get('payment')
  const token = searchParams.get('token')
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!paymentId || !token) {
      setError('Не передан идентификатор платежа.')
      setLoading(false)
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 10

    const check = async () => {
      try {
        const response = await api.get(`/payments/public-status/?payment=${paymentId}&token=${encodeURIComponent(token)}`)
        if (cancelled) return

        setPayment(response.data)
        if (response.data.status !== 'pending' || attempts >= maxAttempts) {
          setLoading(false)
          return
        }

        attempts += 1
        window.setTimeout(check, 3000)
      } catch (_error) {
        if (cancelled) return
        setError('Не удалось проверить статус платежа.')
        setLoading(false)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [paymentId, token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-xl md:p-8">
        {loading ? (
          <>
            <Loader2 size={48} className="mx-auto mb-4 animate-spin text-primary" />
            <h1 className="text-xl font-bold text-text">{statusLabels.pending}</h1>
          </>
        ) : error ? (
          <>
            <AlertCircle size={48} className="mx-auto mb-4 text-danger" />
            <h1 className="text-xl font-bold text-text">Ошибка</h1>
            <p className="mt-2 text-text-muted">{error}</p>
          </>
        ) : payment?.status === 'success' ? (
          <>
            <CheckCircle size={48} className="mx-auto mb-4 text-success" />
            <h1 className="text-xl font-bold text-text">{statusLabels.success}</h1>
            <div className="mt-6 space-y-2 text-left text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Услуга</span>
                <span className="font-medium text-text">{payment.booking_info?.service || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Клиент</span>
                <span className="font-medium text-text">{payment.booking_info?.client || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Тип оплаты</span>
                <span className="font-medium text-text">{payment.payment_type_display || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Сумма</span>
                <span className="font-medium text-text">{payment.amount} ₽</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <AlertCircle size={48} className="mx-auto mb-4 text-danger" />
            <h1 className="text-xl font-bold text-text">{statusLabels[payment?.status] || 'Платеж не завершен'}</h1>
            <p className="mt-2 text-text-muted">Если деньги списались, но статус не обновился, проверьте платеж позже или свяжитесь с менеджером.</p>
          </>
        )}

        <Link to="/" className="mt-6 inline-block text-primary hover:underline">
          Вернуться на сайт
        </Link>
      </div>
    </div>
  )
}
