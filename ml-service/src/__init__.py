"""
Real-Time Sensor Fusion ML Service Package

Provides machine learning capabilities for sensor anomaly detection
in real-time telemetry systems.
"""

__version__ = "0.1.0"
__author__ = "Your Name"

# Export main components for cleaner imports
from .anomaly_detector import AnomalyDetector
from .websocket_client import SensorWebSocketClient

__all__ = [
    "AnomalyDetector",
    "SensorWebSocketClient",
]