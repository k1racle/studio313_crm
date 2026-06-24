import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { User, Mail, Send, CheckCircle2, RefreshCw, Bell, Camera, Save } from 'lucide-react'
import { formatFullName } from '../utils/format'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [code, setCode] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState({ email_enabled: true, telegram_enabled: true, sms_enabled: false })
  const [savingPrefs, setSavingPrefs] = useState(false)

  const [form, setForm] = useState({ first_name: '', last_name: '', patronymic: '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    api.get('/notifications/preferences/').then(res => setPreferences(res.data)).catch(console.error)
  }, [])

  useEffect(() => {
    if (user) {
      setForm({ first_name: user.first_name || '', last_name: user.last_name || '', patronymic: user.patronymic || '' })
      setAvatarPreview(user.avatar || null)
    }
  }, [user])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const formData = new FormData()
      formData.append('first_name', form.first_name)
      formData.append('last_name', form.last_name)
      formData.append('patronymic', form.patronymic)
      if (avatarFile) formData.append('avatar', avatarFile)
      await api.patch('/auth/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await refreshUser()
    } catch (err) {
      console.error(err)
      alert('Не удалось сохранить профиль')
    } finally {
      setSavingProfile(false)
    }
  }

  const generateCode = async () => {
    setLoading(true)
    try {
      const res = await api.post('/telegram/link-code/')
      setCode(res.data.code)
      setExpiresAt(new Date(res.data.expires_at).toLocaleString('ru'))
    } finally {
      setLoading(false)
    }
  }

  const togglePreference = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] }
    setPreferences(updated)
    setSavingPrefs(true)
    try {
      const res = await api.patch('/notifications/preferences/', { [key]: updated[key] })
      setPreferences(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingPrefs(false)
    }
  }

  const displayName = formatFullName(user)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Профиль</h1>
        <p className="text-text-muted">Управление аккаунтом и уведомлениями</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-1">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="avatar"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary text-white text-3xl flex items-center justify-center font-bold">
                    {(user?.first_name?.[0] || user?.last_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <label
                  htmlFor="avatar"
                  className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 shadow-md"
                  title="Изменить аватар"
                >
                  <Camera size={16} />
                </label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <h3 className="text-xl font-bold text-text">{displayName}</h3>
              <p className="text-text-muted capitalize">{user?.role}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Фамилия</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Имя</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Отчество</label>
                <input
                  type="text"
                  value={form.patronymic}
                  onChange={e => setForm(f => ({ ...f, patronymic: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button type="submit" disabled={savingProfile} className="w-full">
                {savingProfile ? (
                  <RefreshCw size={16} className="mr-1.5 animate-spin" />
                ) : (
                  <Save size={16} className="mr-1.5" />
                )}
                {savingProfile ? 'Сохранение...' : 'Сохранить профиль'}
              </Button>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="flex items-center gap-2 text-text-muted">
                  <User size={14} className="text-primary" />
                  Логин
                </span>
                <span className="font-medium text-text">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="flex items-center gap-2 text-text-muted">
                  <Mail size={14} className="text-primary" />
                  Email
                </span>
                <span className="font-medium text-text">{user?.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="flex items-center gap-2 text-text-muted">
                  <Send size={14} className="text-primary" />
                  Telegram ID
                </span>
                <span className="font-medium text-text">{user?.telegram_id || 'Не привязан'}</span>
              </div>
            </div>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <Card title="Каналы уведомлений" action={<Bell size={18} className="text-primary" />}>
            <div className="space-y-4">
              {[
                { key: 'email_enabled', label: 'Email-уведомления', icon: Mail, note: user?.email ? user.email : 'Email не указан' },
                { key: 'telegram_enabled', label: 'Telegram-уведомления', icon: Send, note: user?.telegram_id ? 'Привязан' : 'Telegram не привязан' },
              ].map(item => {
                const Icon = item.icon
                const disabled = savingPrefs || (item.key === 'email_enabled' && !user?.email) || (item.key === 'telegram_enabled' && !user?.telegram_id)
                return (
                  <label
                    key={item.key}
                    className={`flex items-center justify-between p-3 bg-subtle rounded-lg cursor-pointer transition-opacity ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-primary" />
                      <div>
                        <div className="text-sm font-medium text-text">{item.label}</div>
                        <div className="text-xs text-text-muted">{item.note}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences[item.key]}
                      onChange={() => !disabled && togglePreference(item.key)}
                      disabled={disabled}
                      className="w-5 h-5 text-primary rounded"
                    />
                  </label>
                )
              })}
            </div>
          </Card>

          <Card title="Привязка Telegram">
            {user?.telegram_id ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-semibold text-text">Telegram уже привязан</h3>
                <p className="text-text-muted">Вы будете получать уведомления в Telegram.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-text">Отправьте боту команду:</p>
                <code className="block p-3 bg-subtle rounded-lg font-mono text-sm text-text-muted">/link КОД</code>
                <Button onClick={generateCode} disabled={loading}>
                  <RefreshCw size={16} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Генерация...' : 'Сгенерировать код'}
                </Button>
                {code && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="text-2xl font-bold text-primary break-all mb-2">{code}</div>
                    <div className="text-sm text-text-muted">Действителен до: {expiresAt}</div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
