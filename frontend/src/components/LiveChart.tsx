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
function CustomTooltip({ active, payload }: any) {
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
            formatter={(_value, _entry: any, index) => (
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

      
    </div>
  )
}

export default LiveChart