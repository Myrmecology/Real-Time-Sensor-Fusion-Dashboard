import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import useWebSocket from './hooks/useWebSocket'
import type { SensorData } from './types/sensor'

/**
 * Main Application Component
 * 
 * Manages WebSocket connection and distributes sensor data to child components
 */
function App() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  
  // WebSocket configuration
  const WS_URL = 'ws://127.0.0.1:8080'
  
  // Custom WebSocket hook
  const { isConnected, lastMessage, sendMessage } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log('✅ WebSocket connected')
      setConnectionStatus('connected')
    },
    onClose: () => {
      console.log('⚠️ WebSocket disconnected')
      setConnectionStatus('disconnected')
    },
    onError: (error) => {
      console.error('❌ WebSocket error:', error)
      setConnectionStatus('disconnected')
    },
  })
  
  // Process incoming sensor data
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage)
        
        // Check if this is sensor data (not a connection message)
        if (data.timestamp && data.orientation) {
          setSensorData(data as SensorData)
        }
      } catch (error) {
        console.error('Failed to parse sensor data:', error)
      }
    }
  }, [lastMessage])
  
  // Handle fault injection from UI
  const handleInjectFault = (faultType: string) => {
    const command = {
      type: 'command',
      action: 'inject_fault',
      parameters: { fault_type: faultType },
      timestamp: new Date().toISOString(),
    }
    
    sendMessage(JSON.stringify(command))
    console.log(`⚡ Injected fault: ${faultType}`)
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