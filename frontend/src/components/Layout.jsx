import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/axios'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'
import FloatingChatButton from './FloatingChatButton'
import { formatFullName } from '../utils/format'
import {
  LayoutDashboard, CheckSquare, FolderOpen, Users, Calendar, Briefcase,
  CreditCard, HeadphonesIcon, LogOut, Menu, X,
  BarChart3, Clock, BookOpen, Cake, Clapperboard, Newspaper, Folder, Contact
} from 'lucide-react'

const menuItems = [
  { path: '/', label: 'Главная', icon: LayoutDashboard },
  { path: '/tasks', label: 'Задачи', icon: CheckSquare },
  { path: '/production', label: 'Производство', icon: Clapperboard },
  { path: '/media-plan', label: 'Медиа-план', icon: Newspaper },
  { path: '/files', label: 'Файлы', icon: Folder },
  { path: '/contacts', label: 'Контакты', icon: Contact },
  { path: '/projects', label: 'Проекты', icon: FolderOpen },
  { path: '/clients', label: 'Клиенты', icon: Users },
  { path: '/bookings', label: 'Запись', icon: Calendar },
  { path: '/services', label: 'Услуги', icon: Briefcase },
  { path: '/payments', label: 'Платежи', icon: CreditCard },
  { path: '/finance', label: 'Финансы', icon: BarChart3 },
  { path: '/timesheets', label: 'Таймшиты', icon: Clock },
  { path: '/helpdesk', label: 'Хелпдеск', icon: HeadphonesIcon },
  { path: '/knowledge', label: 'База знаний', icon: BookOpen },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const [birthdays, setBirthdays] = useState([])

  useEffect(() => {
    api.get('/auth/users/birthdays/?days=7')
      .then(res => setBirthdays(res.data || []))
      .catch(() => setBirthdays([]))
  }, [location.pathname])

  const navLinks = (
    <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
      {menuItems.map(item => {
        const Icon = item.icon
        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-text-muted hover:bg-subtle hover:text-text'
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const birthdayBlock = birthdays.length > 0 && (
    <div className="px-4 py-3 mx-3 md:mx-4 mb-2 bg-primary/5 border border-primary/10 rounded-lg">
      <div className="flex items-start gap-2">
        <Cake size={16} className="text-primary mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-medium text-text">
            {birthdays.some(b => b.is_today) ? 'Сегодня день рождения' : 'Ближайшие дни рождения'}
          </div>
          <div className="text-xs text-text-muted truncate">
            {birthdays.map(b => b.full_name).join(', ')}
          </div>
        </div>
      </div>
    </div>
  )

  const userBlock = (
    <div className="p-4 border-t border-border">
      {birthdayBlock}
      <Link
        to="/profile"
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-3 mb-3 p-2 -m-2 rounded-lg hover:bg-subtle transition-colors cursor-pointer"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
            {(user?.last_name?.[0] || user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{formatFullName(user)}</div>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 bg-subtle rounded-lg p-2">
        <NotificationBell />
        <ThemeToggle iconOnly size={22} />
        <button
          onClick={handleLogout}
          className="p-2 text-text-muted hover:text-danger hover:bg-surface rounded-lg transition-colors"
          title="Выйти"
        >
          <LogOut size={22} />
        </button>
      </div>
    </div>
  )

  const sidebarHeader = (
    <div className="p-4 md:p-6 border-b border-border">
      <div className="text-xl md:text-2xl font-bold text-primary">Studio 313</div>
      <div className="text-xs text-text-muted mt-1">Управление студией</div>
    </div>
  )

  return (
    <div className="flex h-screen h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-border flex-col">
        {sidebarHeader}
        {navLinks}
        {userBlock}
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="font-bold text-primary text-lg">Studio 313</div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-surface border-r border-border flex flex-col shadow-xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-bold text-primary text-lg">Меню</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-text-muted hover:text-text hover:bg-subtle rounded-lg">
                <X size={20} />
              </button>
            </div>
            {navLinks}
            {userBlock}
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="relative p-4 md:p-6 lg:p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
      <FloatingChatButton />
    </div>
  )
}
