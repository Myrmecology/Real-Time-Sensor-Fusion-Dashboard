/**
 * Mission Control Dashboard
 * 
 * Main dashboard layout that coordinates all visualization components
 */

import { useState, useEffect, useRef } from 'react'
import Scene3D from './Scene3D'
import LiveChart from './LiveChart'
import SensorPanel from './SensorPanel'
import AnomalyAlert from './AnomalyAlert'
import type { SensorData } from '../types/sensor'
import { vec3Magnitude } from '../types/sensor'

interface DashboardProps {
  sensorData: SensorData
  onInjectFault: (faultType: string) => void
}

interface ChartData {
  timestamp: number
  gyroX: number
  gyroY: number
  gyroZ: number
  accelX: number
  accelY: number
  accelZ: number
  anomalyScore: number
}

function Dashboard({ sensorData, onInjectFault }: DashboardProps) {
  const [chartHistory, setChartHistory] = useState<ChartData[]>([])
  const [showAnomalyAlert, setShowAnomalyAlert] = useState(false)
  const lastUpdateRef = useRef<number>(0)
  const MAX_HISTORY_LENGTH = 100 // Keep last 100 data points

  // Update chart history with throttling to prevent infinite loops
  useEffect(() => {
    const now = Date.now()
    // Only update every 100ms to prevent infinite loops
    if (now - lastUpdateRef.current < 100) {
      return
    }
    lastUpdateRef.current = now

    const dataPoint: ChartData = {
      timestamp: Date.now(),
      gyroX: sensorData.raw_gyroscope.x,
      gyroY: sensorData.raw_gyroscope.y,
      gyroZ: sensorData.raw_gyroscope.z,
      accelX: sensorData.raw_acceleration.x,
      accelY: sensorData.raw_acceleration.y,
      accelZ: sensorData.raw_acceleration.z,
      anomalyScore: sensorData.anomaly_score || 0,
    }

    setChartHistory((prev) => {
      const updated = [...prev, dataPoint]
      // Keep only last N points
      if (updated.length > MAX_HISTORY_LENGTH) {
        return updated.slice(updated.length - MAX_HISTORY_LENGTH)
      }
      return updated
    })

    // Check for anomalies
    if (sensorData.anomaly_score && sensorData.anomaly_score > 0.7) {
      setShowAnomalyAlert(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowAnomalyAlert(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [sensorData])

  // Calculate derived metrics
  const gyroMagnitude = vec3Magnitude(sensorData.raw_gyroscope)
  const accelMagnitude = vec3Magnitude(sensorData.raw_acceleration)

  return (
    <div className="dashboard-container">
      {/* Anomaly Alert Overlay */}
      {showAnomalyAlert && (
        <AnomalyAlert
          score={sensorData.anomaly_score || 0}
          onClose={() => setShowAnomalyAlert(false)}
        />
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">
            <span className="title-icon">🛰️</span>
            SENSOR FUSION CONTROL
          </h1>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Confidence</span>
              <span className="stat-value" style={{ color: getConfidenceColor(sensorData.confidence) }}>
                {(sensorData.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">System Health</span>
              <span className="stat-value" style={{ color: getHealthColor(sensorData.system_health) }}>
                {(sensorData.system_health * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="dashboard-content">
        {/* Left Column - 3D Visualization */}
        <section className="section-3d">
          <div className="section-card">
            <h2 className="section-title">ORIENTATION VISUALIZATION</h2>
            <Scene3D sensorData={sensorData} />
            
            {/* Euler Angles Display */}
            <div className="euler-display">
              <div className="euler-item">
                <span className="euler-label">Roll</span>
                <span className="euler-value text-cyan">
                  {sensorData.euler_degrees[0].toFixed(1)}°
                </span>
              </div>
              <div className="euler-item">
                <span className="euler-label">Pitch</span>
                <span className="euler-value text-green">
                  {sensorData.euler_degrees[1].toFixed(1)}°
                </span>
              </div>
              <div className="euler-item">
                <span className="euler-label">Yaw</span>
                <span className="euler-value text-orange">
                  {sensorData.euler_degrees[2].toFixed(1)}°
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Middle Column - Charts */}
        <section className="section-charts">
          {/* Gyroscope Chart */}
          <div className="section-card">
            <h2 className="section-title">
              GYROSCOPE (rad/s) 
              <span className="magnitude-badge">{gyroMagnitude.toFixed(3)}</span>
            </h2>
            <LiveChart
              data={chartHistory}
              dataKeys={['gyroX', 'gyroY', 'gyroZ']}
              colors={['#00d4ff', '#00ff88', '#ffaa00']}
              domain={[-2, 2]}
            />
          </div>

          {/* Accelerometer Chart */}
          <div className="section-card">
            <h2 className="section-title">
              ACCELEROMETER (m/s²)
              <span className="magnitude-badge">{accelMagnitude.toFixed(3)}</span>
            </h2>
            <LiveChart
              data={chartHistory}
              dataKeys={['accelX', 'accelY', 'accelZ']}
              colors={['#ff00ff', '#3b82f6', '#a855f7']}
              domain={[-15, 15]}
            />
          </div>

          {/* Anomaly Score Chart */}
          <div className="section-card">
            <h2 className="section-title">
              ANOMALY DETECTION
              {sensorData.anomaly_score && sensorData.anomaly_score > 0.7 && (
                <span className="alert-badge">⚠️ HIGH</span>
              )}
            </h2>
            <LiveChart
              data={chartHistory}
              dataKeys={['anomalyScore']}
              colors={['#ff3366']}
              domain={[0, 1]}
            />
          </div>
        </section>

        {/* Right Column - Sensor Panel & Controls */}
        <section className="section-panel">
          <SensorPanel sensorData={sensorData} />

          {/* Fault Injection Controls */}
          <div className="section-card controls-card">
            <h2 className="section-title">⚡ FAULT INJECTION</h2>
            <div className="controls-grid">
              <button
                className="btn btn-danger"
                onClick={() => onInjectFault('accel_spike')}
              >
                Accel Spike
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onInjectFault('gyro_spike')}
              >
                Gyro Spike
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onInjectFault('high_noise')}
              >
                High Noise
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onInjectFault('reset')}
              >
                Reset All
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

// Helper functions
function getConfidenceColor(value: number): string {
  if (value >= 0.9) return '#00ff88'
  if (value >= 0.7) return '#00d4ff'
  if (value >= 0.5) return '#ffaa00'
  return '#ff3366'
}

function getHealthColor(value: number): string {
  if (value >= 0.9) return '#00ff88'
  if (value >= 0.7) return '#00d4ff'
  if (value >= 0.5) return '#ffaa00'
  return '#ff3366'
}

export default Dashboard