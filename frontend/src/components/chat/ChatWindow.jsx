import { useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import MessageInput from './MessageInput'
import { Users } from 'lucide-react'

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatWindow({ chat, messages, onSend, onFileUploaded, onVoiceUploaded, typing }) {
  const { user } = useAuth()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        Выберите чат, чтобы начать общение
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-surface h-full">
      <div className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="font-bold text-text truncate">{chat.display_name || chat.name}</h2>
          <div className="text-xs text-text-muted flex items-center gap-1">
            <Users size={12} />
            {chat.members?.length} участников
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map(msg => {
          const isMe = msg.sender?.id === user?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] px-4 py-2 rounded-2xl ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-subtle text-text rounded-bl-none'}`}>
                {!isMe && (
                  <div className="text-xs font-medium mb-1 opacity-80">{msg.sender?.first_name || msg.sender?.name || msg.sender?.username}</div>
                )}
                {msg.reply_to && (
                  <div className="text-xs opacity-70 border-l-2 border-current pl-2 mb-1">
                    {msg.reply_to.text || 'Сообщение'}
                  </div>
                )}
                {msg.sticker && (
                  <img src={msg.sticker.image} alt={msg.sticker.name} className="w-24 h-24 object-contain" />
                )}
                {msg.file_url && (
                  <a href={msg.file_url} target="_blank" rel="noreferrer" className={`block underline text-sm mb-1 ${isMe ? 'text-white' : 'text-primary'}`}>
                    📎 {msg.file?.split('/').pop() || 'Файл'}
                  </a>
                )}
                {msg.voice_url && (
                  <div className="mb-1">
                    <audio controls src={msg.voice_url} className="max-w-full" />
                    {msg.transcription ? (
                      <div className={`text-xs mt-1 ${isMe ? 'text-white/80' : 'text-text-muted'}`}>
                        {msg.transcription}
                      </div>
                    ) : (
                      <div className={`text-xs mt-1 italic ${isMe ? 'text-white/60' : 'text-text-muted'}`}>
                        Распознаём речь...
                      </div>
                    )}
                  </div>
                )}
                {msg.text && <div className="text-sm whitespace-pre-wrap">{msg.text}</div>}
                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-text-muted'}`}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-subtle text-text-muted text-xs px-3 py-2 rounded-full">
              {typing} печатает...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput chatId={chat.id} onSend={onSend} onFileUploaded={onFileUploaded} onVoiceUploaded={onVoiceUploaded} />
    </div>
  )
}
