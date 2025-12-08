/**
 * Custom WebSocket Hook
 * 
 * Provides a robust WebSocket connection with automatic reconnection,
 * message queuing, and lifecycle management.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseWebSocketOptions {
  onOpen?: () => void
  onClose?: () => void
  onMessage?: (message: string) => void
  onError?: (error: Event) => void
  reconnectInterval?: number
  reconnectAttempts?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  lastMessage: string | null
  sendMessage: (message: string) => void
  reconnect: () => void
  disconnect: () => void
}

/**
 * Custom hook for managing WebSocket connections
 * 
 * @param url - WebSocket server URL
 * @param options - Configuration options
 * @returns WebSocket state and control functions
 */
function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    reconnectInterval = 3000,
    reconnectAttempts = 10,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReconnectRef = useRef(true)
  const messageQueueRef = useRef<string[]>([])

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    try {
      console.log(`🔌 Connecting to ${url}...`)

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
        reconnectCountRef.current = 0

        // Send any queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift()
          if (queuedMessage) {
            ws.send(queuedMessage)
          }
        }

        onOpen?.()
      }

      ws.onmessage = (event) => {
        const message = event.data
        setLastMessage(message)
        onMessage?.(message)
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        onError?.(error)
      }

      ws.onclose = (event) => {
        console.log('🚪 WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null

        onClose?.()

        // Attempt reconnection if enabled
        if (
          shouldReconnectRef.current &&
          reconnectCountRef.current < reconnectAttempts
        ) {
          reconnectCountRef.current++
          console.log(
            `🔄 Reconnecting (${reconnectCountRef.current}/${reconnectAttempts}) in ${reconnectInterval}ms...`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          console.error('❌ Max reconnection attempts reached')
        }
      }
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error)
    }
  }, [url, onOpen, onClose, onMessage, onError, reconnectInterval, reconnectAttempts])

  /**
   * Send message to WebSocket server
   */
  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(message)
      } catch (error) {
        console.error('❌ Failed to send message:', error)
      }
    } else {
      // Queue message for later if not connected
      console.warn('⚠️ WebSocket not connected, queueing message')
      messageQueueRef.current.push(message)
    }
  }, [])

  /**
   * Manually trigger reconnection
   */
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnection triggered')
    reconnectCountRef.current = 0
    disconnect()
    setTimeout(() => connect(), 100)
  }, [connect])

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    console.log('🚪 Disconnecting WebSocket...')
    shouldReconnectRef.current = false

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    shouldReconnectRef.current = true
    connect()

    // Cleanup on unmount
    return () => {
      shouldReconnectRef.current = false

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  /**
   * Handle page visibility changes (pause/resume connection)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📴 Page hidden, pausing WebSocket')
        // Optionally disconnect when page is hidden
      } else {
        console.log('📱 Page visible, resuming WebSocket')
        // Reconnect if disconnected
        if (!isConnected && shouldReconnectRef.current) {
          reconnect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected, reconnect])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect,
    disconnect,
  }
}

export default useWebSocket