import { Moon, Monitor, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle({ className = '', iconOnly = false, size = 18 }) {
  const { theme, setTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'system' ? 'Системная' : theme === 'dark' ? 'Темная' : 'Светлая'

  return (
    <button
      onClick={() => setTheme(next)}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-border/80 bg-surface/84 px-3 py-2 text-text-muted shadow-[0_8px_24px_rgba(15,23,40,0.08)] hover:-translate-y-0.5 hover:text-primary hover:shadow-[0_12px_30px_rgba(15,23,40,0.12)] ${className}`}
      title={`Тема: ${label}`}
    >
      <Icon size={size} />
      {!iconOnly && <span className="hidden text-sm font-medium md:inline">{label}</span>}
    </button>
  )
}
