//! Real-Time Sensor Fusion Backend
//! 
//! High-performance telemetry system that simulates sensors, performs fusion,
//! and streams data via WebSocket to ML services and frontend clients.

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod models;
mod sensors;
mod fusion;
mod websocket;

use models::FusedSensorData;
use sensors::{imu::ImuSimulator, gps::GpsSimulator};
use fusion::complementary::ComplementaryFilter;
use websocket::server::WebSocketServer;

/// Application configuration
#[derive(Debug, Clone)]
struct Config {
    /// WebSocket server port
    ws_port: u16,
    /// IMU update frequency in Hz
    imu_frequency: u32,
    /// GPS update frequency in Hz
    gps_frequency: u32,
    /// Fusion filter alpha parameter (0.0 - 1.0)
    filter_alpha: f64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            ws_port: 8080,
            imu_frequency: 50,  // 50 Hz for IMU
            gps_frequency: 1,   // 1 Hz for GPS
            filter_alpha: 0.98, // Complementary filter parameter
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize structured logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "sensor_fusion_backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer().with_target(false))
        .init();

    info!("🚀 Starting Real-Time Sensor Fusion Backend");

    // Load configuration
    let config = Config::default();
    info!("📋 Configuration: {:?}", config);

    // Create broadcast channel for sensor data distribution
    // Buffer size of 100 allows consumers to lag slightly without blocking producers
    let (tx, _rx) = broadcast::channel::<FusedSensorData>(100);
    let tx = Arc::new(tx);

    // Spawn sensor simulation task
    let sensor_tx = tx.clone();
    let sensor_handle = tokio::spawn(async move {
        if let Err(e) = run_sensor_fusion_loop(sensor_tx, config.clone()).await {
            error!("❌ Sensor fusion loop error: {}", e);
        }
    });

    // Start WebSocket server
    let ws_server = WebSocketServer::new(config.ws_port, tx.clone());
    let server_handle = tokio::spawn(async move {
        if let Err(e) = ws_server.run().await {
            error!("❌ WebSocket server error: {}", e);
        }
    });

    info!("✅ All systems operational");
    info!("🌐 WebSocket server listening on ws://127.0.0.1:{}", config.ws_port);
    info!("📡 Streaming sensor data at {} Hz (IMU) and {} Hz (GPS)", 
          config.imu_frequency, config.gps_frequency);

    // Wait for tasks to complete (they shouldn't unless there's an error)
    tokio::select! {
        result = sensor_handle => {
            if let Err(e) = result {
                error!("Sensor task panicked: {}", e);
            }
        }
        result = server_handle => {
            if let Err(e) = result {
                error!("Server task panicked: {}", e);
            }
        }
    }

    info!("🛑 Shutting down gracefully");
    Ok(())
}

/// Main sensor fusion loop
/// 
/// This function orchestrates sensor simulation, data fusion, and broadcasting.
async fn run_sensor_fusion_loop(
    tx: Arc<broadcast::Sender<FusedSensorData>>,
    config: Config,
) -> Result<()> {
    info!("🔧 Initializing sensor simulators and fusion engine");

    // Initialize sensor simulators
    let mut imu = ImuSimulator::new();
    let mut gps = GpsSimulator::new();
    let mut filter = ComplementaryFilter::new(config.filter_alpha);

    // Calculate time intervals
    let imu_interval = std::time::Duration::from_millis(1000 / config.imu_frequency as u64);
    let gps_interval = std::time::Duration::from_millis(1000 / config.gps_frequency as u64);

    let mut imu_ticker = tokio::time::interval(imu_interval);
    let mut gps_ticker = tokio::time::interval(gps_interval);

    info!("✅ Fusion engine initialized with alpha = {}", config.filter_alpha);

    loop {
        tokio::select! {
            // High-frequency IMU updates
            _ = imu_ticker.tick() => {
                let imu_data = imu.read();
                let gps_data = gps.get_latest();
                
                // Perform sensor fusion
                let fused_data = filter.update(imu_data, gps_data);
                
                // Broadcast to all connected clients (non-blocking)
                // If all receivers are dropped or lagging, this won't block
                let _ = tx.send(fused_data);
            }
            
            // Low-frequency GPS updates
            _ = gps_ticker.tick() => {
                gps.update();
            }
        }
    }
}