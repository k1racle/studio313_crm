import { useEffect, useState } from 'react'
import { ExternalLink, Mail, ReceiptText, RefreshCw, Save, Search } from 'lucide-react'

import api from '../api/axios'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'

const statusLabels = {
  pending: 'В ожидании',
  success: 'Успешно',
  failed: 'Ошибка',
  canceled: 'Отменен',
}

const statusBadgeVariant = {
  pending: 'yellow',
  success: 'green',
  failed: 'red',
  canceled: 'gray',
}

const typeLabels = {
  partial: '50%',
  full: '100%',
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  return Object.values(data)
    .flat()
    .join(' ') || fallback
}

export default function Payments() {
  const { user } = useAuth()
  const [tab, setTab] = useState('list')
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [settings, setSettings] = useState({
    test_mode: true,
    shop_id: '',
    secret_key: '',
    base_url: 'https://api.yookassa.ru/v3/',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [refreshingId, setRefreshingId] = useState(null)
  const [sendingId, setSendingId] = useState(null)

  const loadPayments = async () => {
    const response = await api.get('/payments/')
    setPayments(response.data.results || response.data)
  }

  const loadSettings = async () => {
    const response = await api.get('/payments/settings/')
    setSettings({
      test_mode: response.data.test_mode,
      shop_id: response.data.shop_id || '',
      secret_key: '',
      base_url: response.data.base_url || 'https://api.yookassa.ru/v3/',
    })
  }

  useEffect(() => {
    loadPayments()
    if (user?.is_director) {
      loadSettings()
    }
  }, [user])

  const handleSaveSettings = async (event) => {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const payload = { ...settings }
      if (!payload.secret_key) delete payload.secret_key
      await api.put('/payments/settings/', payload)
      setSettings((current) => ({ ...current, secret_key: '' }))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      alert(getErrorMessage(error, 'Не удалось сохранить настройки YooKassa.'))
    } finally {
      setSaving(false)
    }
  }

  const refreshPaymentStatus = async (paymentId) => {
    setRefreshingId(paymentId)
    try {
      await api.get(`/payments/${paymentId}/status/`)
      await loadPayments()
    } catch (error) {
      alert(getErrorMessage(error, 'Не удалось обновить статус платежа.'))
    } finally {
      setRefreshingId(null)
    }
  }

  const sendPaymentLink = async (paymentId) => {
    setSendingId(paymentId)
    try {
      const response = await api.post(`/payments/${paymentId}/send/`)
      alert(`Ссылка отправлена на ${response.data.email || 'email клиента'}.`)
      await loadPayments()
    } catch (error) {
      alert(getErrorMessage(error, 'Не удалось отправить ссылку клиенту.'))
    } finally {
      setSendingId(null)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    const haystack = [
      payment.id,
      payment.booking_info?.client,
      payment.booking_info?.service,
      payment.booking_info?.client_email,
      payment.transaction_id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search.toLowerCase())
  })

  const headerActions = user?.is_director ? (
    <div className="flex gap-2 rounded-full border border-border/70 bg-surface/75 p-1">
      {[
        { key: 'list', label: 'Платежи' },
        { key: 'settings', label: 'YooKassa' },
      ].map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setTab(item.key)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === item.key ? 'bg-white text-primary shadow-[0_8px_18px_rgba(15,23,40,0.08)]' : 'text-text-muted hover:text-text'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  ) : null

  usePageHeaderContent(headerActions)

  return (
    <div>
      {tab === 'list' && (
        <>
          <Card className="mb-6">
            <Input
              icon={<Search size={16} />}
              placeholder="Поиск по клиенту, услуге, email или ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-text-muted">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Клиент</th>
                    <th className="pb-3 font-medium">Услуга</th>
                    <th className="pb-3 font-medium">Тип</th>
                    <th className="pb-3 font-medium">Сумма</th>
                    <th className="pb-3 font-medium">Статус</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Дата</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border hover:bg-subtle">
                      <td className="py-3 text-text-muted">#{payment.id}</td>
                      <td className="py-3 text-text">{payment.booking_info?.client || '—'}</td>
                      <td className="py-3 text-text">{payment.booking_info?.service || '—'}</td>
                      <td className="py-3 text-text">{payment.payment_type_display || typeLabels[payment.payment_type] || '—'}</td>
                      <td className="py-3 font-medium text-text">{payment.amount} ₽</td>
                      <td className="py-3">
                        <Badge variant={statusBadgeVariant[payment.status] || 'gray'}>
                          {statusLabels[payment.status] || payment.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-text-muted">{payment.booking_info?.client_email || '—'}</td>
                      <td className="py-3 text-text-muted">{new Date(payment.created_at).toLocaleString('ru-RU')}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {payment.payment_url && (
                            <a
                              href={payment.payment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-primary"
                              title="Открыть ссылку оплаты"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => refreshPaymentStatus(payment.id)}
                            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-primary"
                            title="Обновить статус"
                            disabled={refreshingId === payment.id}
                          >
                            <RefreshCw size={16} className={refreshingId === payment.id ? 'animate-spin' : ''} />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendPaymentLink(payment.id)}
                            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-primary disabled:opacity-50"
                            title="Отправить ссылку клиенту"
                            disabled={!payment.booking_info?.client_email || sendingId === payment.id}
                          >
                            <Mail size={16} />
                          </button>
                          <a
                            href={`/api/payments/${payment.id}/receipt/`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-subtle hover:text-primary"
                            title="Открыть квитанцию"
                          >
                            <ReceiptText size={16} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPayments.length === 0 && (
              <div className="p-4 text-center text-text-muted">Платежи не найдены.</div>
            )}
          </Card>
        </>
      )}

      {tab === 'settings' && user?.is_director && (
        <Card title="Настройки YooKassa">
          <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-subtle p-3">
              <input
                id="test_mode"
                type="checkbox"
                checked={settings.test_mode}
                onChange={(event) => setSettings((current) => ({ ...current, test_mode: event.target.checked }))}
                className="h-5 w-5 rounded text-primary"
              />
              <label htmlFor="test_mode" className="cursor-pointer text-sm font-medium text-text">
                Тестовый режим. Если ключи не указаны, система будет использовать mock-платежи.
              </label>
            </div>

            <Input
              label="Shop ID"
              value={settings.shop_id}
              onChange={(event) => setSettings((current) => ({ ...current, shop_id: event.target.value }))}
            />
            <Input
              label="Secret Key"
              type="password"
              value={settings.secret_key}
              onChange={(event) => setSettings((current) => ({ ...current, secret_key: event.target.value }))}
              placeholder="Оставьте пустым, чтобы не менять текущий ключ"
            />
            <Input
              label="Базовый URL API"
              value={settings.base_url}
              onChange={(event) => setSettings((current) => ({ ...current, base_url: event.target.value }))}
            />

            {saved && <div className="text-sm text-success">Настройки сохранены.</div>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                <Save size={16} className="mr-1.5" />
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
