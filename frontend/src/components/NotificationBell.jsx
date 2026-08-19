import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, X } from 'lucide-react'

import api from '../api/axios'
import { lockBodyScroll } from '../utils/bodyScrollLock'

export default function NotificationBell({
  size = 20,
  buttonClassName = '',
  title = 'Уведомления',
}) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications/'),
        api.get('/notifications/unread-count/'),
      ])
      setNotifications(listRes.data.results || listRes.data)
      setUnreadCount(countRes.data.unread_count || 0)
    } catch {
      // Фоновая загрузка не должна ломать интерфейс
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    if (!open) return undefined

    const releaseBodyScroll = lockBodyScroll()
    document.addEventListener('keydown', onKeyDown)
    load()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      releaseBodyScroll()
    }
  }, [open])

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read/`)
    load()
  }

  const markAllRead = async () => {
    await api.post('/notifications/read-all/')
    load()
  }

  const panel = (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[140] bg-[rgba(7,11,18,0.44)] backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 right-0 z-[141] w-full max-w-lg transform border-l border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,246,255,0.98))] shadow-[var(--panel-shadow-strong)] transition-transform duration-300 ease-out dark:bg-[linear-gradient(180deg,rgba(16,23,34,0.98),rgba(10,15,24,0.98))] ${
          open ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-5">
          <div>
            <div className="kicker text-primary">Inbox</div>
            <h2 className="text-2xl font-semibold text-text">Уведомления</h2>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface/70 px-4 py-2 text-xs font-semibold text-primary hover:bg-subtle"
              >
                <Check size={14} />
                Прочитать все
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border/70 bg-surface/70 p-2.5 text-text-muted hover:bg-subtle hover:text-text"
              title="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5" style={{ height: 'calc(100vh - 92px)' }}>
          {notifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-surface/40 text-center text-sm text-text-muted">
              <Bell size={42} className="mb-3 opacity-30" />
              Новых уведомлений нет
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`rounded-[24px] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,40,0.06)] ${
                    notification.is_read
                      ? 'border-border/70 bg-surface/66'
                      : 'border-primary/12 bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-text">{notification.title}</div>
                      <div className="mt-1 text-sm text-text-muted">{notification.message}</div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-text-muted">
                        {new Date(notification.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => markRead(notification.id)}
                        className="shrink-0 rounded-full border border-border/70 bg-surface/70 p-2 text-text-muted hover:text-primary"
                        title="Отметить прочитанным"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative inline-flex items-center justify-center rounded-full border border-border/80 bg-surface/84 p-2.5 text-text-muted shadow-[0_8px_24px_rgba(15,23,40,0.08)] transition-all hover:-translate-y-0.5 hover:text-primary hover:shadow-[0_12px_30px_rgba(15,23,40,0.12)] ${buttonClassName}`}
        title={title}
      >
        <Bell size={size} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </>
  )
}
