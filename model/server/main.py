"""
main.py  –  PERA-SAM ML Backend
=================================
Single entry point: python main.py

Startup sequence (automatic):
  1. Load config.yaml
  2. Check if models exist in assets/
  3. If auto_train=true and models missing → run trainer
  4. Load models into SoundAnalyzer
  5. Start FastAPI server on configured port

No manual steps required. Just run: python main.py
"""
import os
import sys
import logging
import shutil
import uuid
import yaml

from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ─── Paths ────────────────────────────────────────────────────────────────────
SERVER_DIR  = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SERVER_DIR, "config.yaml")
ASSETS_DIR  = os.path.join(SERVER_DIR, "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(SERVER_DIR, "server.log"), mode="a"),
    ],
)
log = logging.getLogger("main")

# ─── Load config ──────────────────────────────────────────────────────────────
def load_config():
    if not os.path.exists(CONFIG_PATH):
        log.warning(f"config.yaml not found at {CONFIG_PATH} – using defaults")
        return {
            "dataset": {"base_directory": "../../mimii_baseline/dataset",
                        "noise_level": "0dB",
                        "pickle_directory": "../../mimii_baseline/pickle"},
            "feature": {"n_mels": 64, "frames": 5, "n_fft": 1024,
                        "hop_length": 512, "power": 2.0},
            "training": {"epochs": 50, "batch_size": 512, "shuffle": True,
                         "validation_split": 0.1, "calibration_files": 30},
            "server": {"host": "0.0.0.0", "port": 8000, "auto_train": True},
        }
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


# ─── Startup / shutdown lifecycle ─────────────────────────────────────────────
analyzer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global analyzer
    config = load_config()

    # ── Step 1: Auto-train if needed ──────────────────────────────────────────
    auto_train = config.get("server", {}).get("auto_train", True)
    if auto_train:
        try:
            from trainer import MIMIITrainer
            trainer = MIMIITrainer(config, ASSETS_DIR)
            if trainer.needs_training():
                log.info("+-------------------------------------------------+")
                log.info("| MISSING MODELS DETECTED - STARTING TRAINING     |")
                log.info("| This may take several minutes...                 |")
                log.info("+-------------------------------------------------+")
                trainer.run()
            else:
                log.info("[OK] All models present - skipping training")
        except Exception as e:
            log.warning(f"Trainer error (non-fatal): {e}")
            log.warning("Continuing with existing models in assets/")

    # --- Step 2: Load inference engine -----------------------------------------
    from inference import SoundAnalyzer
    analyzer = SoundAnalyzer()
    model_count = sum(len(ids) for ids in analyzer.models.values() if isinstance(ids, dict))
    log.info(f"[OK] Inference engine ready - {model_count} model(s) loaded")

    yield  # <- server is running

    log.info("Shutting down PERA-SAM ML Backend")


# ─── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="PERA-SAM ML Backend",
    description="Sound anomaly detection API powered by MIMII-trained autoencoders",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://proud-glacier-05c9fb600.7.azurestaticapps.net"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/", summary="API Status")
async def root():
    model_count = sum(len(ids) for ids in analyzer.models.values() if isinstance(ids, dict)) if analyzer else 0
    return {
        "status": "Online",
        "message": "PERA-SAM ML Sound Analysis API",
        "version": "2.0.0",
        "models_loaded": model_count,
        "capabilities": [
            "Auto-Train on Startup",
            "Anomaly Detection",
            "Per-Model Calibrated Thresholds",
            "Health Scoring",
            "Multi-Machine Identification",
        ],
    }


@app.get("/models", summary="Available Models")
async def get_models():
    """Returns all available machine categories and their associated IDs."""
    if not analyzer:
        return {"categories": {}, "metrics_available": []}

    model_structure = {}
    for category, ids in analyzer.models.items():
        if category == "default":
            model_structure["default"] = ["Standard"]
        else:
            model_structure[category] = list(ids.keys())

    return {
        "categories": model_structure,
        "metrics_available": list(analyzer.metrics.keys()),
    }


@app.post("/analyze", summary="Analyze Audio File")
async def analyze_sound(
    file: UploadFile = File(...),
    category: str = Form(None),
    machine_id: str = Form(None),
):
    """Upload a WAV file and get an anomaly detection result."""
    if not analyzer:
        return {"status": "Error", "message": "Inference engine not initialised"}

    # Save uploaded file temporarily
    temp_id   = str(uuid.uuid4())[:8]
    temp_path = os.path.join(SERVER_DIR, f"_tmp_{temp_id}_{file.filename}")

    try:
        with open(temp_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        result = analyzer.predict(temp_path, category=category, machine_id=machine_id)

        return {
            "filename": file.filename,
            "category_requested": category,
            "machine_id_requested": machine_id,
            "analysis": result,
        }
    except Exception as e:
        log.exception(f"Analysis failed for {file.filename}")
        return {"status": "Error", "message": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/health", summary="Health Check")
async def health():
    """Simple health check endpoint for load balancers / frontend polling."""
    return {"status": "ok"}


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    config = load_config()
    host = config.get("server", {}).get("host", "0.0.0.0")
    port = int(os.environ.get("PORT", config.get("server", {}).get("port", 8000)))

    log.info("======================================================")
    log.info("         PERA-SAM ML Backend v2.0                    ")
    log.info("   python main.py  -> handles everything              ")
    log.info("======================================================")
    log.info(f"Starting on http://{host}:{port}")

    uvicorn.run(app, host=host, port=port)
