/**
 * Sensor Panel Component
 * 
 * Displays comprehensive sensor telemetry, health metrics, and system status
 */

import type { SensorData } from '../types/sensor'
import { getHealthStatus, getHealthColor, formatNumber, vec3Magnitude } from '../types/sensor'

interface SensorPanelProps {
  sensorData: SensorData
}

function SensorPanel({ sensorData }: SensorPanelProps) {
  // Calculate derived metrics
  const accelMagnitude = vec3Magnitude(sensorData.raw_acceleration)
  const gyroMagnitude = vec3Magnitude(sensorData.raw_gyroscope)
  const velocityMagnitude = vec3Magnitude(sensorData.velocity)
  
  const healthStatus = getHealthStatus(sensorData.system_health)
  const healthColor = getHealthColor(healthStatus)
  
  const confidenceStatus = getHealthStatus(sensorData.confidence)
  const confidenceColor = getHealthColor(confidenceStatus)

  return (
    <div className="sensor-panel">
      {/* System Health Overview */}
      <div className="section-card health-card">
        <h2 className="section-title">🏥 SYSTEM HEALTH</h2>
        
        <div className="health-bars">
          <div className="health-bar-item">
            <div className="health-bar-header">
              <span className="health-label">Overall Health</span>
              <span className="health-value" style={{ color: healthColor }}>
                {(sensorData.system_health * 100).toFixed(0)}%
              </span>
            </div>
            <div className="health-bar-track">
              <div
                className="health-bar-fill"
                style={{
                  width: `${sensorData.system_health * 100}%`,
                  backgroundColor: healthColor,
                }}
              />
            </div>
          </div>

          <div className="health-bar-item">
            <div className="health-bar-header">
              <span className="health-label">Confidence</span>
              <span className="health-value" style={{ color: confidenceColor }}>
                {(sensorData.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="health-bar-track">
              <div
                className="health-bar-fill"
                style={{
                  width: `${sensorData.confidence * 100}%`,
                  backgroundColor: confidenceColor,
                }}
              />
            </div>
          </div>

          {sensorData.anomaly_score !== undefined && (
            <div className="health-bar-item">
              <div className="health-bar-header">
                <span className="health-label">Anomaly Score</span>
                <span
                  className="health-value"
                  style={{
                    color: sensorData.anomaly_score > 0.7 ? '#ff3366' : '#00ff88',
                  }}
                >
                  {(sensorData.anomaly_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="health-bar-track">
                <div
                  className="health-bar-fill"
                  style={{
                    width: `${sensorData.anomaly_score * 100}%`,
                    backgroundColor:
                      sensorData.anomaly_score > 0.7 ? '#ff3366' : '#00ff88',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* IMU Data */}
      <div className="section-card">
        <h2 className="section-title">📡 IMU TELEMETRY</h2>
        
        <div className="telemetry-grid">
          {/* Accelerometer */}
          <div className="telemetry-section">
            <div className="telemetry-header">
              <span className="telemetry-title">Accelerometer</span>
              <span className="telemetry-unit">(m/s²)</span>
            </div>
            <div className="telemetry-values">
              <div className="telemetry-row">
                <span className="telemetry-label">X:</span>
                <span className="telemetry-value text-cyan">
                  {formatNumber(sensorData.raw_acceleration.x, 3)}
                </span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Y:</span>
                <span className="telemetry-value text-green">
                  {formatNumber(sensorData.raw_acceleration.y, 3)}
                </span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Z:</span>
                <span className="telemetry-value text-orange">
                  {formatNumber(sensorData.raw_acceleration.z, 3)}
                </span>
              </div>
              <div className="telemetry-row magnitude">
                <span className="telemetry-label">|A|:</span>
                <span className="telemetry-value">
                  {formatNumber(accelMagnitude, 3)}
                </span>
              </div>
            </div>
          </div>

          {/* Gyroscope */}
          <div className="telemetry-section">
            <div className="telemetry-header">
              <span className="telemetry-title">Gyroscope</span>
              <span className="telemetry-unit">(rad/s)</span>
            </div>
            <div className="telemetry-values">
              <div className="telemetry-row">
                <span className="telemetry-label">X:</span>
                <span className="telemetry-value text-cyan">
                  {formatNumber(sensorData.raw_gyroscope.x, 3)}
                </span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Y:</span>
                <span className="telemetry-value text-green">
                  {formatNumber(sensorData.raw_gyroscope.y, 3)}
                </span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Z:</span>
                <span className="telemetry-value text-orange">
                  {formatNumber(sensorData.raw_gyroscope.z, 3)}
                </span>
              </div>
              <div className="telemetry-row magnitude">
                <span className="telemetry-label">|ω|:</span>
                <span className="telemetry-value">
                  {formatNumber(gyroMagnitude, 3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GPS Data */}
      <div className="section-card">
        <h2 className="section-title">🛰️ GPS TELEMETRY</h2>
        
        <div className="telemetry-values">
          <div className="telemetry-row">
            <span className="telemetry-label">Latitude:</span>
            <span className="telemetry-value font-mono">
              {formatNumber(sensorData.position[0], 6)}°
            </span>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-label">Longitude:</span>
            <span className="telemetry-value font-mono">
              {formatNumber(sensorData.position[1], 6)}°
            </span>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-label">Altitude:</span>
            <span className="telemetry-value font-mono">
              {formatNumber(sensorData.position[2], 2)} m
            </span>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-label">Speed:</span>
            <span className="telemetry-value font-mono">
              {formatNumber(sensorData.gps_speed, 2)} m/s
            </span>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-label">Heading:</span>
            <span className="telemetry-value font-mono">
              {formatNumber(sensorData.gps_heading, 1)}°
            </span>
          </div>
        </div>
      </div>

      {/* Velocity */}
      <div className="section-card">
        <h2 className="section-title">🚀 VELOCITY</h2>
        
        <div className="telemetry-values">
          <div className="telemetry-row">
            <span className="telemetry-label">North:</span>
            <span className="telemetry-value text-cyan">
              {formatNumber(sensorData.velocity.x, 3)} m/s
            </span>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-label">East:</span>
            <span className="telemetry-value text-green">
              {formatNumber(sensorData.velocity.y, 3)} m/s
            </span>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-label">Down:</span>
            <span className="telemetry-value text-orange">
              {formatNumber(sensorData.velocity.z, 3)} m/s
            </span>
          </div>
          <div className="telemetry-row magnitude">
            <span className="telemetry-label">Magnitude:</span>
            <span className="telemetry-value">
              {formatNumber(velocityMagnitude, 3)} m/s
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sensor-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .health-card {
          border-color: ${healthColor}40;
        }

        .health-bars {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .health-bar-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .health-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .health-label {
          font-size: 0.75rem;
          color: #a0a0b0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .health-value {
          font-size: 0.875rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .health-bar-track {
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          overflow: hidden;
        }

        .health-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease, background-color 0.3s ease;
          box-shadow: 0 0 10px currentColor;
        }

        .telemetry-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .telemetry-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .telemetry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }

        .telemetry-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: #00d4ff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .telemetry-unit {
          font-size: 0.65rem;
          color: #606070;
          font-style: italic;
        }

        .telemetry-values {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .telemetry-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }

        .telemetry-row.magnitude {
          margin-top: 4px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .telemetry-label {
          font-size: 0.75rem;
          color: #a0a0b0;
          font-weight: 500;
        }

        .telemetry-value {
          font-size: 0.875rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: #ffffff;
        }

        @media (max-width: 1280px) {
          .telemetry-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default SensorPanel