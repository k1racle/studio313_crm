import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import { CreditCard, Save, ExternalLink, RefreshCw, Search } from 'lucide-react'

const statusLabels = {
  pending: 'В ожидании',
  success: 'Успешно',
  failed: 'Ошибка',
  canceled: 'Отменён',
}

const statusBadgeVariant = {
  pending: 'yellow',
  success: 'green',
  failed: 'red',
  canceled: 'gray',
}

export default function Payments() {
  const { user } = useAuth()
  const [tab, setTab] = useState('list')
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [settings, setSettings] = useState({
    test_mode: true,
    username: '',
    password: '',
    token: '',
    base_url: 'https://pay.alfabank.ru/rest/',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadPayments = async () => {
    const res = await api.get('/payments/')
    setPayments(res.data.results || res.data)
  }

  const loadSettings = async () => {
    const res = await api.get('/payments/settings/')
    setSettings({
      test_mode: res.data.test_mode,
      username: res.data.username || '',
      password: '',
      token: res.data.token || '',
      base_url: res.data.base_url || 'https://pay.alfabank.ru/rest/',
    })
  }

  useEffect(() => {
    loadPayments()
    if (user?.is_director) loadSettings()
  }, [user])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const payload = { ...settings }
      if (!payload.password) delete payload.password
      await api.put('/payments/settings/', payload)
      setSettings(s => ({ ...s, password: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      alert('Ошибка сохранения настроек')
    } finally {
      setSaving(false)
    }
  }

  const checkStatus = async (id) => {
    await api.get(`/payments/${id}/status/`)
    loadPayments()
  }

  const filteredPayments = payments.filter(p =>
    String(p.booking_info?.client || '').toLowerCase().includes(search.toLowerCase()) ||
    String(p.booking_info?.service || '').toLowerCase().includes(search.toLowerCase()) ||
    String(p.id).includes(search)
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Платежи</h1>
          <p className="text-text-muted">История платежей и настройки терминала Альфа-Банк</p>
        </div>
        {user?.is_director && (
          <div className="flex gap-2 bg-subtle p-1 rounded-lg">
            {[
              { key: 'list', label: 'Платежи' },
              { key: 'settings', label: 'Настройки' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'list' && (
        <>
          <Card className="mb-6">
            <Input
              icon={<Search size={16} />}
              placeholder="Поиск по клиенту, услуге или ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-md"
            />
          </Card>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-text-muted">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Клиент</th>
                    <th className="pb-3 font-medium">Услуга</th>
                    <th className="pb-3 font-medium">Сумма</th>
                    <th className="pb-3 font-medium">Статус</th>
                    <th className="pb-3 font-medium">Дата</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredPayments.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-subtle">
                      <td className="py-3 text-text-muted">#{p.id}</td>
                      <td className="py-3 text-text">{p.booking_info?.client || '—'}</td>
                      <td className="py-3 text-text">{p.booking_info?.service || '—'}</td>
                      <td className="py-3 text-text font-medium">{p.amount} ₽</td>
                      <td className="py-3"><Badge variant={statusBadgeVariant[p.status]}>{statusLabels[p.status]}</Badge></td>
                      <td className="py-3 text-text-muted">{new Date(p.created_at).toLocaleString('ru')}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {p.payment_url && (
                            <a href={p.payment_url} target="_blank" rel="noreferrer" className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors" title="Ссылка на оплату">
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => checkStatus(p.id)}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors"
                            title="Проверить статус"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPayments.length === 0 && <div className="p-4 text-center text-text-muted">Нет платежей</div>}
          </Card>
        </>
      )}

      {tab === 'settings' && user?.is_director && (
        <Card title="Настройки терминала Альфа-Банк">
          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3 p-3 bg-subtle rounded-lg">
              <input
                id="test_mode"
                type="checkbox"
                checked={settings.test_mode}
                onChange={e => setSettings({ ...settings, test_mode: e.target.checked })}
                className="w-5 h-5 text-primary rounded"
              />
              <label htmlFor="test_mode" className="text-sm font-medium text-text cursor-pointer">
                Тестовый режим (платежи не отправляются в банк)
              </label>
            </div>
            <Input
              label="Логин терминала (userName)"
              value={settings.username}
              onChange={e => setSettings({ ...settings, username: e.target.value })}
            />
            <Input
              label="Пароль терминала"
              type="password"
              value={settings.password}
              onChange={e => setSettings({ ...settings, password: e.target.value })}
              placeholder="Оставьте пустым, чтобы не менять"
            />
            <Input
              label="Токен"
              value={settings.token}
              onChange={e => setSettings({ ...settings, token: e.target.value })}
            />
            <Input
              label="Базовый URL API"
              value={settings.base_url}
              onChange={e => setSettings({ ...settings, base_url: e.target.value })}
            />
            {saved && <div className="text-sm text-success">Настройки сохранены</div>}
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
