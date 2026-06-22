import { MessageSquare, Plus, Search } from 'lucide-react'

function formatTimeShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatSidebar({ chats, activeChat, onSelect, onCreate, search, setSearch }) {
  return (
    <div className="w-full md:w-80 bg-surface border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <MessageSquare size={20} className="text-primary" />
          Чаты
        </h2>
        <button
          onClick={onCreate}
          className="p-1.5 text-primary hover:bg-subtle rounded-lg transition-colors"
          title="Новый чат"
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Поиск чатов..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelect(chat)}
            className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
              activeChat?.id === chat.id ? 'bg-primary/5' : 'hover:bg-subtle'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm text-text truncate">{chat.display_name || chat.name}</span>
              <span className="text-[10px] text-text-muted">{formatTimeShort(chat.last_message?.created_at || chat.updated_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted truncate w-48">
                {chat.last_message?.voice_url
                  ? (chat.last_message?.transcription || '🎤 Голосовое сообщение')
                  : chat.last_message?.text || (chat.last_message?.sticker ? 'Стикер' : 'Нет сообщений')}
              </span>
              {chat.unread_count > 0 && (
                <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {chat.unread_count}
                </span>
              )}
            </div>
          </button>
        ))}
        {chats.length === 0 && <div className="p-4 text-sm text-text-muted text-center">Нет чатов</div>}
      </div>
    </div>
  )
}
