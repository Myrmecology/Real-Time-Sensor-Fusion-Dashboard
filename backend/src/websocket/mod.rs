//! WebSocket Server Module
//! 
//! Provides real-time bidirectional communication for streaming
//! sensor data to clients and receiving ML predictions.

pub mod server;

// Re-export commonly used types
pub use server::WebSocketServer;