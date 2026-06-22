import { useEffect, useState } from 'react'
import axios from 'axios'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { Calendar, CheckCircle2, Clock, Phone, User } from 'lucide-react'

export default function PublicBooking() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState({ client_name: '', client_phone: '', service_id: '', start_time: '', notes: '' })
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    axios.get('/api/booking/services/').then(res => setServices(res.data.results || res.data))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await axios.post('/api/booking/public/', form)
    setSuccess(true)
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
          <Input label="Ваше имя" icon={<User size={16} />} value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} required />
          <Input label="Телефон" icon={<Phone size={16} />} type="tel" value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} required />
          <Select label="Услуга" value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} options={serviceOptions} required />
          <Input label="Дата и время" icon={<Calendar size={16} />} type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
          <Input label="Примечания" icon={<Clock size={16} />} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" className="w-full" size="lg">
            <Calendar size={18} className="mr-2" />
            Записаться
          </Button>
        </form>
      </div>
    </div>
  )
}
