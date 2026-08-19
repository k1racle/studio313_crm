import { Link } from 'react-router-dom'
import { XCircle } from 'lucide-react'

export default function PaymentFail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-xl md:p-8">
        <XCircle size={48} className="mx-auto mb-4 text-danger" />
        <h1 className="text-xl font-bold text-text">Оплата не завершена</h1>
        <p className="mt-2 text-text-muted">
          Платеж был отменен или завершился ошибкой. Можно попробовать еще раз по той же ссылке или связаться с менеджером.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary hover:underline">
          Вернуться на сайт
        </Link>
      </div>
    </div>
  )
}
