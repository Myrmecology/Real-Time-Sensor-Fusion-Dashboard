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

      <style jsx>{`
        .alert-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .alert-overlay.visible {
          opacity: 1;
        }

        .alert-container {
          position: relative;
          max-width: 500px;
          width: 90%;
          background: rgba(26, 26, 36, 0.95);
          border-radius: 16px;
          padding: 40px 30px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
          transform: scale(0.9);
          transition: transform 0.3s ease;
          overflow: hidden;
        }

        .alert-overlay.visible .alert-container {
          transform: scale(1);
        }

        .alert-container.critical {
          border: 2px solid #ff3366;
          box-shadow: 0 0 40px rgba(255, 51, 102, 0.5), 0 20px 60px rgba(0, 0, 0, 0.8);
        }

        .alert-container.high {
          border: 2px solid #ffaa00;
          box-shadow: 0 0 40px rgba(255, 170, 0, 0.4), 0 20px 60px rgba(0, 0, 0, 0.8);
        }

        .alert-container.moderate {
          border: 2px solid #ffaa00;
          box-shadow: 0 0 30px rgba(255, 170, 0, 0.3), 0 20px 60px rgba(0, 0, 0, 0.8);
        }

        .close-button {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ffffff;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .alert-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .warning-triangle {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #ff3366 0%, #ff6699 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(255, 51, 102, 0.6);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .warning-exclamation {
          font-size: 3rem;
          font-weight: 900;
          color: #ffffff;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 30px rgba(255, 51, 102, 0.6);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 51, 102, 0.9);
            transform: scale(1.05);
          }
        }

        .alert-content {
          text-align: center;
        }

        .alert-title {
          font-size: 1.75rem;
          font-weight: 900;
          color: #ff3366;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 10px;
          text-shadow: 0 0 20px rgba(255, 51, 102, 0.5);
        }

        .alert-message {
          font-size: 1rem;
          color: #a0a0b0;
          margin-bottom: 30px;
          line-height: 1.6;
        }

        .score-display {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .score-label {
          font-size: 0.75rem;
          color: #a0a0b0;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }

        .score-value {
          font-size: 3rem;
          font-weight: 900;
          color: #ff3366;
          font-family: 'JetBrains Mono', monospace;
          text-shadow: 0 0 20px rgba(255, 51, 102, 0.5);
          margin-bottom: 15px;
        }

        .score-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .score-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff3366 0%, #ff6699 100%);
          border-radius: 4px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(255, 51, 102, 0.8);
        }

        .severity-badge {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 25px;
        }

        .severity-badge.critical {
          background: rgba(255, 51, 102, 0.2);
          color: #ff3366;
          border: 1px solid rgba(255, 51, 102, 0.5);
        }

        .severity-badge.high {
          background: rgba(255, 170, 0, 0.2);
          color: #ffaa00;
          border: 1px solid rgba(255, 170, 0, 0.5);
        }

        .severity-badge.moderate {
          background: rgba(255, 170, 0, 0.15);
          color: #ffaa00;
          border: 1px solid rgba(255, 170, 0, 0.3);
        }

        .recommendations {
          text-align: left;
          background: rgba(0, 212, 255, 0.05);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 8px;
          padding: 20px;
        }

        .recommendations-title {
          font-size: 0.875rem;
          color: #00d4ff;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .recommendations-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .recommendations-list li {
          font-size: 0.875rem;
          color: #a0a0b0;
          padding: 6px 0;
          padding-left: 20px;
          position: relative;
        }

        .recommendations-list li:before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #00d4ff;
        }

        .pulse-effect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 16px;
          pointer-events: none;
          animation: pulse-border 2s ease-in-out infinite;
          z-index: -1;
        }

        @keyframes pulse-border {
          0%, 100% {
            box-shadow: inset 0 0 20px rgba(255, 51, 102, 0.2);
          }
          50% {
            box-shadow: inset 0 0 40px rgba(255, 51, 102, 0.4);
          }
        }
      `}</style>
    </div>
  )
}

export default AnomalyAlert