# Backend Recheck & Improvements Walkthrough

I've thoroughly reviewed the `Model` folder and implemented several critical fixes to make the backend production-ready and "100% functional" for the PERA-SAM project.

## 🛠 Features & Fixes

### 1. Multi-Machine Support
| Feature | Previous State | Current State |
| :--- | :--- | :--- |
| **Model Loading** | Only the first `.h5` file was loaded. | All models in `assets/` are loaded into a dictionary keyed by Machine ID. |
| **Endpoint Selection** | Always used the same single model. | Uses the model that matches the `machine_id` parameter (defaults to the first if not specified). |
| **Model Registry** | Hardcoded filename `fan_anomaly_detector.h5`. | Dynamically discovers all models like `model_fan_id_00_dataset.h5`. |

### 2. Audio Processing Pipeline
The preprocessing now follows the official MIMII baseline logic more closely, ensuring the input to the Autoencoder is consistent.
- **Library**: Switched to `librosa.power_to_db` for more stable log-scaling.
- **Normalization**: Added `[0, 1]` range scaling per file, which is crucial for Autoencoder reconstruction accuracy.
- **Frame Concatenation**: Verified the sliding window (5 frames) logic for flat-vector inputs (320 dimensions).

### 3. Server Robustness
- **Unique Temp Files**: Used `uuid` to generate temp filenames. This prevents "File in use" errors and ensures that concurrent uploads don't overwrite each other.
- **Port Flexibility**: The server now checks for a `PORT` environment variable, making it easier to deploy to cloud providers.
- **Metadata Output**: The `/analyze` response now explicitly returns the `machine_id` used and the `health_percentage`.

## 🚀 How to Run the Backend

### Step 1: Install Dependencies
Open your terminal in `d:/test/Model/server` and run:
```bash
pip install -r requirements.txt
```

### Step 2: Start the Server
```bash
python main.py
```

### Step 3: Test an Analysis
You can now test the analysis by specifying a machine ID (e.g., 04):
`POST http://localhost:8000/analyze?machine_id=04`

## ⚙️ Key File Changes

- [main.py](file:///d:/test/Model/server/main.py): Added query param support and refined file handling.
- [inference.py](file:///d:/test/Model/server/inference.py): Implemented a model registry and standardized preprocessing.

> [!WARNING]
> Please ensure that all your `.h5` models in `assets/` are trained with the same architecture (e.g., Dense Autoencoder with 320 inputs). If some are Convolutional (128x128), you will need to standardize them to one architecture.
