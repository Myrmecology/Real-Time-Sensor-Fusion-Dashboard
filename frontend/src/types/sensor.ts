/**
 * Sensor Data Type Definitions
 * 
 * Defines all TypeScript interfaces for sensor fusion data structures
 */

/**
 * 3D Vector for acceleration, rotation, and velocity
 */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * Quaternion for 3D orientation representation
 */
export interface Quaternion {
  w: number
  x: number
  y: number
  z: number
}

/**
 * Complete fused sensor data from backend
 */
export interface SensorData {
  /** ISO timestamp of the measurement */
  timestamp: string
  
  /** Orientation as quaternion */
  orientation: Quaternion
  
  /** Euler angles in degrees [roll, pitch, yaw] */
  euler_degrees: [number, number, number]
  
  /** Position as [latitude, longitude, altitude] */
  position: [number, number, number]
  
  /** Velocity vector in m/s */
  velocity: Vec3
  
  /** Raw accelerometer reading in m/s² */
  raw_acceleration: Vec3
  
  /** Raw gyroscope reading in rad/s */
  raw_gyroscope: Vec3
  
  /** GPS ground speed in m/s */
  gps_speed: number
  
  /** GPS heading in degrees */
  gps_heading: number
  
  /** Fusion confidence (0-1) */
  confidence: number
  
  /** System health (0-1) */
  system_health: number
  
  /** ML anomaly score if available (0-1) */
  anomaly_score?: number
}

/**
 * WebSocket message types
 */
export type WebSocketMessage = 
  | ConnectionMessage
  | SensorDataMessage
  | CommandMessage
  | AnomalyPredictionMessage

export interface ConnectionMessage {
  type: 'connection'
  status: string
  message: string
  timestamp: string
}

export interface SensorDataMessage extends SensorData {
  type?: 'sensor_data'
}

export interface CommandMessage {
  type: 'command'
  action: string
  parameters?: Record<string, unknown>
  timestamp: string
}

export interface AnomalyPredictionMessage {
  type: 'anomaly_prediction'
  score: number
  timestamp: string
}

/**
 * Chart data point for time series visualization
 */
export interface ChartDataPoint {
  timestamp: number
  value: number
  label?: string
}

/**
 * Health status levels
 */
export type HealthStatus = 'critical' | 'warning' | 'good' | 'excellent'

/**
 * Get health status from numeric value
 */
export function getHealthStatus(value: number): HealthStatus {
  if (value >= 0.9) return 'excellent'
  if (value >= 0.7) return 'good'
  if (value >= 0.5) return 'warning'
  return 'critical'
}

/**
 * Get color for health status
 */
export function getHealthColor(status: HealthStatus): string {
  switch (status) {
    case 'excellent': return '#00ff88'
    case 'good': return '#00d4ff'
    case 'warning': return '#ffaa00'
    case 'critical': return '#ff3366'
  }
}

/**
 * Convert quaternion to Euler angles (for debugging/display)
 */
export function quaternionToEuler(q: Quaternion): [number, number, number] {
  // Roll (x-axis)
  const sinr_cosp = 2 * (q.w * q.x + q.y * q.z)
  const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y)
  const roll = Math.atan2(sinr_cosp, cosr_cosp)

  // Pitch (y-axis)
  const sinp = 2 * (q.w * q.y - q.z * q.x)
  const pitch = Math.abs(sinp) >= 1
    ? Math.sign(sinp) * Math.PI / 2
    : Math.asin(sinp)

  // Yaw (z-axis)
  const siny_cosp = 2 * (q.w * q.z + q.x * q.y)
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z)
  const yaw = Math.atan2(siny_cosp, cosy_cosp)

  return [roll, pitch, yaw]
}

/**
 * Calculate magnitude of a Vec3
 */
export function vec3Magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * Format number to fixed decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

/**
 * Convert radians to degrees
 */
export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI)
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return deg * (Math.PI / 180)
}