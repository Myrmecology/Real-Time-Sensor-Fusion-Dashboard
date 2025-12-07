//! Complementary Filter for Sensor Fusion
//! 
//! A complementary filter combines high-frequency (IMU) and low-frequency (GPS)
//! sensor data to produce accurate orientation and position estimates.
//! 
//! The filter leverages:
//! - Gyroscope for short-term orientation accuracy
//! - Accelerometer for long-term orientation correction (gravity reference)
//! - GPS for absolute position reference
//! 
//! Alpha parameter (typically 0.95-0.98) controls trust ratio:
//! - Higher alpha = more trust in gyroscope (responsive but drifts)
//! - Lower alpha = more trust in accelerometer (stable but noisy)

use crate::models::{ImuData, GpsData, FusedSensorData, Vec3, Quaternion};
use std::f64::consts::PI;

/// Complementary filter for IMU and GPS sensor fusion
pub struct ComplementaryFilter {
    /// Filter coefficient (0.0 to 1.0)
    /// Higher values trust gyroscope more, lower values trust accelerometer more
    alpha: f64,
    
    /// Current orientation estimate (quaternion)
    orientation: Quaternion,
    
    /// Current position estimate (lat, lon, alt)
    position: (f64, f64, f64),
    
    /// Current velocity estimate (m/s)
    velocity: Vec3,
    
    /// Time of last update
    last_update: Option<std::time::Instant>,
    
    /// Accumulated gyroscope drift compensation
    gyro_drift_compensation: Vec3,
    
    /// Filter initialization flag
    initialized: bool,
}

impl ComplementaryFilter {
    /// Create a new complementary filter with specified alpha
    /// 
    /// # Arguments
    /// * `alpha` - Filter coefficient (0.95-0.98 recommended for 50Hz IMU)
    pub fn new(alpha: f64) -> Self {
        Self {
            alpha: alpha.clamp(0.0, 1.0),
            orientation: Quaternion::identity(),
            position: (0.0, 0.0, 0.0),
            velocity: Vec3::zero(),
            last_update: None,
            gyro_drift_compensation: Vec3::zero(),
            initialized: false,
        }
    }

    /// Update filter with new sensor measurements
    /// 
    /// This is the main fusion algorithm that combines IMU and GPS data
    pub fn update(&mut self, imu: ImuData, gps: GpsData) -> FusedSensorData {
        let now = std::time::Instant::now();
        
        // Calculate time step
        let dt = if let Some(last) = self.last_update {
            now.duration_since(last).as_secs_f64()
        } else {
            0.02 // Default 50Hz = 0.02 seconds
        };
        self.last_update = Some(now);
        
        // Initialize position on first update
        if !self.initialized {
            self.position = (gps.latitude, gps.longitude, gps.altitude);
            self.initialized = true;
        }
        
        // Step 1: Integrate gyroscope for orientation (high frequency, short-term accurate)
        let gyro_orientation = self.integrate_gyroscope(&imu.gyroscope, dt);
        
        // Step 2: Calculate orientation from accelerometer (low frequency, long-term accurate)
        let accel_orientation = self.orientation_from_accelerometer(&imu.acceleration);
        
        // Step 3: Complementary filter fusion
        self.orientation = self.fuse_orientations(gyro_orientation, accel_orientation);
        
        // Step 4: Update position with GPS
        self.update_position(&gps, dt);
        
        // Step 5: Estimate velocity
        self.update_velocity(&imu, &gps, dt);
        
        // Step 6: Calculate confidence metrics
        let confidence = self.calculate_confidence(&imu, &gps);
        let system_health = self.calculate_system_health(&imu, &gps);
        
        // Convert quaternion to Euler angles for convenience
        let (roll, pitch, yaw) = self.orientation.to_euler();
        let euler_degrees = (
            roll.to_degrees(),
            pitch.to_degrees(),
            yaw.to_degrees(),
        );
        
        // Build fused sensor data output
        FusedSensorData {
            timestamp: chrono::Utc::now(),
            orientation: self.orientation,
            euler_degrees,
            position: self.position,
            velocity: self.velocity,
            raw_acceleration: imu.acceleration,
            raw_gyroscope: imu.gyroscope,
            gps_speed: gps.speed,
            gps_heading: gps.heading,
            confidence,
            system_health,
            anomaly_score: None, // Set by ML service
        }
    }

    /// Integrate gyroscope readings to update orientation
    fn integrate_gyroscope(&self, gyro: &Vec3, dt: f64) -> Quaternion {
        // Compensate for known drift
        let corrected_gyro = Vec3::new(
            gyro.x - self.gyro_drift_compensation.x,
            gyro.y - self.gyro_drift_compensation.y,
            gyro.z - self.gyro_drift_compensation.z,
        );
        
        // Quaternion derivative from angular velocity
        let half_dt = dt / 2.0;
        let dq = Quaternion::new(
            0.0,
            corrected_gyro.x * half_dt,
            corrected_gyro.y * half_dt,
            corrected_gyro.z * half_dt,
        );
        
        // Quaternion multiplication for integration
        let q = self.orientation;
        let new_q = Quaternion::new(
            q.w - dq.x * q.x - dq.y * q.y - dq.z * q.z,
            q.x + dq.x * q.w + dq.z * q.y - dq.y * q.z,
            q.y + dq.y * q.w - dq.z * q.x + dq.x * q.z,
            q.z + dq.z * q.w + dq.y * q.x - dq.x * q.y,
        );
        
        // Normalize to prevent accumulation of numerical errors
        self.normalize_quaternion(new_q)
    }

    /// Calculate orientation from accelerometer (assumes gravity is dominant force)
    fn orientation_from_accelerometer(&self, accel: &Vec3) -> Quaternion {
        // Normalize acceleration vector
        let norm_accel = accel.normalize();
        
        // Calculate roll and pitch from gravity vector
        // Note: This assumes acceleration is primarily gravity
        let roll = norm_accel.y.atan2(norm_accel.z);
        let pitch = (-norm_accel.x).atan2((norm_accel.y * norm_accel.y + norm_accel.z * norm_accel.z).sqrt());
        
        // Preserve yaw from current orientation (accelerometer can't measure yaw)
        let (_, _, current_yaw) = self.orientation.to_euler();
        
        // Convert Euler angles to quaternion
        self.euler_to_quaternion(roll, pitch, current_yaw)
    }

    /// Fuse gyroscope and accelerometer orientations using complementary filter
    fn fuse_orientations(&self, gyro_q: Quaternion, accel_q: Quaternion) -> Quaternion {
        // Complementary filter: orientation = alpha * gyro + (1 - alpha) * accel
        // For quaternions, we use spherical linear interpolation (SLERP)
        self.slerp(accel_q, gyro_q, self.alpha)
    }

    /// Spherical Linear Interpolation between two quaternions
    fn slerp(&self, q1: Quaternion, q2: Quaternion, t: f64) -> Quaternion {
        // Calculate dot product
        let mut dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
        
        // Ensure we take the shorter path
        let q2_adjusted = if dot < 0.0 {
            dot = -dot;
            Quaternion::new(-q2.w, -q2.x, -q2.y, -q2.z)
        } else {
            q2
        };
        
        // If quaternions are very close, use linear interpolation
        if dot > 0.9995 {
            let result = Quaternion::new(
                q1.w + t * (q2_adjusted.w - q1.w),
                q1.x + t * (q2_adjusted.x - q1.x),
                q1.y + t * (q2_adjusted.y - q1.y),
                q1.z + t * (q2_adjusted.z - q1.z),
            );
            return self.normalize_quaternion(result);
        }
        
        // Calculate interpolation coefficients
        let theta = dot.acos();
        let sin_theta = theta.sin();
        let w1 = ((1.0 - t) * theta).sin() / sin_theta;
        let w2 = (t * theta).sin() / sin_theta;
        
        Quaternion::new(
            w1 * q1.w + w2 * q2_adjusted.w,
            w1 * q1.x + w2 * q2_adjusted.x,
            w1 * q1.y + w2 * q2_adjusted.y,
            w1 * q1.z + w2 * q2_adjusted.z,
        )
    }

    /// Update position estimate using GPS
    fn update_position(&mut self, gps: &GpsData, _dt: f64) {
        // Simple low-pass filter for position (could be more sophisticated)
        let gps_weight = if gps.hdop < 3.0 { 0.3 } else { 0.1 };
        
        self.position.0 = self.position.0 * (1.0 - gps_weight) + gps.latitude * gps_weight;
        self.position.1 = self.position.1 * (1.0 - gps_weight) + gps.longitude * gps_weight;
        self.position.2 = self.position.2 * (1.0 - gps_weight) + gps.altitude * gps_weight;
    }

    /// Update velocity estimate
    fn update_velocity(&mut self, imu: &ImuData, gps: &GpsData, dt: f64) {
        // Use GPS speed and heading as primary velocity source
        let gps_heading_rad = gps.heading.to_radians();
        
        let gps_velocity = Vec3::new(
            gps.speed * gps_heading_rad.cos(), // North component
            gps.speed * gps_heading_rad.sin(), // East component
            0.0, // Simplified - could integrate vertical from IMU
        );
        
        // Blend GPS velocity with IMU acceleration integration
        let accel_contribution = Vec3::new(
            imu.acceleration.x * dt,
            imu.acceleration.y * dt,
            imu.acceleration.z * dt,
        );
        
        // Weighted fusion (favor GPS for velocity)
        self.velocity = Vec3::new(
            gps_velocity.x * 0.9 + accel_contribution.x * 0.1,
            gps_velocity.y * 0.9 + accel_contribution.y * 0.1,
            gps_velocity.z * 0.5 + accel_contribution.z * 0.5,
        );
    }

    /// Calculate fusion confidence based on sensor quality
    fn calculate_confidence(&self, imu: &ImuData, gps: &GpsData) -> f64 {
        // Confidence degrades with high noise and poor GPS
        let imu_confidence = 1.0 - imu.noise_level.min(1.0);
        let gps_confidence = if gps.hdop < 2.0 {
            1.0
        } else if gps.hdop < 5.0 {
            0.7
        } else {
            0.3
        };
        
        // Combined confidence (weighted average)
        0.6 * imu_confidence + 0.4 * gps_confidence
    }

    /// Calculate overall system health
    fn calculate_system_health(&self, imu: &ImuData, gps: &GpsData) -> f64 {
        // Average of individual sensor health metrics
        (imu.health + gps.health) / 2.0
    }

    /// Convert Euler angles to quaternion
    fn euler_to_quaternion(&self, roll: f64, pitch: f64, yaw: f64) -> Quaternion {
        let cr = (roll / 2.0).cos();
        let sr = (roll / 2.0).sin();
        let cp = (pitch / 2.0).cos();
        let sp = (pitch / 2.0).sin();
        let cy = (yaw / 2.0).cos();
        let sy = (yaw / 2.0).sin();
        
        Quaternion::new(
            cr * cp * cy + sr * sp * sy,
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy,
        )
    }

    /// Normalize quaternion to unit length
    fn normalize_quaternion(&self, q: Quaternion) -> Quaternion {
        let norm = (q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z).sqrt();
        if norm > 1e-6 {
            Quaternion::new(q.w / norm, q.x / norm, q.y / norm, q.z / norm)
        } else {
            Quaternion::identity()
        }
    }

    /// Get current filter alpha value
    pub fn alpha(&self) -> f64 {
        self.alpha
    }

    /// Update filter alpha value
    pub fn set_alpha(&mut self, alpha: f64) {
        self.alpha = alpha.clamp(0.0, 1.0);
    }
}