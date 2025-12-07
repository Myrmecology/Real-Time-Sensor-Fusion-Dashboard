"""
Real-Time Sensor Fusion ML Service

High-performance machine learning service that performs anomaly detection
on streaming sensor data from the Rust backend.
"""

import asyncio
import logging
import signal
import sys
from typing import Optional
from datetime import datetime

from anomaly_detector import AnomalyDetector
from websocket_client import SensorWebSocketClient

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('ml_service.log')
    ]
)

logger = logging.getLogger(__name__)


class MLServiceConfig:
    """Configuration for ML service"""
    
    def __init__(self):
        self.websocket_url = "ws://127.0.0.1:8080"
        self.model_update_interval = 100  # Retrain every N samples
        self.anomaly_threshold = 0.7  # Anomaly score threshold (0-1)
        self.buffer_size = 50  # Number of samples to buffer for training
        self.enable_logging = True


class MLService:
    """
    Main ML service orchestrator
    
    Coordinates WebSocket communication, anomaly detection, and model updates.
    """
    
    def __init__(self, config: MLServiceConfig):
        self.config = config
        self.anomaly_detector = AnomalyDetector(
            buffer_size=config.buffer_size,
            threshold=config.anomaly_threshold
        )
        self.ws_client: Optional[SensorWebSocketClient] = None
        self.running = False
        self.sample_count = 0
        
        logger.info("🤖 ML Service initialized")
        logger.info(f"📋 Configuration: {vars(config)}")
    
    async def start(self):
        """Start the ML service"""
        logger.info("🚀 Starting ML Service")
        
        try:
            # Initialize WebSocket client
            self.ws_client = SensorWebSocketClient(
                url=self.config.websocket_url,
                on_data_callback=self.process_sensor_data
            )
            
            # Connect to backend
            await self.ws_client.connect()
            
            self.running = True
            logger.info("✅ ML Service is operational")
            
            # Start receiving and processing data
            await self.ws_client.receive_loop()
            
        except KeyboardInterrupt:
            logger.info("⚠️  Keyboard interrupt received")
        except Exception as e:
            logger.error(f"❌ Fatal error: {e}", exc_info=True)
        finally:
            await self.shutdown()
    
    async def process_sensor_data(self, sensor_data: dict):
        """
        Process incoming sensor data and perform anomaly detection
        
        Args:
            sensor_data: Fused sensor data from backend
        """
        try:
            self.sample_count += 1
            
            # Extract features for anomaly detection
            features = self._extract_features(sensor_data)
            
            # Perform anomaly detection
            anomaly_score = self.anomaly_detector.predict(features)
            
            # Log high anomalies
            if anomaly_score > self.config.anomaly_threshold:
                logger.warning(
                    f"⚠️  ANOMALY DETECTED! Score: {anomaly_score:.3f} "
                    f"at {sensor_data.get('timestamp', 'unknown')}"
                )
            
            # Periodically retrain model with accumulated data
            if self.sample_count % self.config.model_update_interval == 0:
                logger.info(f"🔄 Updating model after {self.sample_count} samples")
                self.anomaly_detector.update_model()
            
            # Send anomaly score back to backend
            if self.ws_client:
                await self.ws_client.send_anomaly_score(anomaly_score)
            
            # Log progress
            if self.sample_count % 50 == 0:
                logger.info(
                    f"📊 Processed {self.sample_count} samples | "
                    f"Latest anomaly score: {anomaly_score:.3f}"
                )
                
        except Exception as e:
            logger.error(f"❌ Error processing sensor data: {e}", exc_info=True)
    
    def _extract_features(self, sensor_data: dict) -> list:
        """
        Extract relevant features from sensor data for ML model
        
        Args:
            sensor_data: Raw sensor data dictionary
            
        Returns:
            Feature vector for anomaly detection
        """
        features = []
        
        try:
            # Extract raw sensor readings
            raw_accel = sensor_data.get('raw_acceleration', {})
            raw_gyro = sensor_data.get('raw_gyroscope', {})
            
            # Accelerometer features
            features.extend([
                raw_accel.get('x', 0.0),
                raw_accel.get('y', 0.0),
                raw_accel.get('z', 0.0)
            ])
            
            # Gyroscope features
            features.extend([
                raw_gyro.get('x', 0.0),
                raw_gyro.get('y', 0.0),
                raw_gyro.get('z', 0.0)
            ])
            
            # Euler angles
            euler = sensor_data.get('euler_degrees', (0.0, 0.0, 0.0))
            if isinstance(euler, (list, tuple)) and len(euler) >= 3:
                features.extend(euler[:3])
            else:
                features.extend([0.0, 0.0, 0.0])
            
            # Velocity magnitude
            velocity = sensor_data.get('velocity', {})
            vel_x = velocity.get('x', 0.0)
            vel_y = velocity.get('y', 0.0)
            vel_z = velocity.get('z', 0.0)
            vel_magnitude = (vel_x**2 + vel_y**2 + vel_z**2)**0.5
            features.append(vel_magnitude)
            
            # GPS metrics
            features.extend([
                sensor_data.get('gps_speed', 0.0),
                sensor_data.get('gps_heading', 0.0)
            ])
            
            # System health indicators
            features.extend([
                sensor_data.get('confidence', 1.0),
                sensor_data.get('system_health', 1.0)
            ])
            
        except Exception as e:
            logger.error(f"⚠️  Feature extraction error: {e}")
            # Return zero vector on error
            features = [0.0] * 14
        
        return features
    
    async def shutdown(self):
        """Graceful shutdown of ML service"""
        logger.info("🛑 Shutting down ML Service")
        
        self.running = False
        
        if self.ws_client:
            await self.ws_client.disconnect()
        
        # Save model state if needed
        logger.info("💾 Saving model state...")
        # Could save anomaly detector model here
        
        logger.info("✅ ML Service shutdown complete")


async def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("🤖 REAL-TIME SENSOR FUSION ML SERVICE")
    logger.info("=" * 60)
    
    # Create configuration
    config = MLServiceConfig()
    
    # Create and start service
    service = MLService(config)
    
    # Setup signal handlers for graceful shutdown
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        logger.info("⚠️  Shutdown signal received")
        asyncio.create_task(service.shutdown())
    
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, signal_handler)
    
    # Start service
    await service.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Exiting...")
    except Exception as e:
        logger.error(f"❌ Unhandled exception: {e}", exc_info=True)
        sys.exit(1)