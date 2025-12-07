/**
 * Mission Control Dashboard
 * 
 * Main dashboard layout that coordinates all visualization components
 */

import { useState, useEffect } from 'react'
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
  const MAX_HISTORY_LENGTH = 100 // Keep last 100 data points

  // Update chart history
  useEffect(() => {
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
      setTimeout(() => setShowAnomalyAlert(false), 5000)
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

      <style jsx>{`
        .dashboard-container {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 20px;
          gap: 20px;
          overflow: hidden;
        }

        .dashboard-header {
          background: rgba(26, 26, 36, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 12px;
          padding: 20px 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #00d4ff;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title-icon {
          font-size: 2rem;
        }

        .header-stats {
          display: flex;
          gap: 40px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #a0a0b0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .dashboard-content {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr;
          gap: 20px;
          overflow: hidden;
        }

        .section-3d,
        .section-charts,
        .section-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
        }

        .section-card {
          background: rgba(26, 26, 36, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        .section-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #00d4ff;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .magnitude-badge,
        .alert-badge {
          font-size: 0.75rem;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 600;
        }

        .magnitude-badge {
          background: rgba(0, 212, 255, 0.2);
          color: #00d4ff;
          border: 1px solid rgba(0, 212, 255, 0.3);
        }

        .alert-badge {
          background: rgba(255, 51, 102, 0.2);
          color: #ff3366;
          border: 1px solid rgba(255, 51, 102, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        .euler-display {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .euler-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .euler-label {
          font-size: 0.75rem;
          color: #a0a0b0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .euler-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .controls-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        @media (max-width: 1280px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
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