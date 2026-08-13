import { useEffect, useState } from 'react'
import axios from 'axios'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { Calendar, CheckCircle2, Clock, Phone, User } from 'lucide-react'

const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё]+(?:[ '-][A-Za-zА-Яа-яЁё]+)*$/

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function validateName(value) {
  const normalized = normalizeName(value)
  if (normalized.length < 2) return 'Укажите имя не короче 2 символов.'
  if (!NAME_PATTERN.test(normalized)) return 'Имя может содержать только буквы, пробел, дефис и апостроф.'
  return ''
}

function getPhoneDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function normalizePhone(value) {
  let digits = getPhoneDigits(value)
  if (!digits) return ''
  if (digits[0] === '8') digits = `7${digits.slice(1)}`
  else if (digits[0] === '9') digits = `7${digits}`
  else if (digits[0] !== '7') digits = `7${digits}`
  return `+${digits.slice(0, 11)}`
}

function formatPhone(value) {
  const normalized = normalizePhone(value)
  const digits = normalized.replace(/\D/g, '')
  if (!digits) return ''

  const parts = ['+7']
  if (digits.length > 1) parts.push(digits.slice(1, 4))
  if (digits.length > 4) parts.push(digits.slice(4, 7))
  if (digits.length > 7) parts.push(digits.slice(7, 9))
  if (digits.length > 9) parts.push(digits.slice(9, 11))

  return parts.filter(Boolean).join(' ')
}

function validatePhone(value) {
  return /^\+7\d{10}$/.test(normalizePhone(value)) ? '' : 'Телефон должен быть в формате +7 999 999 99 99.'
}

function getFieldErrors(data) {
  return {
    client_name: Array.isArray(data?.client_name) ? data.client_name.join(' ') : '',
    client_phone: Array.isArray(data?.client_phone) ? data.client_phone.join(' ') : '',
    submit: data?.detail || '',
  }
}

export default function PublicBooking() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState({ client_name: '', client_phone: '', service_id: '', start_time: '', notes: '' })
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({ client_name: '', client_phone: '', submit: '' })

  useEffect(() => {
    axios.get('/api/booking/services/').then(res => setServices(res.data.results || res.data))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextErrors = {
      client_name: validateName(form.client_name),
      client_phone: validatePhone(form.client_phone),
      submit: '',
    }

    if (nextErrors.client_name || nextErrors.client_phone) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      ...form,
      client_name: normalizeName(form.client_name),
      client_phone: normalizePhone(form.client_phone),
    }

    try {
      await axios.post('/api/booking/public/', payload)
      setSuccess(true)
    } catch (error) {
      const fieldErrors = getFieldErrors(error.response?.data)
      setErrors({
        ...fieldErrors,
        submit: fieldErrors.submit || 'Не удалось отправить заявку.',
      })
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Спасибо!</h2>
          <p className="text-text-muted">Ваша запись принята. Мы свяжемся с вами для подтверждения.</p>
        </div>
      </div>
    )
  }

  const serviceOptions = [{ value: '', label: 'Выберите услугу' }, ...services.map(s => ({ value: s.id, label: s.name }))]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-primary mb-1">Studio 313</div>
          <p className="text-text-muted">Запись на услугу</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Ваше имя"
              icon={<User size={16} />}
              value={form.client_name}
              onChange={e => {
                const value = e.target.value
                setForm(prev => ({ ...prev, client_name: value }))
                setErrors(prev => ({ ...prev, client_name: validateName(value), submit: '' }))
              }}
              onBlur={e => {
                const value = normalizeName(e.target.value)
                setForm(prev => ({ ...prev, client_name: value }))
                setErrors(prev => ({ ...prev, client_name: validateName(value) }))
              }}
              autoComplete="name"
              required
            />
            {errors.client_name && <div className="mt-1 text-sm text-danger">{errors.client_name}</div>}
          </div>

          <div>
            <Input
              label="Телефон"
              icon={<Phone size={16} />}
              type="tel"
              inputMode="numeric"
              placeholder="+7 999 999 99 99"
              maxLength={16}
              value={form.client_phone}
              onChange={e => {
                const value = formatPhone(e.target.value)
                setForm(prev => ({ ...prev, client_phone: value }))
                setErrors(prev => ({ ...prev, client_phone: validatePhone(value), submit: '' }))
              }}
              onBlur={e => {
                const value = formatPhone(e.target.value)
                setForm(prev => ({ ...prev, client_phone: value }))
                setErrors(prev => ({ ...prev, client_phone: validatePhone(value) }))
              }}
              autoComplete="tel"
              required
            />
            {errors.client_phone && <div className="mt-1 text-sm text-danger">{errors.client_phone}</div>}
          </div>

          <Select label="Услуга" value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} options={serviceOptions} required />
          <Input label="Дата и время" icon={<Calendar size={16} />} type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
          <Input label="Примечания" icon={<Clock size={16} />} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          {errors.submit && <div className="text-sm text-danger">{errors.submit}</div>}
          <Button type="submit" className="w-full" size="lg">
            <Calendar size={18} className="mr-2" />
            Записаться
          </Button>
        </form>
      </div>
    </div>
  )
}
