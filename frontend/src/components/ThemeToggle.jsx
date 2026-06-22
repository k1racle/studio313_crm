import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function ThemeToggle({ className = '', iconOnly = false, size = 20 }) {
  const { theme, setTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'system' ? 'Системная' : theme === 'dark' ? 'Тёмная' : 'Светлая'
  return (
    <button
      onClick={() => setTheme(next)}
      className={`flex items-center justify-center gap-2 p-2 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors ${className}`}
      title={`Тема: ${label}`}
    >
      <Icon size={size} />
      {!iconOnly && <span className="hidden md:inline">{label}</span>}
    </button>
  )
}
