import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { AlertCircle, User, Lock, LogIn } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl p-6 md:p-8">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-primary mb-2">Studio 313</div>
          <p className="text-text-muted">Вход в систему управления студией</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          <Input
            type="text"
            label="Логин"
            icon={<User size={16} />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            type="password"
            label="Пароль"
            icon={<Lock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" size="lg" className="w-full">
            <LogIn size={18} className="mr-2" />
            Войти
          </Button>
        </form>
      </div>
    </div>
  )
}
