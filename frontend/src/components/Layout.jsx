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

const brandLogoSrc = '/logo-white.svg'

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

const mobileQuickNav = [
  { path: '/', label: 'Главная', icon: LayoutDashboard },
  { path: '/tasks', label: 'Задачи', icon: CheckSquare },
  { path: '/production', label: 'Производство', icon: Clapperboard },
  { path: '/clients', label: 'Клиенты', icon: Users },
]

const mobilePrimaryPaths = ['/', '/tasks', '/production', '/media-plan', '/projects', '/files', '/clients', '/finance']

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
  const [mobileMenuTab, setMobileMenuTab] = useState('primary')
  const [birthdays, setBirthdays] = useState([])
  const [birthdayOpen, setBirthdayOpen] = useState(false)
  const hasHeaderActions = Boolean(headerContent)

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
    if (!hasBirthdays) return 'В ближайшие 7 дней дней рождения нет'
    if (birthdays.some(item => item.is_today)) return 'Есть именинники сегодня'
    return `${birthdays.length} в ближайшие 7 дней`
  }, [birthdays, hasBirthdays])

  const mobilePrimaryItems = useMemo(
    () => menuItems.filter(item => mobilePrimaryPaths.includes(item.path)),
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setBirthdayOpen(false)
    }

    if (birthdayOpen) {
      document.addEventListener('keydown', onKeyDown)
    }

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [birthdayOpen])

  useEffect(() => {
    setMobileOpen(false)
    setMobileMenuTab('primary')
  }, [location.pathname])

  useEffect(() => {
    const shouldLock = mobileOpen || birthdayOpen
    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction

    if (shouldLock) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [birthdayOpen, mobileOpen])

  const renderMenuLink = (item) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all ${
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
  }

  const renderMenuCard = (item) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`rounded-[22px] border px-3.5 py-3 transition-all ${
          isActive
            ? 'border-white/20 bg-white text-[#0f1728] shadow-[0_12px_28px_rgba(0,0,0,0.16)]'
            : 'border-white/10 bg-white/6 text-white/82 hover:bg-white/9'
        }`}
      >
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          isActive ? 'bg-[rgba(34,80,255,0.12)] text-primary' : 'bg-white/8 text-white/78'
        }`}>
          <Icon size={17} />
        </span>
        <div className={`mt-3 truncate text-sm font-semibold ${isActive ? 'text-[#0f1728]' : 'text-white'}`}>{item.label}</div>
      </Link>
    )
  }

  const desktopNavLinks = (
    <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-4 pt-3">
      {menuItems.map(renderMenuLink)}
    </nav>
  )

  const mobileNavLinks = (
    <nav className="space-y-1.5">
      {menuItems.map(renderMenuLink)}
    </nav>
  )

  const birthdayButton = (
    <div className="mx-4 mb-4">
      <button
        type="button"
        onClick={() => setBirthdayOpen(true)}
        className="flex w-full items-center gap-3 rounded-[22px] border border-white/12 bg-white/7 px-3.5 py-3.5 text-left text-white/88 transition-all hover:bg-white/10"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
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
              <Link to="/" className="block">
                <img src={brandLogoSrc} alt="Studio 313" className="h-auto w-full max-w-[208px]" />
              </Link>
            </div>

            <div className="px-6 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/34">
              Навигация
            </div>
            {desktopNavLinks}

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

        <div className="fixed left-0 right-0 top-0 z-40 border-b border-border/70 bg-[rgba(255,255,255,0.9)] px-4 py-2.5 backdrop-blur-xl dark:bg-[rgba(8,12,20,0.88)] lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="brand-display truncate text-[1.75rem] leading-none text-text">{currentItem.label}</div>
            </div>
            {hasHeaderActions ? (
              <div className="mobile-header-actions min-w-0 max-w-[62%] overflow-x-auto pb-1">
                <div className="flex w-max min-w-full justify-end">
                  {headerContent}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="h-[100dvh] w-full animate-rise-in overflow-hidden bg-[linear-gradient(180deg,#091120,#0e1a30_52%,#0d1527_100%)] text-white shadow-[0_30px_90px_rgba(4,8,15,0.38)]">
                <div className="flex h-full flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Меню</div>
                    <img src={brandLogoSrc} alt="Studio 313" className="mt-2 h-auto w-full max-w-[148px]" />
                  </div>
                  <button type="button" onClick={() => setMobileOpen(false)} className="rounded-full bg-white/8 p-2 text-white/74">
                    <X size={18} />
                  </button>
                </div>

                <div className="border-b border-white/10 px-4 py-3">
                  <div className="grid grid-cols-2 gap-2 rounded-[20px] bg-white/6 p-1">
                    <button
                      type="button"
                      onClick={() => setMobileMenuTab('primary')}
                      className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-all ${
                        mobileMenuTab === 'primary'
                          ? 'bg-white text-[#0f1728] shadow-[0_10px_22px_rgba(0,0,0,0.16)]'
                          : 'text-white/72'
                      }`}
                    >
                      Быстро
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileMenuTab('all')}
                      className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-all ${
                        mobileMenuTab === 'all'
                          ? 'bg-white text-[#0f1728] shadow-[0_10px_22px_rgba(0,0,0,0.16)]'
                          : 'text-white/72'
                      }`}
                    >
                      Все разделы
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                  {mobileMenuTab === 'primary' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2.5">
                        {mobilePrimaryItems.map(renderMenuCard)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileMenuTab('all')}
                        className="w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white/82 transition-all hover:bg-white/10"
                      >
                        Открыть все разделы
                      </button>
                    </div>
                  ) : mobileNavLinks}
                </div>

                <div className="shrink-0 border-t border-white/10 px-4 pt-4">
                  {birthdayButton}
                </div>

                <div className="safe-bottom shrink-0 px-4 py-4">
                  <div className="mb-3 flex items-center gap-3">
                    <UserAvatar user={user} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{formatFullName(user)}</div>
                      <div className="truncate text-xs uppercase tracking-[0.14em] text-white/45">
                        {user?.role || user?.username || 'Профиль'}
                      </div>
                    </div>
                  </div>
                  {sidebarControls}
                </div>
              </div>
            </div>
          </div>
        )}

        <main className={`min-w-0 flex-1 ${hasHeaderActions ? 'pt-[84px]' : 'pt-[76px]'} pb-24 lg:pt-4 lg:pb-0`}>
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

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-[rgba(255,255,255,0.92)] px-3 py-3 backdrop-blur-xl dark:bg-[rgba(8,12,20,0.92)] lg:hidden">
        <div className="grid grid-cols-5 gap-2">
          {mobileQuickNav.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-[0_14px_28px_rgba(34,80,255,0.22)]'
                    : 'text-text-muted hover:bg-surface/82 hover:text-text'
                }`}
              >
                <Icon size={18} />
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Еще"
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-[11px] font-semibold transition-all ${
              mobileOpen
                ? 'bg-primary text-white shadow-[0_14px_28px_rgba(34,80,255,0.22)]'
                : 'text-text-muted hover:bg-surface/82 hover:text-text'
            }`}
          >
            <Menu size={18} />
          </button>
        </div>
      </nav>

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
                В ближайшие 7 дней дней рождения нет
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
