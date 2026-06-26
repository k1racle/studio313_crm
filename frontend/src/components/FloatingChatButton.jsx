import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import api from '../api/axios'

export default function FloatingChatButton() {
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  const loadUnread = async () => {
    try {
      const res = await api.get('/chat/unread/')
      setUnread(res.data.unread_count || 0)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadUnread()
    const interval = setInterval(loadUnread, 10000)
    return () => clearInterval(interval)
  }, [location.pathname])

  if (location.pathname === '/chat') return null

  return (
    <Link
      to="/chat"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary-dark hover:scale-105 transition-all"
      aria-label="Открыть чат"
    >
      <MessageSquare size={24} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-danger text-white text-xs font-bold rounded-full border-2 border-bg">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
