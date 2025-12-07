"""
Anomaly Detector for Sensor Data

Implements real-time anomaly detection using Isolation Forest algorithm
with adaptive learning and statistical analysis.
"""

import logging
import numpy as np
from typing import List, Optional
from collections import deque
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from scipy import stats

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Real-time anomaly detection for sensor fusion data
    
    Uses Isolation Forest algorithm combined with statistical methods
    to detect anomalies in high-frequency sensor streams.
    """
    
    def __init__(self, buffer_size: int = 50, threshold: float = 0.7):
        """
        Initialize anomaly detector
        
        Args:
            buffer_size: Number of samples to keep for model training
            threshold: Anomaly score threshold (0-1)
        """
        self.buffer_size = buffer_size
        self.threshold = threshold
        
        # Data buffer for training
        self.data_buffer = deque(maxlen=buffer_size)
        
        # Isolation Forest model
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.1,  # Assume 10% of data may be anomalous
            random_state=42,
            max_samples='auto',
            bootstrap=False
        )
        
        # Feature scaler for normalization
        self.scaler = StandardScaler()
        
        # Model state
        self.is_trained = False
        self.feature_count = None
        
        # Statistics tracking
        self.prediction_count = 0
        self.anomaly_count = 0
        self.anomaly_history = deque(maxlen=100)
        
        # Feature statistics for additional validation
        self.feature_means = None
        self.feature_stds = None
        
        logger.info(f"🧠 Anomaly detector initialized (buffer={buffer_size}, threshold={threshold})")
    
    def predict(self, features: List[float]) -> float:
        """
        Predict anomaly score for given features
        
        Args:
            features: Feature vector from sensor data
            
        Returns:
            Anomaly score between 0 (normal) and 1 (anomalous)
        """
        self.prediction_count += 1
        
        # Validate features
        if not features or len(features) == 0:
            logger.warning("⚠️  Empty feature vector received")
            return 0.0
        
        # Convert to numpy array
        features_array = np.array(features).reshape(1, -1)
        
        # Store feature count on first prediction
        if self.feature_count is None:
            self.feature_count = len(features)
            logger.info(f"📊 Feature dimension: {self.feature_count}")
        
        # Validate feature dimension consistency
        if len(features) != self.feature_count:
            logger.warning(
                f"⚠️  Feature dimension mismatch: expected {self.feature_count}, "
                f"got {len(features)}"
            )
            return 0.0
        
        # Add to buffer for future training
        self.data_buffer.append(features)
        
        # If not enough data yet, use statistical methods only
        if len(self.data_buffer) < 20:
            anomaly_score = self._statistical_anomaly_score(features_array)
            self.anomaly_history.append(anomaly_score)
            return anomaly_score
        
        # Train model if not yet trained or needs update
        if not self.is_trained and len(self.data_buffer) >= self.buffer_size:
            self.update_model()
        
        # Predict using trained model
        if self.is_trained:
            try:
                # Scale features
                features_scaled = self.scaler.transform(features_array)
                
                # Get anomaly score from Isolation Forest
                # Returns -1 for outliers, 1 for inliers
                prediction = self.model.predict(features_scaled)[0]
                
                # Get decision function score (more granular than binary prediction)
                # More negative = more anomalous
                decision_score = self.model.decision_function(features_scaled)[0]
                
                # Convert to 0-1 range (higher = more anomalous)
                # Use sigmoid-like transformation
                anomaly_score = self._normalize_score(decision_score)
                
                # Combine with statistical methods for robustness
                stat_score = self._statistical_anomaly_score(features_array)
                final_score = 0.7 * anomaly_score + 0.3 * stat_score
                
                # Track anomalies
                self.anomaly_history.append(final_score)
                if final_score > self.threshold:
                    self.anomaly_count += 1
                
                return float(final_score)
                
            except Exception as e:
                logger.error(f"❌ Prediction error: {e}", exc_info=True)
                return self._statistical_anomaly_score(features_array)
        else:
            # Fallback to statistical method
            anomaly_score = self._statistical_anomaly_score(features_array)
            self.anomaly_history.append(anomaly_score)
            return anomaly_score
    
    def update_model(self):
        """
        Retrain the anomaly detection model with buffered data
        """
        if len(self.data_buffer) < 20:
            logger.warning(f"⚠️  Insufficient data for training: {len(self.data_buffer)} samples")
            return
        
        try:
            logger.info(f"🔄 Training model with {len(self.data_buffer)} samples")
            
            # Convert buffer to numpy array
            X = np.array(list(self.data_buffer))
            
            # Fit scaler
            self.scaler.fit(X)
            X_scaled = self.scaler.transform(X)
            
            # Calculate feature statistics
            self.feature_means = np.mean(X, axis=0)
            self.feature_stds = np.std(X, axis=0)
            
            # Train Isolation Forest
            self.model.fit(X_scaled)
            
            self.is_trained = True
            logger.info("✅ Model training complete")
            
            # Log model performance on training data
            predictions = self.model.predict(X_scaled)
            anomaly_ratio = np.sum(predictions == -1) / len(predictions)
            logger.info(f"📊 Training set anomaly ratio: {anomaly_ratio:.2%}")
            
        except Exception as e:
            logger.error(f"❌ Model training failed: {e}", exc_info=True)
            self.is_trained = False
    
    def _normalize_score(self, decision_score: float) -> float:
        """
        Normalize decision function score to 0-1 range
        
        Args:
            decision_score: Raw decision function output (typically -0.5 to 0.5)
            
        Returns:
            Normalized score between 0 (normal) and 1 (anomalous)
        """
        # Decision scores typically range from -0.5 (anomalous) to 0.5 (normal)
        # Map to 0-1 where higher = more anomalous
        # Use sigmoid-like transformation for smooth gradients
        
        # Invert and scale: more negative -> higher anomaly score
        shifted = -decision_score
        
        # Apply sigmoid transformation
        normalized = 1.0 / (1.0 + np.exp(-10 * shifted))
        
        return float(np.clip(normalized, 0.0, 1.0))
    
    def _statistical_anomaly_score(self, features: np.ndarray) -> float:
        """
        Calculate anomaly score using statistical methods (fallback/complement)
        
        Args:
            features: Feature vector
            
        Returns:
            Statistical anomaly score (0-1)
        """
        if len(self.data_buffer) < 5:
            return 0.0  # Not enough data for statistics
        
        try:
            # Get historical data
            historical_data = np.array(list(self.data_buffer)[:-1])  # Exclude current sample
            
            if len(historical_data) == 0:
                return 0.0
            
            # Calculate z-scores for each feature
            means = np.mean(historical_data, axis=0)
            stds = np.std(historical_data, axis=0) + 1e-6  # Avoid division by zero
            
            # Z-score of current sample
            z_scores = np.abs((features[0] - means) / stds)
            
            # Use maximum z-score as anomaly indicator
            max_z_score = np.max(z_scores)
            
            # Convert z-score to 0-1 range
            # z > 3 is typically considered anomalous (99.7% confidence)
            anomaly_score = min(max_z_score / 3.0, 1.0)
            
            return float(anomaly_score)
            
        except Exception as e:
            logger.error(f"❌ Statistical scoring error: {e}")
            return 0.0
    
    def get_statistics(self) -> dict:
        """
        Get current detector statistics
        
        Returns:
            Dictionary of performance metrics
        """
        anomaly_rate = (
            self.anomaly_count / self.prediction_count 
            if self.prediction_count > 0 
            else 0.0
        )
        
        recent_avg_score = (
            float(np.mean(list(self.anomaly_history))) 
            if len(self.anomaly_history) > 0 
            else 0.0
        )
        
        return {
            'is_trained': self.is_trained,
            'prediction_count': self.prediction_count,
            'anomaly_count': self.anomaly_count,
            'anomaly_rate': anomaly_rate,
            'buffer_size': len(self.data_buffer),
            'recent_avg_score': recent_avg_score,
            'threshold': self.threshold
        }
    
    def reset(self):
        """Reset detector state"""
        self.data_buffer.clear()
        self.anomaly_history.clear()
        self.is_trained = False
        self.prediction_count = 0
        self.anomaly_count = 0
        logger.info("🔄 Anomaly detector reset")