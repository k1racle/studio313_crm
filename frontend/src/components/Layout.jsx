import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  Cake,
  CheckSquare,
  Clapperboard,
  Clock,
  Contact,
  CreditCard,
  Folder,
  FolderOpen,
  HeadphonesIcon,
  Key,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Users,
  X,
} from 'lucide-react'

import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { formatFullName } from '../utils/format'
import FloatingChatButton from './FloatingChatButton'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

const menuItems = [
  { path: '/', label: 'Главная', icon: LayoutDashboard },
  { path: '/tasks', label: 'Задачи', icon: CheckSquare },
  { path: '/production', label: 'Производство', icon: Clapperboard },
  { path: '/media-plan', label: 'Медиа-план', icon: Newspaper },
  { path: '/files', label: 'Файлы', icon: Folder },
  { path: '/contacts', label: 'Контакты', icon: Contact },
  { path: '/password-vault', label: 'Доступы', icon: Key },
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

function UserAvatar({ user, size = 'md' }) {
  const sizes = {
    sm: 'h-10 w-10 text-sm',
    md: 'h-12 w-12 text-base',
  }

  if (user?.avatar) {
    return <img src={user.avatar} alt="" className={`${sizes[size]} rounded-2xl object-cover`} />
  }

  return (
    <div className={`${sizes[size]} flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),#6b84ff)] font-semibold text-white shadow-[0_10px_24px_rgba(34,80,255,0.28)]`}>
      {(user?.last_name?.[0] || user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [birthdays, setBirthdays] = useState([])

  const currentItem = useMemo(
    () => menuItems.find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)) || menuItems[0],
    [location.pathname]
  )

  const currentDate = useMemo(
    () => new Intl.DateTimeFormat('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date()),
    []
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    api.get('/auth/users/birthdays/?days=7')
      .then(res => setBirthdays(res.data || []))
      .catch(() => setBirthdays([]))
  }, [location.pathname])

  const navLinks = (
    <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-4 pt-3">
      {menuItems.map(item => {
        const Icon = item.icon
        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
              isActive
                ? 'bg-white text-[#0f1728] shadow-[0_12px_28px_rgba(0,0,0,0.16)]'
                : 'text-white/72 hover:bg-white/8 hover:text-white'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
              isActive ? 'bg-[rgba(34,80,255,0.12)] text-primary' : 'bg-white/6 text-white/75 group-hover:bg-white/10'
            }`}>
              <Icon size={17} />
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const birthdayBlock = birthdays.length > 0 && (
    <div className="mx-4 mb-4 rounded-[24px] border border-white/12 bg-white/7 p-4 text-white/88">
      <div className="mb-2 flex items-center gap-2">
        <Cake size={16} className="text-blue-300" />
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
          {birthdays.some(item => item.is_today) ? 'Сегодня' : 'Ближайшие даты'}
        </div>
      </div>
      <div className="text-sm font-medium">
        {birthdays.some(item => item.is_today) ? 'День рождения сегодня' : 'Дни рождения'}
      </div>
      <div className="mt-1 text-sm text-white/64">
        {birthdays.map(item => item.badge_name || item.full_name).join(', ')}
      </div>
    </div>
  )

  return (
    <div className="app-canvas flex min-h-screen bg-bg">
      <aside className="hidden w-[290px] shrink-0 p-4 lg:flex">
        <div className="flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#091120,#0e1a30_52%,#0d1527_100%)] text-white shadow-[0_30px_90px_rgba(4,8,15,0.38)]">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">Studio workspace</div>
            <Link to="/" className="brand-display mt-3 block text-[2.5rem] leading-none text-white">
              Studio 313
            </Link>
            <p className="mt-3 max-w-[14rem] text-sm leading-6 text-white/62">
              CRM для задач, проектов, доступов и всей операционной работы студии.
            </p>
          </div>

          <div className="px-6 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/34">
            Навигация
          </div>
          {navLinks}

          {birthdayBlock}

          <div className="mx-4 mb-4 rounded-[26px] border border-white/10 bg-white/6 p-4">
            <Link
              to="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl"
            >
              <UserAvatar user={user} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{formatFullName(user)}</div>
                <div className="truncate text-xs uppercase tracking-[0.14em] text-white/45">
                  {user?.role || user?.username || 'Профиль'}
                </div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white/78 hover:bg-white/12 hover:text-white"
            >
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden fixed left-0 right-0 top-0 z-40 border-b border-border/70 bg-[rgba(255,255,255,0.88)] px-4 py-3 backdrop-blur-xl dark:bg-[rgba(8,12,20,0.84)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Studio 313</div>
            <div className="brand-display text-xl text-text">{currentItem.label}</div>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-full border border-border/80 bg-surface/84 p-2.5 text-text-muted shadow-[0_8px_24px_rgba(15,23,40,0.08)]"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-[84%] max-w-[320px] animate-rise-in overflow-hidden rounded-r-[28px] bg-[linear-gradient(180deg,#091120,#0e1a30_52%,#0d1527_100%)] text-white shadow-[0_30px_90px_rgba(4,8,15,0.38)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Навигация</div>
                <div className="brand-display text-2xl">Studio 313</div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-full bg-white/8 p-2 text-white/74">
                <X size={18} />
              </button>
            </div>
            <div className="px-2 pt-2">{navLinks}</div>
            <div className="border-t border-white/10 px-5 py-4">
              <div className="mb-4 flex items-center gap-3">
                <UserAvatar user={user} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{formatFullName(user)}</div>
                  <div className="truncate text-xs uppercase tracking-[0.14em] text-white/45">{user?.role || user?.username || 'Профиль'}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white/78"
              >
                <LogOut size={16} />
                Выйти
              </button>
            </div>
          </div>
          <div className="flex-1 bg-[rgba(7,11,18,0.54)] backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <main className="flex-1 overflow-auto pt-[84px] lg:pt-4">
        <div className="mx-auto max-w-7xl px-4 pb-8 md:px-6 lg:px-8">
          <div className="soft-panel animate-fade-in sticky top-4 z-30 mb-6 hidden rounded-[28px] lg:block">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="kicker text-primary">Текущий раздел</div>
                <div className="mt-1 flex items-end gap-3">
                  <h2 className="brand-display text-3xl text-text">{currentItem.label}</h2>
                  <span className="pb-1 text-sm capitalize text-text-muted">{currentDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <ThemeToggle />
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-surface/84 px-3 py-2 shadow-[0_8px_24px_rgba(15,23,40,0.08)] hover:-translate-y-0.5"
                >
                  <UserAvatar user={user} size="sm" />
                  <div className="hidden text-left xl:block">
                    <div className="max-w-[150px] truncate text-sm font-semibold text-text">{formatFullName(user)}</div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{user?.role || 'Профиль'}</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          <div className="animate-rise-in">
            <Outlet />
          </div>
        </div>
      </main>
      <FloatingChatButton />
    </div>
  )
}
