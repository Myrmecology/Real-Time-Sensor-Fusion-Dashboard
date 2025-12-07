/**
 * Live Chart Component
 * 
 * High-performance real-time chart for streaming sensor data
 * Uses Recharts with custom styling for mission control aesthetic
 */

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface LiveChartProps {
  data: any[]
  dataKeys: string[]
  colors: string[]
  domain?: [number, number]
  height?: number
}

/**
 * Custom tooltip with cyberpunk styling
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="custom-tooltip">
      <div className="tooltip-content">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="tooltip-entry">
            <span
              className="tooltip-dot"
              style={{ backgroundColor: entry.color }}
            />
            <span className="tooltip-label">{entry.name}:</span>
            <span className="tooltip-value" style={{ color: entry.color }}>
              {entry.value.toFixed(3)}
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .custom-tooltip {
          background: rgba(26, 26, 36, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .tooltip-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tooltip-entry {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
        }

        .tooltip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 6px currentColor;
        }

        .tooltip-label {
          color: #a0a0b0;
          font-weight: 500;
        }

        .tooltip-value {
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          margin-left: auto;
        }
      `}</style>
    </div>
  )
}

/**
 * Main LiveChart component
 */
function LiveChart({ data, dataKeys, colors, domain, height = 200 }: LiveChartProps) {
  // Process data for display (keep only recent points for performance)
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      // Format timestamp for display
      time: new Date(point.timestamp).toLocaleTimeString(),
    }))
  }, [data])

  // Generate legend labels from dataKeys
  const legendLabels = useMemo(() => {
    return dataKeys.map((key) => {
      // Convert camelCase to readable format
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim()
    })
  }, [dataKeys])

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          {/* Grid */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0, 212, 255, 0.1)"
            strokeWidth={1}
          />

          {/* X Axis */}
          <XAxis
            dataKey="time"
            stroke="#a0a0b0"
            tick={{ fill: '#a0a0b0', fontSize: 10 }}
            tickLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
            axisLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
          />

          {/* Y Axis */}
          <YAxis
            stroke="#a0a0b0"
            tick={{ fill: '#a0a0b0', fontSize: 10 }}
            tickLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
            axisLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
            domain={domain || ['auto', 'auto']}
          />

          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />

          {/* Legend */}
          <Legend
            wrapperStyle={{
              fontSize: '0.75rem',
              color: '#a0a0b0',
            }}
            formatter={(value, entry: any, index) => (
              <span style={{ color: colors[index] }}>
                {legendLabels[index]}
              </span>
            )}
          />

          {/* Data Lines */}
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false} // Disable animation for real-time performance
              name={legendLabels[index]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <style jsx>{`
        .chart-container {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .chart-container :global(.recharts-cartesian-axis-tick-value) {
          font-family: 'JetBrains Mono', monospace;
        }

        .chart-container :global(.recharts-legend-item-text) {
          font-weight: 600 !important;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  )
}

export default LiveChart