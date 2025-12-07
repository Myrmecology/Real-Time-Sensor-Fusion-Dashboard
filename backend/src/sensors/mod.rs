//! Sensor simulation modules
//! 
//! Provides realistic sensor simulators with configurable noise,
//! drift, and failure modes for testing the fusion pipeline.

pub mod imu;
pub mod gps;

// Re-export commonly used types
pub use imu::ImuSimulator;
pub use gps::GpsSimulator;