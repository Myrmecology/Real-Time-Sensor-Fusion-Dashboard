import { useEffect, useState, useRef } from 'react'
import Dashboard from './components/Dashboard'
import type { SensorData } from './types/sensor'

/**
 * Main Application Component
 * 
 * Manages WebSocket connection and distributes sensor data to Dashboard
 */
function App() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  
  // WebSocket configuration
  const WS_URL = 'ws://127.0.0.1:8080'
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_INTERVAL = 3000

  // WebSocket connection management
  useEffect(() => {
    let mounted = true

    const connect = () => {
      if (!mounted) return

      console.log('🔌 Connecting to WebSocket...')
      
      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
          if (!mounted) return
          console.log('✅ WebSocket connected')
          setConnectionStatus('connected')
          reconnectAttemptsRef.current = 0
        }

        ws.onmessage = (event) => {
          if (!mounted) return
          
          try {
            const data = JSON.parse(event.data)
            
            // Check if this is sensor data (not a connection message)
            if (data.timestamp && data.orientation) {
              setSensorData(data as SensorData)
            }
          } catch (error) {
            console.error('Failed to parse sensor data:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
        }

        ws.onclose = () => {
          if (!mounted) return
          
          console.log('🚪 WebSocket closed')
          setConnectionStatus('disconnected')
          wsRef.current = null

          // Attempt reconnection
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++
            console.log(`🔄 Reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mounted) {
                connect()
              }
            }, RECONNECT_INTERVAL)
          } else {
            console.error('❌ Max reconnection attempts reached')
          }
        }
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error)
      }
    }

    // Initial connection
    connect()

    // Cleanup function
    return () => {
      mounted = false
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, []) // Empty dependency array - only run once!

  // Handle fault injection from Dashboard
  const handleInjectFault = (faultType: string) => {
    console.log('🔴 Injecting fault:', faultType)
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🟢 WebSocket is OPEN, sending command')
      const command = {
        type: 'command',
        action: 'inject_fault',
        parameters: { fault_type: faultType },
        timestamp: new Date().toISOString(),
      }
      
      wsRef.current.send(JSON.stringify(command))
      console.log(`⚡ Sent command:`, command)
    } else {
      console.error('❌ WebSocket NOT OPEN, readyState:', wsRef.current?.readyState)
    }
  }

  return (
    <div className="app-container">
      {/* Connection Status Indicator */}
      <div className="connection-indicator">
        <div className={`status-dot ${connectionStatus}`} />
        <span className="status-text">
          {connectionStatus === 'connected' && '🟢 CONNECTED'}
          {connectionStatus === 'connecting' && '🟡 CONNECTING...'}
          {connectionStatus === 'disconnected' && '🔴 DISCONNECTED'}
        </span>
      </div>

      {/* Main Dashboard */}
      {connectionStatus === 'connected' && sensorData ? (
        <Dashboard 
          sensorData={sensorData} 
          onInjectFault={handleInjectFault}
        />
      ) : (
        <div className="loading-container">
          <div className="loading-spinner" />
          <h2 className="loading-text">
            {connectionStatus === 'connecting' && 'Establishing Connection...'}
            {connectionStatus === 'disconnected' && 'Connection Lost - Attempting Reconnect...'}
          </h2>
          <p className="loading-subtext">
            Ensure Rust backend is running on port 8080
          </p>
        </div>
      )}
    </div>
  )
}

export default App