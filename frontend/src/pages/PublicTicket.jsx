import { useState } from 'react'
import axios from 'axios'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { CheckCircle2, HelpCircle, MessageSquare, Send, User } from 'lucide-react'

export default function PublicTicket() {
  const [form, setForm] = useState({ subject: '', description: '', requester_name: '', requester_contact: '' })
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await axios.post('/api/helpdesk/public/', form)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Обращение отправлено</h2>
          <p className="text-text-muted">Мы получили ваше обращение и скоро свяжемся с вами.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-primary mb-1">Studio 313</div>
          <p className="text-text-muted">Обращение в поддержку</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Ваше имя" icon={<User size={16} />} value={form.requester_name} onChange={e => setForm({ ...form, requester_name: e.target.value })} required />
          <Input label="Контакт (телефон / email / Telegram)" icon={<Send size={16} />} value={form.requester_contact} onChange={e => setForm({ ...form, requester_contact: e.target.value })} required />
          <Input label="Тема" icon={<HelpCircle size={16} />} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text mb-1.5">
              <MessageSquare size={16} className="text-primary" />
              Описание
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows="4"
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            <Send size={18} className="mr-2" />
            Отправить
          </Button>
        </form>
      </div>
    </div>
  )
}
