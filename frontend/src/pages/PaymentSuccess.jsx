import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../api/axios'
import { CheckCircle, Loader2, AlertCircle, FileText } from 'lucide-react'

const statusLabels = {
  pending: 'Обработка платежа...',
  success: 'Оплата прошла успешно',
  failed: 'Оплата не удалась',
  canceled: 'Платёж отменён',
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) {
      setError('Номер заказа не указан')
      setLoading(false)
      return
    }

    let attempts = 0
    const maxAttempts = 10

    const check = async () => {
      try {
        const res = await api.get(`/payments/by-order/?orderId=${orderId}`)
        setPayment(res.data)
        if (res.data.status !== 'pending' || attempts >= maxAttempts) {
          setLoading(false)
          return
        }
        attempts += 1
        setTimeout(check, 3000)
      } catch (err) {
        setError('Не удалось проверить статус платежа')
        setLoading(false)
      }
    }

    check()
  }, [orderId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl p-6 md:p-8 text-center">
        {loading ? (
          <>
            <Loader2 size={48} className="mx-auto text-primary animate-spin mb-4" />
            <h1 className="text-xl font-bold text-text">{statusLabels.pending}</h1>
          </>
        ) : error ? (
          <>
            <AlertCircle size={48} className="mx-auto text-danger mb-4" />
            <h1 className="text-xl font-bold text-text">Ошибка</h1>
            <p className="text-text-muted mt-2">{error}</p>
          </>
        ) : payment?.status === 'success' ? (
          <>
            <CheckCircle size={48} className="mx-auto text-success mb-4" />
            <h1 className="text-xl font-bold text-text">{statusLabels.success}</h1>
            <div className="mt-6 text-left text-sm space-y-2">
              <div className="flex justify-between"><span className="text-text-muted">Услуга</span><span className="text-text font-medium">{payment.booking_info?.service || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Клиент</span><span className="text-text font-medium">{payment.booking_info?.client || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Сумма</span><span className="text-text font-medium">{payment.amount} ₽</span></div>
            </div>
          </>
        ) : (
          <>
            <AlertCircle size={48} className="mx-auto text-danger mb-4" />
            <h1 className="text-xl font-bold text-text">{statusLabels[payment?.status] || 'Платёж не завершён'}</h1>
            <p className="text-text-muted mt-2">Если деньги списаны, свяжитесь с нами.</p>
          </>
        )}
        <Link to="/" className="inline-block mt-6 text-primary hover:underline">Вернуться на сайт</Link>
      </div>
    </div>
  )
}
