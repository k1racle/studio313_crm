import { useState, useRef, useEffect } from 'react'
import Button from '../ui/Button'
import Picker from 'emoji-picker-react'
import { Smile, Paperclip, Image, Send, Mic, Square } from 'lucide-react'
import StickerPicker from './StickerPicker'
import api from '../../api/axios'
import { useTheme } from '../../contexts/ThemeContext'

export default function MessageInput({ chatId, onSend, onFileUploaded, onVoiceUploaded, disabled }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend({ text: text.trim() })
    setText('')
    setShowEmoji(false)
    setShowStickers(false)
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file || !chatId) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(`/chat/${chatId}/messages/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (onFileUploaded) onFileUploaded(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const startRecording = async () => {
    if (!chatId) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : undefined
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        sendVoice()
      }
      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(s => s + 1), 1000)
    } catch (err) {
      console.error(err)
      alert('Не удалось получить доступ к микрофону')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRecording(false)
    setRecordingTime(0)
  }

  const sendVoice = async () => {
    if (!chunksRef.current.length) return
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
    const blob = new Blob(chunksRef.current, { type: mimeType })
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType })
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('voice', file)
      const res = await api.post(`/chat/${chatId}/messages/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (onVoiceUploaded) onVoiceUploaded(res.data)
    } catch (err) {
      console.error(err)
      alert('Не удалось отправить голосовое сообщение')
    } finally {
      setUploading(false)
      chunksRef.current = []
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-surface safe-bottom">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
            placeholder={isRecording ? 'Запись...' : 'Напишите сообщение...'}
            className="w-full px-4 py-3 pr-24 border border-border rounded-xl resize-none bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={1}
            disabled={disabled || uploading || isRecording}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false) }}
              disabled={isRecording}
              className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors disabled:opacity-50"
            >
              <Smile size={18} />
            </button>
            <button
              type="button"
              onClick={() => { setShowStickers(!showStickers); setShowEmoji(false) }}
              disabled={isRecording}
              className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors disabled:opacity-50"
            >
              <Image size={18} />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isRecording}
              className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors disabled:opacity-50"
            >
              <Paperclip size={18} />
            </button>
          </div>
          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-2 z-20">
              <Picker theme={isDark ? 'dark' : 'light'} onEmojiClick={(emojiData) => { setText(t => t + emojiData.emoji) }} />
            </div>
          )}
          {showStickers && (
            <StickerPicker
              onSelect={(s) => { onSend({ sticker_id: s.id }); setShowStickers(false); setShowEmoji(false) }}
              onClose={() => setShowStickers(false)}
            />
          )}
        </div>

        {isRecording ? (
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-danger tabular-nums">{formatTime(recordingTime)}</div>
            <Button
              type="button"
              onClick={stopRecording}
              className="bg-danger hover:bg-danger/90"
            >
              <Square size={18} />
            </Button>
          </div>
        ) : (
          <>
            <Button
              type="button"
              onClick={startRecording}
              disabled={disabled || uploading}
              className="bg-primary text-white hover:bg-primary/90 shadow-sm"
              title="Голосовое сообщение"
            >
              <Mic size={18} />
            </Button>
            <Button type="submit" disabled={!text.trim() || disabled || uploading}>
              <Send size={18} />
            </Button>
          </>
        )}
      </div>
      {uploading && <div className="text-xs text-text-muted mt-2">Отправка...</div>}
      <input type="file" ref={fileRef} className="hidden" onChange={handleFile} />
    </form>
  )
}
