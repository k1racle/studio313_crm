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
  MessageSquare,
  Newspaper,
  Users,
  X,
} from 'lucide-react'

import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { usePageHeader } from '../contexts/PageHeaderContext'
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

const headerItems = [
  ...menuItems,
  { path: '/chat', label: 'Чаты', icon: MessageSquare },
]

const birthdayKindLabels = {
  employee: 'Сотрудник',
  client: 'Клиент',
  contact: 'Контакт',
}

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

function formatBirthdayDate(item) {
  if (item.is_today) return 'Сегодня'
  return new Date(item.next_birthday).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { headerContent } = usePageHeader()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [birthdays, setBirthdays] = useState([])
  const [birthdayOpen, setBirthdayOpen] = useState(false)

  const currentItem = useMemo(
    () => headerItems.find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)) || menuItems[0],
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

  const hasBirthdays = birthdays.length > 0

  const birthdaySummary = useMemo(() => {
    if (!hasBirthdays) return 'В ближайшие 7 дней дней рождений нет'
    if (birthdays.some(item => item.is_today)) return 'Есть именинники сегодня'
    return `${birthdays.length} в ближайшие 7 дней`
  }, [birthdays, hasBirthdays])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    api.get('/auth/users/birthdays/?days=7')
      .then(res => setBirthdays(res.data || []))
      .catch(() => setBirthdays([]))
  }, [location.pathname])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setBirthdayOpen(false)
    }

    if (birthdayOpen) {
      document.addEventListener('keydown', onKeyDown)
    }

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [birthdayOpen])

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

  const birthdayButton = (
    <div className="mx-4 mb-4">
      <button
        type="button"
        onClick={() => setBirthdayOpen(true)}
        className="flex w-full items-center gap-3 rounded-[24px] border border-white/12 bg-white/7 px-4 py-4 text-left text-white/88 transition-all hover:bg-white/10"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
          <Cake size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Дни рождения</span>
          <span className="mt-0.5 block text-xs text-white/55">{birthdaySummary}</span>
        </span>
      </button>
    </div>
  )

  const sidebarControls = (
    <div className="mt-4 flex items-center gap-2">
      <ThemeToggle
        iconOnly
        className="!h-12 !w-12 !border-white/10 !bg-white/8 !text-white/72 hover:!bg-white/12 hover:!text-white"
      />
      <NotificationBell
        size={18}
        title="Уведомления"
        buttonClassName="!h-12 !w-12 !border-white/10 !bg-white/8 !p-0 !text-white/72 !shadow-none hover:!bg-white/12 hover:!text-white"
      />
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/78 transition-colors hover:bg-white/12 hover:text-white"
        title="Выйти"
      >
        <LogOut size={16} />
      </button>
    </div>
  )

  return (
    <div className="app-canvas min-h-screen bg-bg">
      <div className="flex items-start">
        <aside className="sticky top-0 hidden h-screen w-[290px] shrink-0 p-4 lg:flex">
          <div className="flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#091120,#0e1a30_52%,#0d1527_100%)] text-white shadow-[0_30px_90px_rgba(4,8,15,0.38)]">
            <div className="border-b border-white/10 px-6 py-6">
              <Link to="/" className="brand-display block text-[2.5rem] font-semibold leading-none text-white">
                Studio 313
              </Link>
            </div>

            <div className="px-6 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/34">
              Навигация
            </div>
            {navLinks}

            {birthdayButton}

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
              {sidebarControls}
            </div>
          </div>
        </aside>

        <div className="fixed left-0 right-0 top-0 z-40 border-b border-border/70 bg-[rgba(255,255,255,0.88)] px-4 py-3 backdrop-blur-xl dark:bg-[rgba(8,12,20,0.84)] lg:hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Studio 313</div>
              <div className="brand-display text-xl text-text">{currentItem.label}</div>
            </div>
            <button
              type="button"
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
                <button type="button" onClick={() => setMobileOpen(false)} className="rounded-full bg-white/8 p-2 text-white/74">
                  <X size={18} />
                </button>
              </div>
              <div className="px-2 pt-2">{navLinks}</div>
              {birthdayButton}
              <div className="border-t border-white/10 px-5 py-4">
                <div className="mb-4 flex items-center gap-3">
                  <UserAvatar user={user} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{formatFullName(user)}</div>
                    <div className="truncate text-xs uppercase tracking-[0.14em] text-white/45">{user?.role || user?.username || 'Профиль'}</div>
                  </div>
                </div>
                {sidebarControls}
              </div>
            </div>
            <div className="flex-1 bg-[rgba(7,11,18,0.54)] backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        <main className="min-w-0 flex-1 pt-[84px] lg:pt-4">
          <div className="w-full px-4 pb-8 md:px-6 lg:px-8">
            <div className="soft-panel animate-fade-in sticky top-4 z-30 mb-6 hidden rounded-[28px] lg:block">
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <div className="kicker text-primary">Текущий раздел</div>
                  <div className="mt-1 flex flex-wrap items-end gap-3">
                    <h2 className="brand-display text-3xl text-text">{currentItem.label}</h2>
                    <span className="pb-1 text-sm capitalize text-text-muted">{currentDate}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {headerContent}
                </div>
              </div>
            </div>

            <div className="animate-rise-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <div
        onClick={() => setBirthdayOpen(false)}
        className={`fixed inset-0 z-[59] bg-[rgba(7,11,18,0.46)] backdrop-blur-sm transition-opacity duration-200 ${
          birthdayOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <div
        className={`fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
          birthdayOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="soft-panel overflow-hidden rounded-[30px]">
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-5">
            <div>
              <div className="kicker text-primary">Ближайшие 7 дней</div>
              <h2 className="mt-1 text-2xl font-semibold text-text">Дни рождения</h2>
            </div>
            <button
              type="button"
              onClick={() => setBirthdayOpen(false)}
              className="rounded-full border border-border/70 bg-surface/70 p-2.5 text-text-muted hover:bg-subtle hover:text-text"
              title="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
            {birthdays.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-surface/40 text-center text-sm text-text-muted">
                <Cake size={40} className="mb-3 opacity-35" />
                В ближайшие 7 дней дней рождений нет
              </div>
            ) : (
              <div className="space-y-3">
                {birthdays.map(item => (
                  <div
                    key={`${item.kind}-${item.entity_id}`}
                    className="rounded-[24px] border border-border/70 bg-surface/72 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,40,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-text">{item.full_name}</div>
                        <div className="mt-1 text-sm text-text-muted">{birthdayKindLabels[item.kind] || item.badge_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-text">{formatBirthdayDate(item)}</div>
                        <div className="mt-1 text-xs text-text-muted">
                          {item.is_today ? 'Сегодня' : `Через ${item.days_until} дн.`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingChatButton />
    </div>
  )
}
