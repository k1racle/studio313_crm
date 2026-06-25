import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import useChatSocket from '../hooks/useChatSocket'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatWindow from '../components/chat/ChatWindow'
import CreateChatModal from '../components/chat/CreateChatModal'

export default function Chat() {
  const { user } = useAuth()
  const token = localStorage.getItem('accessToken')
  const [chats, setChats] = useState([])
  const [users, setUsers] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [typing, setTyping] = useState(null)
  const typingTimer = useRef(null)

  const loadChats = useCallback(async () => {
    const res = await api.get('/chat/')
    setChats(res.data.results || res.data)
  }, [])

  const loadUsers = useCallback(async () => {
    const res = await api.get('/auth/users/')
    setUsers((res.data.results || res.data).filter(u => u.id !== user?.id))
  }, [user])

  useEffect(() => {
    loadChats()
    loadUsers()
  }, [loadChats, loadUsers])

  useEffect(() => {
    if (!activeChat) {
      setMessages([])
      return
    }
    api.get(`/chat/${activeChat.id}/messages/`).then(res => {
      setMessages(res.data.results || res.data)
      api.post(`/chat/${activeChat.id}/read/`)
      setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, unread_count: 0 } : c))
    })
  }, [activeChat])

  const updateChatLastMessage = useCallback((msg) => {
    setChats(prev => {
      const chat = prev.find(c => c.id === msg.chat)
      if (!chat) return prev
      const isActive = activeChat?.id === msg.chat
      const unread = isActive ? 0 : (msg.sender?.id === user?.id ? (chat.unread_count || 0) : (chat.unread_count || 0) + 1)
      return [
        { ...chat, last_message: msg, unread_count: unread, updated_at: msg.created_at || new Date().toISOString() },
        ...prev.filter(c => c.id !== msg.chat)
      ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    })
  }, [activeChat, user])

  const handleIncomingMessage = useCallback((msg) => {
    setMessages(prev => {
      if (prev.find(m => m.id === msg.id)) return prev
      return [...prev, msg]
    })
    updateChatLastMessage(msg)
    if (activeChat?.id === msg.chat) {
      api.post(`/chat/${msg.chat}/read/`)
    }
  }, [activeChat, updateChatLastMessage])

  const handleMessageUpdate = useCallback((msg) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
    setChats(prev => {
      const chat = prev.find(c => c.id === msg.chat)
      if (!chat || chat.last_message?.id !== msg.id) return prev
      return [
        { ...chat, last_message: msg },
        ...prev.filter(c => c.id !== msg.chat)
      ]
    })
  }, [])

  const handleRead = useCallback((data) => {
    if (data.user_id !== user?.id && activeChat?.id === data.chat_id) {
      setMessages(prev => prev.map(m => ({ ...m, is_read: true })))
    }
  }, [activeChat, user])

  const handleTyping = useCallback((data) => {
    if (data.user_id !== user?.id && activeChat?.id === data.chat_id) {
      setTyping(data.user_name)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setTyping(null), 3000)
    }
  }, [activeChat, user])

  const { connected, send } = useChatSocket(token, handleIncomingMessage, handleRead, handleTyping, handleMessageUpdate)

  const handleSend = (payload) => {
    if (!activeChat) return
    if (payload.text || payload.sticker_id) {
      send({ action: 'message', chat_id: activeChat.id, ...payload })
    }
  }

  const handleFileUploaded = (msg) => {
    setMessages(prev => [...prev, msg])
    updateChatLastMessage(msg)
  }

  const handleVoiceUploaded = (msg) => {
    setMessages(prev => [...prev, msg])
    updateChatLastMessage(msg)
  }

  const handleCreateChat = async (data) => {
    const payload = {
      type: data.type,
      name: data.name,
      member_ids: data.member_ids,
    }
    const res = await api.post('/chat/', payload)
    const newChat = res.data
    setChats(prev => [newChat, ...prev])
    setActiveChat(newChat)
  }

  const handleSelectChat = (chat) => {
    setActiveChat(chat)
  }

  const handleBack = () => {
    setActiveChat(null)
  }

  const filteredChats = chats.filter(c =>
    (c.display_name || c.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 top-14 z-30 h-[calc(100dvh-3.5rem)] md:static md:inset-auto md:h-[calc(100dvh-4rem)] md:-m-8 bg-surface">
      <div className="flex h-full">
        <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-surface border-r border-border flex-col h-full`}>
          <ChatSidebar
            chats={filteredChats}
            activeChat={activeChat}
            onSelect={handleSelectChat}
            onCreate={() => setIsModalOpen(true)}
            search={search}
            setSearch={setSearch}
          />
        </div>
        <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full min-w-0`}>
          <div className="px-4 md:px-6 py-2 border-b border-border text-xs text-text-muted flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={handleBack} className="md:hidden p-1 text-text-muted hover:text-text">← Назад</button>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              {connected ? 'Онлайн' : 'Нет подключения'}
            </div>
          </div>
          <ChatWindow
            chat={activeChat}
            messages={messages}
            onSend={handleSend}
            onFileUploaded={handleFileUploaded}
            onVoiceUploaded={handleVoiceUploaded}
            typing={typing}
          />
        </div>
      </div>
      <CreateChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        users={users}
        onCreate={handleCreateChat}
      />
    </div>
  )
}
