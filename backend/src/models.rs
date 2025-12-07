//! Core data models for sensor fusion system
//! 
//! Defines all data structures used throughout the telemetry pipeline.
//! All types are designed for efficient serialization and zero-copy operations.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 3D vector representation for acceleration, rotation, and position
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vec3 {
    /// Create a new 3D vector
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    /// Zero vector
    pub fn zero() -> Self {
        Self::new(0.0, 0.0, 0.0)
    }

    /// Calculate magnitude of the vector
    pub fn magnitude(&self) -> f64 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }

    /// Normalize the vector to unit length
    pub fn normalize(&self) -> Self {
        let mag = self.magnitude();
        if mag > 0.0 {
            Self::new(self.x / mag, self.y / mag, self.z / mag)
        } else {
            Self::zero()
        }
    }
}

/// Quaternion representation for 3D orientation
/// 
/// Used for representing rotation without gimbal lock issues.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Quaternion {
    pub w: f64,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Quaternion {
    /// Create a new quaternion
    pub fn new(w: f64, x: f64, y: f64, z: f64) -> Self {
        Self { w, x, y, z }
    }

    /// Identity quaternion (no rotation)
    pub fn identity() -> Self {
        Self::new(1.0, 0.0, 0.0, 0.0)
    }

    /// Convert to Euler angles (roll, pitch, yaw) in radians
    pub fn to_euler(&self) -> (f64, f64, f64) {
        // Roll (x-axis rotation)
        let sinr_cosp = 2.0 * (self.w * self.x + self.y * self.z);
        let cosr_cosp = 1.0 - 2.0 * (self.x * self.x + self.y * self.y);
        let roll = sinr_cosp.atan2(cosr_cosp);

        // Pitch (y-axis rotation)
        let sinp = 2.0 * (self.w * self.y - self.z * self.x);
        let pitch = if sinp.abs() >= 1.0 {
            std::f64::consts::FRAC_PI_2.copysign(sinp)
        } else {
            sinp.asin()
        };

        // Yaw (z-axis rotation)
        let siny_cosp = 2.0 * (self.w * self.z + self.x * self.y);
        let cosy_cosp = 1.0 - 2.0 * (self.y * self.y + self.z * self.z);
        let yaw = siny_cosp.atan2(cosy_cosp);

        (roll, pitch, yaw)
    }
}

/// Raw IMU (Inertial Measurement Unit) sensor data
/// 
/// Contains accelerometer and gyroscope readings with noise characteristics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImuData {
    /// Timestamp of the measurement
    pub timestamp: DateTime<Utc>,
    
    /// Linear acceleration in m/s² (includes gravity)
    pub acceleration: Vec3,
    
    /// Angular velocity in rad/s
    pub gyroscope: Vec3,
    
    /// Estimated noise level (0.0 = no noise, 1.0 = high noise)
    pub noise_level: f64,
    
    /// Sensor health status (0.0 = failed, 1.0 = healthy)
    pub health: f64,
}

impl ImuData {
    /// Create new IMU data with timestamp
    pub fn new(acceleration: Vec3, gyroscope: Vec3) -> Self {
        Self {
            timestamp: Utc::now(),
            acceleration,
            gyroscope,
            noise_level: 0.1,
            health: 1.0,
        }
    }
}

/// GPS sensor data with position and velocity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpsData {
    /// Timestamp of the measurement
    pub timestamp: DateTime<Utc>,
    
    /// Latitude in degrees
    pub latitude: f64,
    
    /// Longitude in degrees
    pub longitude: f64,
    
    /// Altitude in meters above sea level
    pub altitude: f64,
    
    /// Ground speed in m/s
    pub speed: f64,
    
    /// Heading in degrees (0-360, where 0 is North)
    pub heading: f64,
    
    /// Horizontal dilution of precision (lower is better)
    pub hdop: f64,
    
    /// Number of satellites in view
    pub satellites: u8,
    
    /// Sensor health status (0.0 = failed, 1.0 = healthy)
    pub health: f64,
}

impl GpsData {
    /// Create new GPS data with timestamp
    pub fn new(latitude: f64, longitude: f64, altitude: f64) -> Self {
        Self {
            timestamp: Utc::now(),
            latitude,
            longitude,
            altitude,
            speed: 0.0,
            heading: 0.0,
            hdop: 1.0,
            satellites: 8,
            health: 1.0,
        }
    }
}

/// Fused sensor data after processing through fusion algorithm
/// 
/// This is the primary data structure streamed to clients and ML services.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FusedSensorData {
    /// Timestamp of the fused estimate
    pub timestamp: DateTime<Utc>,
    
    /// Estimated orientation as quaternion
    pub orientation: Quaternion,
    
    /// Euler angles in degrees for convenience (roll, pitch, yaw)
    pub euler_degrees: (f64, f64, f64),
    
    /// Estimated position (latitude, longitude, altitude)
    pub position: (f64, f64, f64),
    
    /// Estimated linear velocity in m/s
    pub velocity: Vec3,
    
    /// Raw accelerometer reading
    pub raw_acceleration: Vec3,
    
    /// Raw gyroscope reading
    pub raw_gyroscope: Vec3,
    
    /// GPS ground speed in m/s
    pub gps_speed: f64,
    
    /// GPS heading in degrees
    pub gps_heading: f64,
    
    /// Fusion confidence level (0.0 = low, 1.0 = high)
    pub confidence: f64,
    
    /// Overall system health (0.0 = critical, 1.0 = healthy)
    pub system_health: f64,
    
    /// Anomaly score from ML service (if available)
    pub anomaly_score: Option<f64>,
}

impl FusedSensorData {
    /// Create new fused data with basic initialization
    pub fn new() -> Self {
        let euler = (0.0, 0.0, 0.0);
        Self {
            timestamp: Utc::now(),
            orientation: Quaternion::identity(),
            euler_degrees: euler,
            position: (0.0, 0.0, 0.0),
            velocity: Vec3::zero(),
            raw_acceleration: Vec3::zero(),
            raw_gyroscope: Vec3::zero(),
            gps_speed: 0.0,
            gps_heading: 0.0,
            confidence: 1.0,
            system_health: 1.0,
            anomaly_score: None,
        }
    }

    /// Update anomaly score from ML service
    pub fn set_anomaly_score(&mut self, score: f64) {
        self.anomaly_score = Some(score.clamp(0.0, 1.0));
    }
}

impl Default for FusedSensorData {
    fn default() -> Self {
        Self::new()
    }
}