//! IMU (Inertial Measurement Unit) Simulator
//! 
//! Simulates a 6-DOF IMU sensor with realistic characteristics:
//! - Accelerometer with gravity and noise
//! - Gyroscope with bias drift
//! - Configurable noise profiles
//! - Realistic sensor dynamics

use crate::models::{ImuData, Vec3};
use rand::Rng;
use rand_distr::{Distribution, Normal};
use std::f64::consts::PI;

/// IMU sensor simulator with realistic noise characteristics
pub struct ImuSimulator {
    /// Current orientation state (roll, pitch, yaw in radians)
    orientation: (f64, f64, f64),
    
    /// Current angular velocity (rad/s)
    angular_velocity: Vec3,
    
    /// Current linear acceleration (m/s²)
    linear_acceleration: Vec3,
    
    /// Gyroscope bias drift (simulates sensor imperfection)
    gyro_bias: Vec3,
    
    /// Accelerometer noise standard deviation (m/s²)
    accel_noise_std: f64,
    
    /// Gyroscope noise standard deviation (rad/s)
    gyro_noise_std: f64,
    
    /// Simulation time step counter
    tick_count: u64,
    
    /// Random number generator (using thread-safe StdRng)
    rng: rand::rngs::StdRng,
}

impl ImuSimulator {
    /// Create a new IMU simulator with default parameters
    pub fn new() -> Self {
        use rand::SeedableRng;
        Self {
            orientation: (0.0, 0.0, 0.0),
            angular_velocity: Vec3::zero(),
            linear_acceleration: Vec3::zero(),
            gyro_bias: Vec3::new(0.001, 0.001, 0.001), // Small initial bias
            accel_noise_std: 0.05,  // 0.05 m/s² noise
            gyro_noise_std: 0.005,  // 0.005 rad/s noise
            tick_count: 0,
            rng: rand::rngs::StdRng::from_entropy(),
        }
    }

    /// Read current IMU sensor data with simulated dynamics
    pub fn read(&mut self) -> ImuData {
        self.tick_count += 1;
        
        // Simulate realistic motion dynamics
        self.simulate_motion();
        
        // Get gravity vector in sensor frame
        let gravity = self.calculate_gravity_vector();
        
        // Simulate accelerometer reading (linear accel + gravity + noise)
        let accel_noise = self.generate_accel_noise();
        let measured_accel = Vec3::new(
            self.linear_acceleration.x + gravity.x + accel_noise.x,
            self.linear_acceleration.y + gravity.y + accel_noise.y,
            self.linear_acceleration.z + gravity.z + accel_noise.z,
        );
        
        // Simulate gyroscope reading (angular velocity + bias + noise)
        let gyro_noise = self.generate_gyro_noise();
        let measured_gyro = Vec3::new(
            self.angular_velocity.x + self.gyro_bias.x + gyro_noise.x,
            self.angular_velocity.y + self.gyro_bias.y + gyro_noise.y,
            self.angular_velocity.z + self.gyro_bias.z + gyro_noise.z,
        );
        
        // Update gyroscope bias (simulates slow drift over time)
        self.update_gyro_bias();
        
        // Calculate noise level metric for health monitoring
        let noise_level = (accel_noise.magnitude() / self.accel_noise_std).min(1.0);
        
        // Simulate sensor health (occasionally inject minor degradation)
        let health = if self.tick_count % 500 == 0 {
            0.85 + self.rng.gen::<f64>() * 0.15  // 85-100% health
        } else {
            0.95 + self.rng.gen::<f64>() * 0.05  // 95-100% health
        };
        
        ImuData {
            timestamp: chrono::Utc::now(),
            acceleration: measured_accel,
            gyroscope: measured_gyro,
            noise_level,
            health,
        }
    }

    /// Simulate realistic motion dynamics (sinusoidal movement patterns)
    fn simulate_motion(&mut self) {
        let t = self.tick_count as f64 * 0.02; // Time in seconds (50 Hz)
        
        // Simulate smooth rotation patterns (like a drone or vehicle maneuvering)
        self.angular_velocity = Vec3::new(
            0.1 * (0.3 * t).sin(),  // Roll rate
            0.08 * (0.2 * t).cos(), // Pitch rate
            0.05 * (0.15 * t).sin(), // Yaw rate
        );
        
        // Update orientation based on angular velocity
        let dt = 0.02; // 50 Hz = 0.02s timestep
        self.orientation.0 += self.angular_velocity.x * dt;
        self.orientation.1 += self.angular_velocity.y * dt;
        self.orientation.2 += self.angular_velocity.z * dt;
        
        // Keep angles in reasonable range
        self.orientation.0 = normalize_angle(self.orientation.0);
        self.orientation.1 = normalize_angle(self.orientation.1);
        self.orientation.2 = normalize_angle(self.orientation.2);
        
        // Simulate linear acceleration (e.g., vehicle accelerating/decelerating)
        self.linear_acceleration = Vec3::new(
            0.5 * (0.1 * t).sin(),  // Forward/backward
            0.3 * (0.15 * t).cos(), // Left/right
            0.2 * (0.05 * t).sin(), // Up/down
        );
    }

    /// Calculate gravity vector in sensor frame based on current orientation
    fn calculate_gravity_vector(&self) -> Vec3 {
        let (roll, pitch, _yaw) = self.orientation;
        
        // Gravity is 9.81 m/s² in world frame (pointing down)
        // Transform to sensor frame based on orientation
        let g = 9.81;
        
        Vec3::new(
            -g * pitch.sin(),
            g * roll.sin() * pitch.cos(),
            g * roll.cos() * pitch.cos(),
        )
    }

    /// Generate realistic accelerometer noise using normal distribution
    fn generate_accel_noise(&mut self) -> Vec3 {
        let normal = Normal::new(0.0, self.accel_noise_std).unwrap();
        
        Vec3::new(
            normal.sample(&mut self.rng),
            normal.sample(&mut self.rng),
            normal.sample(&mut self.rng),
        )
    }

    /// Generate realistic gyroscope noise using normal distribution
    fn generate_gyro_noise(&mut self) -> Vec3 {
        let normal = Normal::new(0.0, self.gyro_noise_std).unwrap();
        
        Vec3::new(
            normal.sample(&mut self.rng),
            normal.sample(&mut self.rng),
            normal.sample(&mut self.rng),
        )
    }

    /// Update gyroscope bias to simulate sensor drift over time
    fn update_gyro_bias(&mut self) {
        // Bias drift is very slow (brownian motion)
        let drift_rate = 0.0001;
        let normal = Normal::new(0.0, drift_rate).unwrap();
        
        self.gyro_bias.x += normal.sample(&mut self.rng);
        self.gyro_bias.y += normal.sample(&mut self.rng);
        self.gyro_bias.z += normal.sample(&mut self.rng);
        
        // Clamp bias to realistic ranges
        self.gyro_bias.x = self.gyro_bias.x.clamp(-0.01, 0.01);
        self.gyro_bias.y = self.gyro_bias.y.clamp(-0.01, 0.01);
        self.gyro_bias.z = self.gyro_bias.z.clamp(-0.01, 0.01);
    }

    /// Inject a fault for testing anomaly detection
    pub fn inject_fault(&mut self, fault_type: FaultType) {
        match fault_type {
            FaultType::AccelSpike => {
                self.linear_acceleration = Vec3::new(
                    self.rng.gen_range(-20.0..20.0),
                    self.rng.gen_range(-20.0..20.0),
                    self.rng.gen_range(-20.0..20.0),
                );
            }
            FaultType::GyroSpike => {
                self.angular_velocity = Vec3::new(
                    self.rng.gen_range(-5.0..5.0),
                    self.rng.gen_range(-5.0..5.0),
                    self.rng.gen_range(-5.0..5.0),
                );
            }
            FaultType::HighNoise => {
                self.accel_noise_std = 0.5;  // 10x normal noise
                self.gyro_noise_std = 0.05;
            }
        }
    }

    /// Reset fault conditions to normal
    pub fn reset_faults(&mut self) {
        self.accel_noise_std = 0.05;
        self.gyro_noise_std = 0.005;
    }
}

impl Default for ImuSimulator {
    fn default() -> Self {
        Self::new()
    }
}

/// Types of faults that can be injected for testing
#[derive(Debug, Clone, Copy)]
pub enum FaultType {
    /// Sudden spike in accelerometer readings
    AccelSpike,
    /// Sudden spike in gyroscope readings
    GyroSpike,
    /// Elevated noise levels
    HighNoise,
}

/// Normalize angle to [-π, π] range
fn normalize_angle(angle: f64) -> f64 {
    let mut a = angle;
    while a > PI {
        a -= 2.0 * PI;
    }
    while a < -PI {
        a += 2.0 * PI;
    }
    a
}