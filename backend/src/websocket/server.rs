//! WebSocket Server Implementation
//! 
//! High-performance async WebSocket server that broadcasts fused sensor data
//! to all connected clients in real-time.

use anyhow::{Result, Context};
use futures_util::{StreamExt, SinkExt, stream::{SplitSink, SplitStream}};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};
use tracing::{info, warn, error, debug};
use std::sync::Arc;
use std::net::SocketAddr;

use crate::models::FusedSensorData;

/// WebSocket server for broadcasting sensor data
pub struct WebSocketServer {
    /// Port to listen on
    port: u16,
    
    /// Broadcast sender for distributing sensor data
    sensor_tx: Arc<broadcast::Sender<FusedSensorData>>,
}

impl WebSocketServer {
    /// Create a new WebSocket server
    /// 
    /// # Arguments
    /// * `port` - Port number to bind to
    /// * `sensor_tx` - Broadcast channel sender for sensor data
    pub fn new(port: u16, sensor_tx: Arc<broadcast::Sender<FusedSensorData>>) -> Self {
        Self { port, sensor_tx }
    }

    /// Start the WebSocket server and accept connections
    pub async fn run(self) -> Result<()> {
        let addr = format!("127.0.0.1:{}", self.port);
        let listener = TcpListener::bind(&addr)
            .await
            .context(format!("Failed to bind to {}", addr))?;
        
        info!("🌐 WebSocket server listening on {}", addr);

        loop {
            match listener.accept().await {
                Ok((stream, peer_addr)) => {
                    info!("🔌 New connection from {}", peer_addr);
                    
                    // Clone the broadcast sender for this connection
                    let sensor_tx = self.sensor_tx.clone();
                    
                    // Spawn a task to handle this client connection
                    tokio::spawn(async move {
                        if let Err(e) = handle_connection(stream, peer_addr, sensor_tx).await {
                            warn!("⚠️  Connection error for {}: {}", peer_addr, e);
                        }
                        info!("👋 Client {} disconnected", peer_addr);
                    });
                }
                Err(e) => {
                    error!("❌ Failed to accept connection: {}", e);
                }
            }
        }
    }
}

/// Handle an individual WebSocket connection
async fn handle_connection(
    stream: TcpStream,
    peer_addr: SocketAddr,
    sensor_tx: Arc<broadcast::Sender<FusedSensorData>>,
) -> Result<()> {
    // Upgrade TCP connection to WebSocket
    let ws_stream = accept_async(stream)
        .await
        .context("Failed to accept WebSocket handshake")?;
    
    debug!("✅ WebSocket handshake completed for {}", peer_addr);
    
    // Split the WebSocket into sender and receiver
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    
    // Subscribe to sensor data broadcast
    let mut sensor_rx = sensor_tx.subscribe();
    
    // Send welcome message
    let welcome_msg = serde_json::json!({
        "type": "connection",
        "status": "connected",
        "message": "Real-Time Sensor Fusion Backend",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });
    
    ws_sender
        .send(Message::Text(welcome_msg.to_string()))
        .await
        .context("Failed to send welcome message")?;
    
    // Spawn task to receive messages from client (e.g., ML predictions, commands)
    let receive_task = tokio::spawn(async move {
        handle_incoming_messages(&mut ws_receiver, peer_addr).await
    });
    
    // Main loop: broadcast sensor data to this client
    loop {
        tokio::select! {
            // Receive sensor data from broadcast channel
            result = sensor_rx.recv() => {
                match result {
                    Ok(sensor_data) => {
                        // Serialize sensor data to JSON
                        match serde_json::to_string(&sensor_data) {
                            Ok(json) => {
                                // Send to client
                                if let Err(e) = ws_sender.send(Message::Text(json)).await {
                                    debug!("Failed to send to {}: {}", peer_addr, e);
                                    break; // Client disconnected
                                }
                            }
                            Err(e) => {
                                error!("Serialization error: {}", e);
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("⚠️  Client {} lagged, skipped {} messages", peer_addr, skipped);
                        // Continue receiving - client is slow but still connected
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        info!("📡 Broadcast channel closed");
                        break;
                    }
                }
            }
            
            // Check if receive task has completed (client disconnected)
            _ = &mut receive_task => {
                debug!("Receive task completed for {}", peer_addr);
                break;
            }
        }
    }
    
    // Clean shutdown
    let _ = ws_sender.send(Message::Close(None)).await;
    
    Ok(())
}

/// Handle incoming messages from a client
/// 
/// This allows bidirectional communication for:
/// - ML anomaly predictions
/// - Control commands (fault injection, parameter updates)
/// - Client heartbeats
async fn handle_incoming_messages(
    ws_receiver: &mut SplitStream<WebSocketStream<TcpStream>>,
    peer_addr: SocketAddr,
) {
    while let Some(msg_result) = ws_receiver.next().await {
        match msg_result {
            Ok(msg) => {
                match msg {
                    Message::Text(text) => {
                        debug!("📥 Received from {}: {}", peer_addr, text);
                        
                        // Parse incoming JSON messages
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                            handle_client_message(json, peer_addr).await;
                        }
                    }
                    Message::Binary(data) => {
                        debug!("📥 Received binary from {}: {} bytes", peer_addr, data.len());
                    }
                    Message::Ping(data) => {
                        debug!("🏓 Ping from {}", peer_addr);
                        // Pong is automatically handled by tungstenite
                    }
                    Message::Pong(_) => {
                        debug!("🏓 Pong from {}", peer_addr);
                    }
                    Message::Close(frame) => {
                        info!("🚪 Close frame from {}: {:?}", peer_addr, frame);
                        break;
                    }
                    Message::Frame(_) => {
                        // Raw frames are not typically handled directly
                    }
                }
            }
            Err(e) => {
                warn!("⚠️  Error receiving from {}: {}", peer_addr, e);
                break;
            }
        }
    }
}

/// Handle specific client messages
async fn handle_client_message(json: serde_json::Value, peer_addr: SocketAddr) {
    // Extract message type
    if let Some(msg_type) = json.get("type").and_then(|v| v.as_str()) {
        match msg_type {
            "anomaly_prediction" => {
                // ML service sending back anomaly scores
                if let Some(score) = json.get("score").and_then(|v| v.as_f64()) {
                    debug!("🤖 ML anomaly score from {}: {}", peer_addr, score);
                    // In a full implementation, would update FusedSensorData with this score
                }
            }
            "command" => {
                // Handle control commands (e.g., fault injection)
                if let Some(cmd) = json.get("action").and_then(|v| v.as_str()) {
                    info!("⚡ Command from {}: {}", peer_addr, cmd);
                    // Could trigger fault injection, parameter changes, etc.
                }
            }
            "heartbeat" => {
                debug!("💓 Heartbeat from {}", peer_addr);
            }
            _ => {
                debug!("❓ Unknown message type from {}: {}", peer_addr, msg_type);
            }
        }
    }
}