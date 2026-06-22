import { useEffect, useRef, useState, useCallback } from 'react'

export default function useChatSocket(token, onMessage, onRead, onTyping, onMessageUpdate) {
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/chat/?token=${token}`
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)
    socket.onerror = (e) => console.error('WS error', e)
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'message' && onMessage) onMessage(data.message)
      if (data.type === 'message_update' && onMessageUpdate) onMessageUpdate(data.message)
      if (data.type === 'read' && onRead) onRead(data)
      if (data.type === 'typing' && onTyping) onTyping(data)
    }

    return () => {
      socket.close()
    }
  }, [token])

  const send = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }, [])

  return { connected, send }
}
