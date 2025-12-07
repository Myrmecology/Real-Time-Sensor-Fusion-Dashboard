# 🏗️ System Architecture

## Overview

The Real-Time Sensor Fusion Dashboard is a distributed system with three main components communicating via WebSocket connections.

## Component Architecture

### 1. Rust Backend (Telemetry Engine)

**Purpose**: High-performance sensor simulation and data fusion

**Technologies**:
- Tokio (async runtime)
- tokio-tungstenite (WebSocket)
- nalgebra (linear algebra)
- serde (serialization)

**Key Modules**:
```
backend/
├── main.rs              # Entry point, orchestration
├── models.rs            # Data structures (Vec3, Quaternion, SensorData)
├── sensors/
│   ├── imu.rs          # IMU simulator (50 Hz)
│   └── gps.rs          # GPS simulator (1 Hz)
├── fusion/
│   └── complementary.rs # Complementary filter algorithm
└── websocket/
    └── server.rs       # WebSocket broadcast server
```

**Data Flow**:
1. Sensor simulators generate data at different frequencies
2. Fusion engine combines data using complementary filter
3. Fused data broadcast to all connected WebSocket clients
4. Non-blocking architecture allows multiple simultaneous connections

### 2. Python ML Service (Anomaly Detection)

**Purpose**: Real-time anomaly detection using machine learning

**Technologies**:
- scikit-learn (Isolation Forest)
- websockets (async client)
- numpy/pandas (data processing)

**Key Modules**:
```
ml-service/
├── main.py              # Service orchestrator
├── anomaly_detector.py  # Isolation Forest model
└── websocket_client.py  # WebSocket client with auto-reconnect
```

**Algorithm**:
- **Isolation Forest**: Unsupervised anomaly detection
- **Feature Extraction**: 14-dimensional feature vector
  - Accelerometer (x, y, z)
  - Gyroscope (x, y, z)
  - Euler angles (roll, pitch, yaw)
  - Velocity magnitude
  - GPS speed and heading
  - Confidence and health metrics
- **Adaptive Learning**: Model retrains every 100 samples
- **Statistical Fallback**: Z-score based detection when model is cold

### 3. React Frontend (Visualization)

**Purpose**: Real-time mission control dashboard

**Technologies**:
- React 18 (component framework)
- Three.js (3D visualization)
- Recharts (time series charts)
- TypeScript (type safety)
- Vite (build tool)

**Component Hierarchy**:
```
App (WebSocket connection)
└── Dashboard (layout orchestration)
    ├── Scene3D (3D drone model)
    ├── LiveChart (×3 - gyro, accel, anomaly)
    ├── SensorPanel (telemetry display)
    └── AnomalyAlert (overlay modal)
```

**Custom Hooks**:
- `useWebSocket`: Manages WebSocket lifecycle, auto-reconnect, message queuing

## Data Flow Diagram
```
┌──────────────────────────────────────────────────────────┐
│                     Rust Backend                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │
│  │   IMU    │  │   GPS    │  │ Complementary    │     │
│  │ 50 Hz    │  │  1 Hz    │  │     Filter       │     │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘     │
│       │             │                  │                │
│       └─────────────┴──────────────────┘                │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │  WebSocket  │                            │
│              │   Server    │                            │
│              │  Port 8080  │                            │
│              └──────┬──────┘                            │
└─────────────────────┼───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Python ML      │     │  React UI       │
│  Service        │     │  Port 3000      │
│                 │     │                 │
│ ┌─────────────┐ │     │ ┌─────────────┐ │
│ │ WebSocket   │ │     │ │ WebSocket   │ │
│ │   Client    │ │     │ │   Client    │ │
│ └──────┬──────┘ │     │ └──────┬──────┘ │
│        │        │     │        │        │
│        ▼        │     │        ▼        │
│ ┌─────────────┐ │     │ ┌─────────────┐ │
│ │  Anomaly    │ │     │ │ Dashboard   │ │
│ │  Detector   │ │     │ │ Components  │ │
│ └──────┬──────┘ │     │ └─────────────┘ │
│        │        │     │                 │
│        └────────┼─────┼─────────────────┘
│                 │     │
│     Sends back  │     │  Displays data
│   anomaly score │     │  and alerts
└─────────────────┘     └─────────────────┘
```

## Communication Protocol

### Message Types

#### 1. Connection Message (Backend → Clients)
```json
{
  "type": "connection",
  "status": "connected",
  "message": "Real-Time Sensor Fusion Backend",
  "timestamp": "2024-12-07T10:30:00Z"
}
```

#### 2. Sensor Data (Backend → Clients)
```json
{
  "timestamp": "2024-12-07T10:30:00.123Z",
  "orientation": { "w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0 },
  "euler_degrees": [0.0, 0.0, 0.0],
  "position": [39.7392, -104.9903, 1655.0],
  "velocity": { "x": 0.0, "y": 0.0, "z": 0.0 },
  "raw_acceleration": { "x": 0.0, "y": 0.0, "z": 9.81 },
  "raw_gyroscope": { "x": 0.0, "y": 0.0, "z": 0.0 },
  "gps_speed": 0.0,
  "gps_heading": 0.0,
  "confidence": 1.0,
  "system_health": 1.0,
  "anomaly_score": null
}
```

#### 3. Anomaly Prediction (ML Service → Backend)
```json
{
  "type": "anomaly_prediction",
  "score": 0.85,
  "timestamp": "2024-12-07T10:30:00.456Z"
}
```

#### 4. Command (Frontend → Backend)
```json
{
  "type": "command",
  "action": "inject_fault",
  "parameters": { "fault_type": "accel_spike" },
  "timestamp": "2024-12-07T10:30:01.000Z"
}
```

## Sensor Fusion Algorithm

### Complementary Filter

The system uses a complementary filter to fuse IMU and GPS data:

**High-pass filter (Gyroscope)**:
- Short-term accurate
- Drifts over time
- High frequency updates (50 Hz)

**Low-pass filter (Accelerometer)**:
- Long-term accurate (gravity reference)
- Noisy
- Complements gyroscope

**Formula**:
```
orientation = α * gyro_integration + (1 - α) * accel_orientation
```

Where α = 0.98 (98% gyro trust, 2% accel correction)

**Quaternion Representation**:
- Avoids gimbal lock
- Smooth interpolation (SLERP)
- Efficient computation

## Performance Characteristics

### Rust Backend
- **Throughput**: 50 updates/second
- **Latency**: < 1ms per fusion cycle
- **Memory**: ~10 MB
- **CPU**: Single-threaded, ~5% utilization

### Python ML Service
- **Latency**: 2-5ms per prediction
- **Model Training**: ~100ms every 100 samples
- **Memory**: ~50 MB (with model)

### React Frontend
- **Render Rate**: 30-60 FPS
- **WebSocket Latency**: ~10-20ms
- **Memory**: ~100 MB
- **Bundle Size**: ~500 KB (gzipped)

## Scalability

### Current Limits
- Max clients: ~1000 (WebSocket broadcast)
- Max sensor frequency: 1000 Hz (Rust async overhead)
- Chart history: 100 points (frontend performance)

### Scaling Options
- **Horizontal**: Multiple backend instances with load balancer
- **Vertical**: Increase sensor frequency, add more sensor types
- **Data**: Add Redis for persistence, Kafka for distribution

## Security Considerations

### Current State (Development)
- No authentication
- No encryption (ws://)
- Local-only binding (127.0.0.1)

### Production Recommendations
- TLS/SSL (wss://)
- JWT authentication
- Rate limiting
- Input validation
- CORS configuration

## Future Architecture Enhancements

1. **Extended Kalman Filter (EKF)**
   - More accurate state estimation
   - Covariance tracking
   - Better noise handling

2. **Data Persistence Layer**
   - SQLite for local storage
   - Time-series database (InfluxDB)
   - Replay functionality

3. **Real Hardware Integration**
   - USB serial communication
   - I2C/SPI sensor interfaces
   - Hardware abstraction layer

4. **Advanced ML Pipeline**
   - LSTM for trajectory prediction
   - Multiple model ensemble
   - Online learning

5. **Distributed Architecture**
   - gRPC for inter-service communication
   - Service mesh (Istio)
   - Kubernetes deployment

---

**Last Updated**: December 2024