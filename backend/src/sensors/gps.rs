//! GPS Sensor Simulator
//! 
//! Simulates a GPS receiver with realistic characteristics:
//! - Position updates at 1 Hz
//! - Horizontal Dilution of Precision (HDOP)
//! - Satellite visibility variations
//! - Realistic accuracy degradation
//! - Speed and heading calculations

use crate::models::{GpsData, Vec3};
use rand::Rng;
use rand_distr::{Distribution, Normal};
use std::f64::consts::PI;

/// GPS sensor simulator with realistic accuracy characteristics
pub struct GpsSimulator {
    /// Current position (latitude, longitude, altitude)
    position: (f64, f64, f64),
    
    /// Current velocity in m/s (north, east, down)
    velocity: Vec3,
    
    /// Current heading in radians (0 = North)
    heading: f64,
    
    /// Ground speed in m/s
    speed: f64,
    
    /// Horizontal Dilution of Precision (1.0 = excellent, >5.0 = poor)
    hdop: f64,
    
    /// Number of visible satellites
    satellites: u8,
    
    /// Position noise standard deviation in meters
    position_noise_std: f64,
    
    /// Last known good position (for fallback)
    last_good_position: (f64, f64, f64),
    
    /// Simulation update counter
    update_count: u64,
    
    /// Random number generator
    rng: rand::rngs::ThreadRng,
}

impl GpsSimulator {
    /// Create a new GPS simulator starting at a default location
    /// Starting position: Denver, Colorado area (example coordinates)
    pub fn new() -> Self {
        let start_position = (39.7392, -104.9903, 1655.0); // Lat, Lon, Alt (meters)
        
        Self {
            position: start_position,
            velocity: Vec3::zero(),
            heading: 0.0,
            speed: 0.0,
            hdop: 1.2, // Good accuracy
            satellites: 12,
            position_noise_std: 2.5, // ~2.5 meter accuracy
            last_good_position: start_position,
            update_count: 0,
            rng: rand::thread_rng(),
        }
    }

    /// Update GPS position based on simulated motion
    pub fn update(&mut self) {
        self.update_count += 1;
        
        // Simulate realistic GPS dynamics
        self.simulate_movement();
        
        // Simulate satellite visibility and accuracy changes
        self.update_signal_quality();
        
        // Store good position for fallback
        if self.satellites >= 4 && self.hdop < 5.0 {
            self.last_good_position = self.position;
        }
    }

    /// Get the latest GPS reading with noise
    pub fn get_latest(&mut self) -> GpsData {
        // Add GPS position noise based on current HDOP
        let noise_scale = self.hdop * self.position_noise_std;
        let normal = Normal::new(0.0, noise_scale).unwrap();
        
        // Convert position noise to lat/lon offsets (simplified)
        let lat_noise = normal.sample(&mut self.rng) / 111320.0; // ~111km per degree
        let lon_noise = normal.sample(&mut self.rng) / (111320.0 * self.position.0.to_radians().cos());
        let alt_noise = normal.sample(&mut self.rng) * 1.5; // Vertical accuracy is typically worse
        
        let noisy_position = (
            self.position.0 + lat_noise,
            self.position.1 + lon_noise,
            self.position.2 + alt_noise,
        );
        
        // Calculate health based on satellite count and HDOP
        let health = self.calculate_health();
        
        GpsData {
            timestamp: chrono::Utc::now(),
            latitude: noisy_position.0,
            longitude: noisy_position.1,
            altitude: noisy_position.2,
            speed: self.speed,
            heading: self.heading.to_degrees().rem_euclid(360.0),
            hdop: self.hdop,
            satellites: self.satellites,
            health,
        }
    }

    /// Simulate realistic GPS movement patterns
    fn simulate_movement(&mut self) {
        let t = self.update_count as f64;
        
        // Simulate a circular flight pattern (like a drone doing surveillance)
        let radius = 0.001; // ~111 meters radius in degrees
        let angular_speed = 0.05; // Radians per update
        
        let center_lat = 39.7392;
        let center_lon = -104.9903;
        
        // Circular motion in horizontal plane
        let angle = angular_speed * t;
        self.position.0 = center_lat + radius * angle.cos();
        self.position.1 = center_lon + radius * angle.sin() / self.position.0.to_radians().cos();
        
        // Simulate altitude changes (oscillating)
        self.position.2 = 1655.0 + 50.0 * (0.02 * t).sin();
        
        // Calculate velocity based on position changes
        // This is simplified - in reality would track previous position
        let speed_mps = radius * 111320.0 * angular_speed; // Convert to m/s
        self.speed = speed_mps;
        
        // Update heading based on direction of motion
        self.heading = angle + PI / 2.0; // Tangent to circle
        
        // Calculate velocity components (North, East, Down)
        self.velocity = Vec3::new(
            self.speed * self.heading.cos(),
            self.speed * self.heading.sin(),
            50.0 * 0.02 * (0.02 * t).cos(), // Vertical velocity from altitude change
        );
    }

    /// Update GPS signal quality metrics (satellites and HDOP)
    fn update_signal_quality(&mut self) {
        // Simulate occasional GPS quality degradation
        if self.update_count % 20 == 0 {
            // Every 20 seconds, randomly adjust signal quality
            let quality_change: f64 = self.rng.gen_range(-0.3..0.3);
            self.hdop = (self.hdop + quality_change).clamp(0.8, 8.0);
            
            // Satellite count correlates with HDOP
            if self.hdop < 2.0 {
                self.satellites = self.rng.gen_range(10..15);
            } else if self.hdop < 4.0 {
                self.satellites = self.rng.gen_range(6..10);
            } else {
                self.satellites = self.rng.gen_range(4..7);
            }
        }
        
        // Gradually improve signal quality over time (simulates finding better satellite geometry)
        if self.hdop > 1.5 {
            self.hdop -= 0.01;
        }
    }

    /// Calculate overall GPS health metric
    fn calculate_health(&self) -> f64 {
        // Health based on satellite count and HDOP
        let sat_score = (self.satellites as f64 / 12.0).min(1.0);
        let hdop_score = (3.0 / self.hdop).min(1.0);
        
        // Weighted average (satellites more important than HDOP)
        0.6 * sat_score + 0.4 * hdop_score
    }

    /// Inject a GPS fault for testing
    pub fn inject_fault(&mut self, fault_type: GpsFaultType) {
        match fault_type {
            GpsFaultType::SignalLoss => {
                self.satellites = 2; // Below minimum for 3D fix
                self.hdop = 15.0;
            }
            GpsFaultType::PoorAccuracy => {
                self.hdop = 8.0;
                self.satellites = 4;
                self.position_noise_std = 15.0; // 15 meter accuracy
            }
            GpsFaultType::PositionJump => {
                // Simulate sudden position error
                self.position.0 += self.rng.gen_range(-0.001..0.001);
                self.position.1 += self.rng.gen_range(-0.001..0.001);
            }
        }
    }

    /// Reset fault conditions to normal
    pub fn reset_faults(&mut self) {
        self.hdop = 1.2;
        self.satellites = 12;
        self.position_noise_std = 2.5;
    }

    /// Get current position without noise (for fusion algorithm ground truth)
    pub fn get_true_position(&self) -> (f64, f64, f64) {
        self.position
    }

    /// Get current velocity without noise
    pub fn get_true_velocity(&self) -> Vec3 {
        self.velocity
    }
}

impl Default for GpsSimulator {
    fn default() -> Self {
        Self::new()
    }
}

/// Types of GPS faults that can be injected for testing
#[derive(Debug, Clone, Copy)]
pub enum GpsFaultType {
    /// Insufficient satellites for 3D fix
    SignalLoss,
    /// Poor HDOP and high position error
    PoorAccuracy,
    /// Sudden position jump (multipath or error)
    PositionJump,
}