import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Lock, LogIn, ShieldCheck, Sparkles, User } from 'lucide-react'

import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#0a0f18_0%,#10203a_48%,#eef3fb_100%)] p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(93,124,255,0.32),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_20%)]" />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/12 bg-[rgba(9,14,24,0.72)] shadow-[0_40px_140px_rgba(0,0,0,0.34)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden flex-col justify-between border-r border-white/10 p-10 text-white lg:flex">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-200/70">Studio CRM</div>
            <div className="brand-display mt-4 text-6xl leading-none">Studio 313</div>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/72">
              Система управления студией, проектами, задачами, доступами и внутренними процессами в одном рабочем пространстве.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              { icon: ShieldCheck, title: 'Контроль доступа', text: 'Роли сотрудников, пароли и рабочие доступы в одной системе.' },
              { icon: Sparkles, title: 'Удобная операционка', text: 'Задачи, производство, запись клиентов и финансовые блоки без перегруза.' },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
                    <Icon size={20} />
                  </div>
                  <div className="text-lg font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-white/66">{item.text}</div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,248,255,0.98))] p-6 md:p-10 dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.96),rgba(9,14,24,0.98))]">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Вход в систему</div>
              <h1 className="brand-display mt-3 text-5xl leading-none text-text">Studio 313</h1>
              <p className="mt-4 text-sm leading-6 text-text-muted">
                Войдите в CRM, чтобы продолжить работу с проектами, задачами и клиентами.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 rounded-[22px] border border-danger/20 bg-danger/6 px-4 py-3 text-sm text-danger">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                type="text"
                label="Логин"
                icon={<User size={16} />}
                value={username}
                onChange={event => setUsername(event.target.value)}
                required
              />

              <Input
                type="password"
                label="Пароль"
                icon={<Lock size={16} />}
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
              />

              <Button type="submit" size="lg" className="w-full">
                <LogIn size={18} />
                Войти
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
