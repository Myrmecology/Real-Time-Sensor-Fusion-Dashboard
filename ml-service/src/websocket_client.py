"""
WebSocket Client for ML Service

Handles bidirectional WebSocket communication between the Python ML service
and the Rust telemetry backend.
"""

import asyncio
import json
import logging
from typing import Callable, Optional, Awaitable
import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

logger = logging.getLogger(__name__)


class SensorWebSocketClient:
    """
    Async WebSocket client for receiving sensor data and sending predictions
    """
    
    def __init__(
        self,
        url: str,
        on_data_callback: Callable[[dict], Awaitable[None]],
        reconnect_interval: float = 5.0
    ):
        """
        Initialize WebSocket client
        
        Args:
            url: WebSocket server URL (e.g., ws://127.0.0.1:8080)
            on_data_callback: Async callback function for processing received data
            reconnect_interval: Seconds to wait before reconnection attempts
        """
        self.url = url
        self.on_data_callback = on_data_callback
        self.reconnect_interval = reconnect_interval
        
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.connected = False
        self.should_reconnect = True
        
        self.messages_received = 0
        self.messages_sent = 0
        self.reconnect_count = 0
        
        logger.info(f"🔌 WebSocket client initialized for {url}")
    
    async def connect(self):
        """
        Establish WebSocket connection to the backend
        """
        try:
            logger.info(f"🔗 Connecting to {self.url}...")
            
            self.websocket = await websockets.connect(
                self.url,
                ping_interval=20,  # Send ping every 20 seconds
                ping_timeout=10,   # Wait 10 seconds for pong
                close_timeout=5    # Close timeout
            )
            
            self.connected = True
            logger.info("✅ WebSocket connection established")
            
            # Wait for welcome message
            welcome_msg = await self.websocket.recv()
            logger.info(f"📨 Received: {welcome_msg}")
            
        except ConnectionRefusedError:
            logger.error("❌ Connection refused - is the Rust backend running?")
            self.connected = False
            raise
        except Exception as e:
            logger.error(f"❌ Connection failed: {e}")
            self.connected = False
            raise
    
    async def receive_loop(self):
        """
        Main receive loop - continuously process incoming messages
        """
        while self.should_reconnect:
            try:
                if not self.connected:
                    await self.connect()
                
                # Receive and process messages
                async for message in self.websocket:
                    await self._handle_message(message)
                    
            except ConnectionClosed as e:
                logger.warning(f"⚠️  Connection closed: {e.code} - {e.reason}")
                self.connected = False
                
                if self.should_reconnect:
                    await self._reconnect()
                else:
                    break
                    
            except WebSocketException as e:
                logger.error(f"❌ WebSocket error: {e}")
                self.connected = False
                
                if self.should_reconnect:
                    await self._reconnect()
                else:
                    break
                    
            except Exception as e:
                logger.error(f"❌ Unexpected error in receive loop: {e}", exc_info=True)
                self.connected = False
                
                if self.should_reconnect:
                    await self._reconnect()
                else:
                    break
    
    async def _handle_message(self, message: str):
        """
        Process incoming message
        
        Args:
            message: Raw message string from WebSocket
        """
        try:
            self.messages_received += 1
            
            # Parse JSON
            data = json.loads(message)
            
            # Check message type
            msg_type = data.get('type')
            
            if msg_type == 'connection':
                # Connection status message
                logger.info(f"📡 Connection status: {data.get('status')}")
                
            elif 'timestamp' in data and 'orientation' in data:
                # This is sensor data - process it
                await self.on_data_callback(data)
                
            else:
                # Unknown message type
                logger.debug(f"❓ Unknown message type: {data}")
            
            # Log progress periodically
            if self.messages_received % 100 == 0:
                logger.info(f"📊 Received {self.messages_received} messages")
                
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON decode error: {e} | Message: {message[:100]}")
        except Exception as e:
            logger.error(f"❌ Message handling error: {e}", exc_info=True)
    
    async def send_anomaly_score(self, score: float):
        """
        Send anomaly prediction back to the backend
        
        Args:
            score: Anomaly score (0-1)
        """
        if not self.connected or not self.websocket:
            logger.warning("⚠️  Cannot send - not connected")
            return
        
        try:
            message = {
                "type": "anomaly_prediction",
                "score": float(score),
                "timestamp": self._get_timestamp()
            }
            
            await self.websocket.send(json.dumps(message))
            self.messages_sent += 1
            
            # Log occasionally
            if self.messages_sent % 50 == 0:
                logger.debug(f"📤 Sent {self.messages_sent} predictions")
                
        except Exception as e:
            logger.error(f"❌ Failed to send anomaly score: {e}")
    
    async def send_command(self, action: str, parameters: Optional[dict] = None):
        """
        Send control command to backend
        
        Args:
            action: Command action (e.g., 'inject_fault', 'reset')
            parameters: Optional command parameters
        """
        if not self.connected or not self.websocket:
            logger.warning("⚠️  Cannot send command - not connected")
            return
        
        try:
            message = {
                "type": "command",
                "action": action,
                "parameters": parameters or {},
                "timestamp": self._get_timestamp()
            }
            
            await self.websocket.send(json.dumps(message))
            logger.info(f"⚡ Sent command: {action}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send command: {e}")
    
    async def send_heartbeat(self):
        """Send heartbeat to keep connection alive"""
        if not self.connected or not self.websocket:
            return
        
        try:
            message = {
                "type": "heartbeat",
                "timestamp": self._get_timestamp()
            }
            
            await self.websocket.send(json.dumps(message))
            
        except Exception as e:
            logger.debug(f"⚠️  Heartbeat failed: {e}")
    
    async def _reconnect(self):
        """
        Attempt to reconnect to the backend
        """
        self.reconnect_count += 1
        logger.info(
            f"🔄 Attempting reconnection #{self.reconnect_count} "
            f"in {self.reconnect_interval} seconds..."
        )
        
        await asyncio.sleep(self.reconnect_interval)
        
        try:
            await self.connect()
        except Exception as e:
            logger.error(f"❌ Reconnection failed: {e}")
    
    async def disconnect(self):
        """
        Gracefully close the WebSocket connection
        """
        logger.info("🚪 Disconnecting WebSocket client...")
        
        self.should_reconnect = False
        self.connected = False
        
        if self.websocket:
            try:
                await self.websocket.close()
                logger.info("✅ WebSocket connection closed")
            except Exception as e:
                logger.warning(f"⚠️  Error during disconnect: {e}")
        
        # Log statistics
        logger.info(f"📊 Final stats: {self.messages_received} received, {self.messages_sent} sent")
    
    def _get_timestamp(self) -> str:
        """Get current ISO timestamp"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()
    
    def get_stats(self) -> dict:
        """
        Get connection statistics
        
        Returns:
            Dictionary of connection metrics
        """
        return {
            'connected': self.connected,
            'messages_received': self.messages_received,
            'messages_sent': self.messages_sent,
            'reconnect_count': self.reconnect_count,
            'url': self.url
        }