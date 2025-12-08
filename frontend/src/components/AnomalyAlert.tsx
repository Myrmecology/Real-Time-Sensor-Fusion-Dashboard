/**
 * Anomaly Alert Component
 * 
 * Full-screen alert overlay when high anomaly scores are detected
 * Provides visual warning with score display and dismissal
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface AnomalyAlertProps {
  score: number
  onClose: () => void
}

function AnomalyAlert({ score, onClose }: AnomalyAlertProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Fade in animation
  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  // Handle dismiss
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for fade out animation
  }

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  // Determine severity level
  const getSeverity = (score: number): 'critical' | 'high' | 'moderate' => {
    if (score >= 0.9) return 'critical'
    if (score >= 0.8) return 'high'
    return 'moderate'
  }

  const severity = getSeverity(score)

  return (
    <div className={`alert-overlay ${isVisible ? 'visible' : ''}`}>
      <div className={`alert-container ${severity}`}>
        {/* Close button */}
        <button className="close-button" onClick={handleClose}>
          <X size={24} />
        </button>

        {/* Alert icon */}
        <div className="alert-icon">
          <div className="warning-triangle">
            <span className="warning-exclamation">!</span>
          </div>
        </div>

        {/* Alert content */}
        <div className="alert-content">
          <h2 className="alert-title">ANOMALY DETECTED</h2>
          <p className="alert-message">
            Unusual sensor behavior detected in telemetry stream
          </p>

          {/* Score display */}
          <div className="score-display">
            <div className="score-label">Anomaly Score</div>
            <div className="score-value">{(score * 100).toFixed(1)}%</div>
            <div className="score-bar">
              <div
                className="score-bar-fill"
                style={{ width: `${score * 100}%` }}
              />
            </div>
          </div>

          {/* Severity badge */}
          <div className={`severity-badge ${severity}`}>
            {severity === 'critical' && '🔴 CRITICAL'}
            {severity === 'high' && '🟠 HIGH ANOMALY'}
            {severity === 'moderate' && '🟡 MODERATE ANOMALY'}
          </div>

          {/* Recommendations */}
          <div className="recommendations">
            <h3 className="recommendations-title">Recommended Actions:</h3>
            <ul className="recommendations-list">
              <li>Review sensor calibration</li>
              <li>Check for environmental interference</li>
              <li>Monitor for recurring patterns</li>
            </ul>
          </div>
        </div>

        {/* Pulsing background effect */}
        <div className="pulse-effect" />
      </div>

      
    </div>
  )
}

export default AnomalyAlert