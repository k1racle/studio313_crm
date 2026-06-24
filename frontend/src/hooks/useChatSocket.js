import { useEffect, useRef, useState, useCallback } from 'react'

export default function useChatSocket(token, onMessage, onRead, onTyping, onMessageUpdate) {
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimer = useRef(null)
  const reconnectAttempts = useRef(0)
  const MAX_RECONNECT_DELAY = 30000

  const callbacksRef = useRef({ onMessage, onRead, onTyping, onMessageUpdate })
  useEffect(() => {
    callbacksRef.current = { onMessage, onRead, onTyping, onMessageUpdate }
  }, [onMessage, onRead, onTyping, onMessageUpdate])

  const connect = useCallback(() => {
    if (!token) return
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN)) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/chat/?token=${token}`
    console.log('[WS] connecting to', url)
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      console.log('[WS] connected')
      reconnectAttempts.current = 0
      setConnected(true)
    }

    socket.onclose = (event) => {
      console.log('[WS] closed', event.code, event.reason)
      setConnected(false)
      ws.current = null
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, MAX_RECONNECT_DELAY)
      reconnectAttempts.current += 1
      console.log(`[WS] reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)
      reconnectTimer.current = setTimeout(connect, delay)
    }

    socket.onerror = (e) => {
      console.error('[WS] error', e)
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const cbs = callbacksRef.current
        if (data.type === 'message' && cbs.onMessage) cbs.onMessage(data.message)
        if (data.type === 'message_update' && cbs.onMessageUpdate) cbs.onMessageUpdate(data.message)
        if (data.type === 'read' && cbs.onRead) cbs.onRead(data)
        if (data.type === 'typing' && cbs.onTyping) cbs.onTyping(data)
      } catch (err) {
        console.error('[WS] failed to parse message', err, event.data)
      }
    }
  }, [token])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (ws.current) {
        ws.current.onclose = null
        ws.current.close()
      }
    }
  }, [connect])

  const send = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    } else {
      console.warn('[WS] not connected, cannot send', data)
    }
  }, [])

  return { connected, send }
}
