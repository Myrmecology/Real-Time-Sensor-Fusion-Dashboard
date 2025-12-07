//! Sensor Fusion Algorithms
//! 
//! Implements various sensor fusion techniques to combine noisy sensor
//! measurements into accurate state estimates.

pub mod complementary;

// Re-export commonly used types
pub use complementary::ComplementaryFilter;