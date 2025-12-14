# 🛰️ Real-Time Sensor Fusion Dashboard

A production-grade real-time sensor fusion system with AI-powered anomaly detection and mission-control visualization.

## 🎯 Overview

This project demonstrates:

- **High-performance Rust backend** for sensor simulation and fusion
- **Python ML service** with real-time anomaly detection
- **React + Three.js frontend** with cyberpunk/aerospace UI
- **WebSocket streaming** for real-time telemetry
- **Complementary filter** for sensor fusion
- **Isolation Forest** for anomaly detection

## 🏗️ Architecture
```
┌─────────────────┐
│  RUST BACKEND   │  Simulates sensors, fuses data, streams via WebSocket
│  Port: 8080     │
└────────┬────────┘
         │
         ├──────────┐
         │          │
         ▼          ▼
┌─────────────┐  ┌─────────────┐
│  PYTHON ML  │  │   REACT UI  │  3D visualization, live charts
│  Port: N/A  │  │  Port: 3000 │  Anomaly alerts, sensor panels
└─────────────┘  └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Rust** 1.70+ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Python** 3.9+ with pip
- **Node.js** 18+ with npm

### 1️⃣ Start Rust Backend
```bash
cd backend
cargo run --release
```

**Expected output:**
```
🚀 Starting Real-Time Sensor Fusion Backend
✅ Fusion engine initialized with alpha = 0.98
🌐 WebSocket server listening on ws://127.0.0.1:8080
```

### 2️⃣ Start Python ML Service
```bash
cd ml-service
pip install -r requirements.txt
python src/main.py
```

**Expected output:**
```
🤖 ML Service initialized
✅ WebSocket connected
🧠 Anomaly detector initialized
```

### 3️⃣ Start Frontend
```bash
cd frontend
npm install
npm run dev
```

**Expected output:**
```
  VITE v5.0.10  ready in 500 ms

  ➜  Local:   http://localhost:3000/
```

### 4️⃣ Open Dashboard

Navigate to **http://localhost:3000** in your browser

## 📊 Features

### Backend (Rust)
- ✅ Simulated IMU sensor (50 Hz)
- ✅ Simulated GPS sensor (1 Hz)
- ✅ Complementary filter fusion
- ✅ WebSocket server for streaming
- ✅ Fault injection support

### ML Service (Python)
- ✅ Isolation Forest anomaly detection
- ✅ Real-time prediction streaming
- ✅ Adaptive model training
- ✅ Statistical validation

### Frontend (React)
- ✅ 3D drone visualization with Three.js
- ✅ Real-time charts (gyro, accel, anomaly)
- ✅ Sensor telemetry panel
- ✅ Health monitoring
- ✅ Fault injection controls
- ✅ Anomaly alerts

## 🎮 Usage

### Fault Injection

Use the controls in the UI to inject faults:

- **Accel Spike**: Sudden accelerometer spike
- **Gyro Spike**: Sudden gyroscope spike
- **High Noise**: Elevated sensor noise
- **Reset All**: Clear all faults

Watch the ML service detect anomalies in real-time!

## 🛠️ Development

### Backend Development
```bash
cd backend
cargo watch -x run
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Python Development
```bash
cd ml-service
python src/main.py
```

## 📦 Project Structure
```
Real-Time-Sensor-Fusion-Dashboard/
├── backend/           # Rust telemetry backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── models.rs
│   │   ├── sensors/
│   │   ├── fusion/
│   │   └── websocket/
│   └── Cargo.toml
├── ml-service/        # Python ML service
│   ├── src/
│   │   ├── main.py
│   │   ├── anomaly_detector.py
│   │   └── websocket_client.py
│   └── requirements.txt
├── frontend/          # React dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── styles/
│   │   └── types/
│   └── package.json
└── README.md
```

## 🎨 UI Preview

The dashboard features:

- **Dark cyberpunk theme** with neon accents
- **Glass morphism** panels
- **Real-time 3D visualization** of orientation
- **Live charts** updating at 30-60 FPS
- **Health monitoring** with color-coded status
- **Anomaly alerts** with dramatic overlays

## 🔧 Configuration

### Backend (Rust)

Edit `backend/src/main.rs`:
```rust
Config {
    ws_port: 8080,
    imu_frequency: 50,  // Hz
    gps_frequency: 1,   // Hz
    filter_alpha: 0.98, // Complementary filter
}
```

### ML Service (Python)

Edit `ml-service/src/main.py`:
```python
MLServiceConfig(
    websocket_url = "ws://127.0.0.1:8080",
    anomaly_threshold = 0.7,
    buffer_size = 50
)
```

### Frontend (React)

Edit `frontend/src/App.tsx`:
```typescript
const WS_URL = 'ws://127.0.0.1:8080'
```

## 🧪 Testing

### Test Anomaly Detection

1. Launch all services
2. Open dashboard
3. Click "Accel Spike" or "Gyro Spike"
4. Watch anomaly score increase
5. See alert overlay appear

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Rust** for high-performance systems programming
- **Three.js** for 3D visualization
- **scikit-learn** for ML algorithms
- **Recharts** for beautiful charts

## 🚀 Future Enhancements

Potential additions:
- Extended Kalman Filter (EKF)
- Real hardware sensor integration
- Data recording and playback
- Multiple ML models (prediction, classification)
- Advanced 3D models

---

**Built with ❤️ using Rust, Python, and React**
Happy coding and never stop learning 