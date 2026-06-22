import { useEffect, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'
import api from '../api/axios'

export default function NotificationBell({ size = 22 }) {
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
      setUnreadCount(countRes.data.unread_count)
    } catch {
      // игнорируем ошибки фоновой загрузки
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      load()
    }
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read/`)
    load()
  }

  const markAllRead = async () => {
    await api.post('/notifications/read-all/')
    load()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 text-text-muted hover:text-primary hover:bg-surface rounded-lg transition-colors"
        title="Уведомления"
      >
        <Bell size={size} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Right sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Уведомления</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Check size={14} />
                Все прочитаны
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-2 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors"
              title="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 65px)' }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-text-muted text-sm">
              <Bell size={40} className="mb-3 opacity-30" />
              Нет уведомлений
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-5 py-4 hover:bg-subtle transition-colors ${
                    n.is_read ? 'opacity-60' : 'bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text">{n.title}</div>
                      <div className="text-xs text-text-muted line-clamp-2 mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-text-muted mt-1.5">
                        {new Date(n.created_at).toLocaleString('ru')}
                      </div>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="p-1.5 text-text-muted hover:text-primary hover:bg-surface rounded transition-colors shrink-0"
                        title="Отметить прочитанным"
                      >
                        <Check size={16} />
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
}
