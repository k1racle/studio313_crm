import { useSearchParams, Link } from 'react-router-dom'
import { XCircle } from 'lucide-react'

export default function PaymentFail() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl p-6 md:p-8 text-center">
        <XCircle size={48} className="mx-auto text-danger mb-4" />
        <h1 className="text-xl font-bold text-text">Оплата не удалась</h1>
        <p className="text-text-muted mt-2">
          Платёж отменён или произошла ошибка. Попробуйте ещё раз или свяжитесь с нами.
        </p>
        {orderId && <div className="mt-3 text-xs text-text-muted">Заказ: {orderId}</div>}
        <Link to="/" className="inline-block mt-6 text-primary hover:underline">Вернуться на сайт</Link>
      </div>
    </div>
  )
}
