# 🔊 PERA-SAM — ML Backend (Model Directory)

> **Sound Anomaly Detection API** powered by MIMII-trained autoencoder models.  
> Built with **FastAPI + TensorFlow/Keras + Librosa**.

---

## 📁 Directory Structure

```
Model/
├── start_server.bat          ← One-click launcher for Windows
├── .venv/                    ← Python virtual environment (not committed to Git)
└── server/
    ├── main.py               ← FastAPI application entry point
    ├── trainer.py            ← Autoencoder training pipeline
    ├── inference.py          ← Sound analysis & anomaly detection engine
    ├── config.yaml           ← All configurable settings (paths, hyperparameters)
    ├── requirements.txt      ← Python package dependencies
    ├── Dockerfile            ← Container configuration for deployment
    ├── server.log            ← Auto-generated runtime log file
    ├── _test_unified.py      ← Integration test (config + trainer + inference)
    ├── _test_autodetect.py   ← Auto-detection unit test
    └── assets/               ← Trained model files & metrics (auto-populated)
        ├── model_fan_id_00_dataset.h5
        ├── model_fan_id_02_dataset.h5
        ├── model_fan_id_04_dataset.h5
        ├── model_fan_id_06_dataset.h5
        └── metrics.yaml      ← AUC scores & calibrated thresholds per model
```

---

## ⚙️ How It Works — System Overview

The backend is a fully **self-contained ML inference server**. On startup it automatically checks for trained models, trains them if missing, then serves a REST API for real-time sound anomaly detection.

```
Startup Sequence (python main.py)
─────────────────────────────────
1. Load config.yaml
2. Check if .h5 model files exist in assets/
3. If auto_train=true and models are missing → run trainer.py to train them
4. Load all trained models into the SoundAnalyzer (inference.py)
5. Start FastAPI server on the configured port (default: 8000)
```

No manual steps are required — **just run `python main.py`** and everything is handled automatically.

---

## 📄 File Descriptions

### `main.py` — FastAPI Application Entry Point

The single entry point for the entire backend. Responsibilities:

- **Loads** `config.yaml` on startup.
- **Triggers training** via `MIMIITrainer` if `auto_train=true` and model `.h5` files are absent.
- **Initialises** the `SoundAnalyzer` inference engine with all available models.
- **Serves** the REST API with four endpoints (see [API Endpoints](#-api-endpoints) below).
- **Logs** all activity to both the console and `server.log`.

```python
# Entry point
python main.py
```

---

### `trainer.py` — Autoencoder Training Pipeline

Handles the full model training workflow, extracted and adapted from the [Hitachi MIMII baseline](https://github.com/MIMII-hitachi/mimii_baseline).

**What it does, step by step:**

| Step | Action |
|------|--------|
| 1 | Scans the MIMII dataset directory for all machine types and IDs |
| 2 | Extracts **log-mel spectrogram** features from `.wav` files |
| 3 | Caches extracted feature vectors as `.pickle` files to speed up future re-training |
| 4 | Builds and trains a **5-layer dense autoencoder** using Keras |
| 5 | Saves the full trained model as `.h5` into `assets/` |
| 6 | **Calibrates anomaly thresholds** from real normal/abnormal audio |
| 7 | Updates `assets/metrics.yaml` with AUC scores and thresholds |

**Autoencoder Architecture:**

```
Input (320-dim)  →  Dense(64, ReLU)  →  Dense(64, ReLU)  →  Dense(8, ReLU)
                 →  Dense(64, ReLU)  →  Dense(64, ReLU)  →  Output (320-dim)
```

> The input dimension of **320** = `n_mels (64) × n_frames (5)`.  
> The model learns to reconstruct *normal* machine sounds. High reconstruction error → anomaly.

**Threshold Calibration Logic:**

- After training, a set of normal and abnormal `.wav` files are scored.
- If ranges don't overlap: `threshold = midpoint(max_normal, min_abnormal)`
- If ranges overlap: `threshold = mean(normal_scores) + 2 × std(normal_scores)`
- AUC is computed using `sklearn.metrics.roc_auc_score` and saved to `metrics.yaml`.

---

### `inference.py` — Sound Analysis & Anomaly Detection Engine

The `SoundAnalyzer` class is the core prediction engine. It:

1. **Loads** all `.h5` model files from `assets/` on initialization.
2. **Preprocesses** incoming `.wav` audio into log-mel feature vectors (identical formula to MIMII baseline).
3. **Runs prediction** using one of two modes:

#### Prediction Modes

| Mode | Trigger | Behaviour |
|------|---------|-----------|
| **Direct Mode** | `machine_id` is provided | Uses only the specified machine's model. Fast and accurate. |
| **Smart Auto-Detect Mode** | `machine_id=None` | Runs all models in a category and picks the best match using a rank score. |

**Smart Auto-Detect Rank Score Formula:**

```
rank_score = (normalized_avg_mse + normalized_max_mse) × auc_penalty
```

- `normalized_avg_mse = avg_mse / threshold` — how far the score is from the threshold
- `normalized_max_mse = max_mse / (threshold × 3)` — penalises spiky, noisy predictions
- `auc_penalty = 1.0 + (1.0 - AUC) × 0.5` — penalises models that were less reliable in calibration

The model with the **lowest rank score** is selected as the best matching machine.

#### Output Response Fields

```json
{
  "status": "Normal | Warning | Anomaly",
  "score": 4.217,
  "threshold_used": 8.35,
  "health_percentage": 93.7,
  "engine_health": "Good | Degrading | Critical",
  "recommendation": "Healthy: Machine operating within normal parameters.",
  "machine_id": "06",
  "machine_category": "fan",
  "model_auc": 0.923,
  "detection_reliability": "High | Medium | Low (Generic Pattern)",
  "baseline_compliant": true,
  "model_used": "fan_id_06"
}
```

---

### `config.yaml` — Configuration File

Controls all runtime behaviour. Edit this file to adjust paths, training hyperparameters, and server settings.

```yaml
dataset:
  base_directory: ../../mimii_baseline/dataset   # Path to MIMII dataset root
  noise_level: 0dB                               # Noise level subfolder to use
  pickle_directory: ../../mimii_baseline/pickle  # Cache for preprocessed vectors

feature:
  n_mels: 64        # Mel filter banks
  frames: 5         # Sliding window size (5 frames stacked = 320-dim input)
  n_fft: 1024       # FFT window size
  hop_length: 512   # Hop length between frames
  power: 2.0        # Power for mel spectrogram

training:
  epochs: 50
  batch_size: 512
  shuffle: true
  validation_split: 0.1
  calibration_files: 30   # Files used for threshold calibration per model

server:
  host: "0.0.0.0"
  port: 8000
  auto_train: true    # Set to false in production if models already exist
```

---

### `assets/` — Trained Models & Metrics

This folder is **auto-populated** by the trainer. Do not edit manually.

| File | Description |
|------|-------------|
| `model_fan_id_00_dataset.h5` | Trained autoencoder for Fan machine, ID 00 |
| `model_fan_id_02_dataset.h5` | Trained autoencoder for Fan machine, ID 02 |
| `model_fan_id_04_dataset.h5` | Trained autoencoder for Fan machine, ID 04 |
| `model_fan_id_06_dataset.h5` | Trained autoencoder for Fan machine, ID 06 |
| `metrics.yaml` | AUC scores and calibrated anomaly thresholds per model |

**Model naming convention:**
```
model_{machine_type}_id_{machine_id}_dataset.h5
```

---

### `_test_autodetect.py` — Auto-Detection Test Script

Tests the **Smart Auto-Detect Mode** of the inference engine by passing `machine_id=None`.  
Verifies that the system automatically identifies the correct machine ID from audio alone.

```bash
python _test_autodetect.py
```

Expected output:
```
Normal id_06 (should detect 06)    : Detected=06  Status=Normal    Score=3.412  Threshold=8.35
Abnormal id_06 (should detect 06)  : Detected=06  Status=Anomaly   Score=14.78  Threshold=8.35
...
```

---

### `_test_unified.py` — Integration Test Script

Runs a comprehensive integration test covering:
1. **Config loading** — verifies `config.yaml` parses correctly
2. **Trainer initialization** — checks dataset paths resolve
3. **Inference engine** — loads all models and counts them
4. **Quick prediction** — runs a direct-mode prediction on a known file

```bash
python _test_unified.py
```

---

### `Dockerfile` — Container Configuration

Enables the backend to run in a Docker container for cloud deployment.

```dockerfile
FROM python:3.9-slim
WORKDIR /app
# Installs system libs for librosa (libsndfile, build-essential)
# Installs Python deps from requirements.txt
# Exposes port 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build and run:**
```bash
docker build -t pera-sam-backend ./server
docker run -p 8000:8000 pera-sam-backend
```

---

### `start_server.bat` — Windows One-Click Launcher

A Windows batch script that:
1. Looks for the virtual environment at `.venv\Scripts\python.exe`
2. Shows a clear error message if the venv is not set up yet
3. Sets `PYTHONIOENCODING=utf-8` to prevent Unicode log errors
4. Runs `server/main.py` with the venv Python

**Usage:** Double-click `start_server.bat` or run from the terminal.

---

## 🚀 Quick Start

### 1. Set Up Virtual Environment

```bash
cd Model
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r server\requirements.txt
```

### 2. Configure Dataset Path

Edit `server/config.yaml` and set `dataset.base_directory` to point to your MIMII dataset:

```yaml
dataset:
  base_directory: ../../mimii_baseline/dataset
```

### 3. Start the Server

**Option A — Windows (double-click or run):**
```bash
start_server.bat
```

**Option B — Manual:**
```bash
.venv\Scripts\python.exe server/main.py
```

**Option C — Docker:**
```bash
docker build -t pera-sam-backend ./server
docker run -p 8000:8000 pera-sam-backend
```

The server will auto-train any missing models on its first run.

---

## 🌐 API Endpoints

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/`       | API status, version, loaded model count |
| `GET`  | `/health` | Simple health check (for load balancers) |
| `GET`  | `/models` | Lists all available machine categories and IDs |
| `POST` | `/analyze`| Upload a WAV file and get anomaly detection result |

### `POST /analyze` — Audio Analysis

Upload a `.wav` audio file for analysis.

**Form fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | WAV file | ✅ | The audio to analyse |
| `category` | string | ❌ | Machine type (e.g. `fan`) |
| `machine_id` | string | ❌ | Specific machine ID (e.g. `06`). Omit for auto-detect. |

**Example (curl):**
```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@recording.wav" \
  -F "category=fan"
```

**Example (auto-detect, no machine_id):**
```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@recording.wav" \
  -F "category=fan"
```

**Example (direct mode, specific machine):**
```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@recording.wav" \
  -F "category=fan" \
  -F "machine_id=06"
```

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi` | REST API framework |
| `uvicorn` | ASGI server to serve FastAPI |
| `python-multipart` | File upload support for FastAPI |
| `tensorflow` / `keras` | Autoencoder training and inference |
| `librosa` | Audio loading and mel-spectrogram extraction |
| `numpy` | Numerical operations on feature vectors |
| `scikit-learn` | AUC calculation during threshold calibration |
| `PyYAML` | Config and metrics file parsing |
| `tqdm` | Progress bars during training |
| `matplotlib` | Plotting (optional, available for analysis) |
| `requests` | HTTP client (available for utility scripts) |

---

## 🔬 MIMII Dataset Compatibility

This backend is designed to work with the **[MIMII Dataset](https://zenodo.org/record/3384388)** (Malfunctioning Industrial Machine Investigation and Inspection).

Expected dataset directory structure:
```
mimii_baseline/
└── dataset/
    └── 0dB/
        └── 0_dB_fan/
            └── fan/
                ├── id_00/
                │   ├── normal/       ← Normal .wav files for training
                │   └── abnormal/     ← Abnormal .wav files for calibration
                ├── id_02/
                ├── id_04/
                └── id_06/
```

---

## 📝 Logs

All server activity is logged to two places simultaneously:
- **Console** (stdout) — visible while the server is running
- **`server/server.log`** — persistent log file, appends on each run

Log format:
```
2025-04-24 19:00:01,234 [INFO] main: [OK] Inference engine ready - 4 model(s) loaded
```

---

## 🏗️ Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend / Client                     │
│              (React App or any HTTP client)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │  HTTP POST /analyze (WAV file)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     main.py  (FastAPI)                       │
│  • Startup: auto-trains missing models via trainer.py        │
│  • Routes audio uploads to SoundAnalyzer                     │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐      ┌───────────────────────────────┐
│     trainer.py        │      │        inference.py            │
│  MIMIITrainer         │      │      SoundAnalyzer             │
│  • Feature extract    │      │  • Log-mel preprocessing       │
│  • Autoencoder train  │      │  • Direct / Auto-Detect mode   │
│  • Threshold calib.   │      │  • Health scoring + status     │
│  • Saves → assets/    │      │  • Calibrated thresholds       │
└──────────────────────┘      └───────────────┬───────────────┘
                                               │
                                               ▼
                               ┌───────────────────────────┐
                               │        assets/             │
                               │  *.h5 model files          │
                               │  metrics.yaml              │
                               └───────────────────────────┘
```
