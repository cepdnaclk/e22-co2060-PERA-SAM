import librosa
import numpy as np
import tensorflow as tf
import os
import sys
import re
import glob
import yaml
import json

# ── All categories this system supports (for frontend discovery) ───────────────
SUPPORTED_CATEGORIES = {
    "fan":             {"label": "Industrial Fan",    "ids": ["00", "02", "04", "06"]},
    "pump":            {"label": "Industrial Pump",   "ids": ["00", "02", "04", "06"]},
    "slider":          {"label": "Slide Rail",        "ids": ["00", "02", "04", "06"]},
    "valve":           {"label": "Industrial Valve",  "ids": ["00", "02", "04", "06"]},
    "vehicle_bearing": {"label": "Vehicle Bearing",   "ids": ["00"]},
}

# Base path for assets
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")

class SoundAnalyzer:
    def __init__(self):
        # Baseline Parameters from Hitachi MIMII
        self.n_mels = 64
        self.n_fft = 1024
        self.hop_length = 512
        self.n_frames = 5  # Sliding window of 5 frames used as model input

        self.models = {}
        self.metrics = {}
        self.load_all_models()
        self.load_metrics()

    def load_metrics(self):
        """Loads model performance metrics and calibrated thresholds from all metrics.yaml files in assets."""
        metrics_files = glob.glob(os.path.join(ASSETS_DIR, "**", "metrics.yaml"), recursive=True)
        main_path = os.path.join(ASSETS_DIR, "metrics.yaml")
        if main_path not in metrics_files and os.path.exists(main_path):
            metrics_files.append(main_path)

        for metrics_path in metrics_files:
            try:
                with open(metrics_path, 'r') as f:
                    data = yaml.safe_load(f)
                    if data and isinstance(data, dict):
                        self.metrics.update(data)
                print(f"[OK] Metrics loaded from {metrics_path}")
            except Exception as e:
                print(f"[WARN] Error loading metrics from {metrics_path}: {e}")

    def load_all_models(self):
        """Loads all .h5 models found in the assets directory and any subdirectories.

        Filename convention:
            model_{CATEGORY}_id_{ID}_dataset.h5
        Examples:
            model_fan_id_00_dataset.h5             → category="fan",            id="00"
            model_pump_id_02_dataset.h5            → category="pump",           id="02"
            model_slider_id_04_dataset.h5          → category="slider",         id="04"
            model_valve_id_06_dataset.h5           → category="valve",          id="06"
            model_vehicle_bearing_id_00_dataset.h5 → category="vehicle_bearing", id="00"

        The regex anchors on the literal '_id_' separator and '_dataset' suffix
        so compound category names with underscores are captured correctly.
        """
        pattern  = re.compile(r'^model_(.+)_id_(\d+)_dataset\.h5$', re.IGNORECASE)
        # Search directly in ASSETS_DIR and recursively in subdirectories (e.g. pera_sam_models/)
        h5_files = sorted(glob.glob(os.path.join(ASSETS_DIR, "**", "*.h5"), recursive=True))

        if not h5_files:
            print(f"[WARN] No .h5 models found in {ASSETS_DIR}. Fallback mode active.")
            return

        loaded_keys = set()
        for model_path in h5_files:
            filename = os.path.basename(model_path)
            m = pattern.match(filename)
            try:
                if m:
                    category   = m.group(1)  # e.g. "fan", "pump", "slider", "valve", "vehicle_bearing"
                    machine_id = m.group(2)  # e.g. "00"
                    key = (category, machine_id)
                    if key in loaded_keys:
                        continue
                    loaded_keys.add(key)

                    if category not in self.models:
                        self.models[category] = {}

                    try:
                        model_obj = tf.keras.models.load_model(model_path, compile=False)
                    except Exception:
                        model_obj = tf.keras.models.load_model(model_path)
                    self.models[category][machine_id] = model_obj
                    print(f"[OK] Model loaded: Category={category}, ID={machine_id} ({filename})")
                else:
                    if "default" not in self.models:
                        try:
                            def_model = tf.keras.models.load_model(model_path, compile=False)
                        except Exception:
                            def_model = tf.keras.models.load_model(model_path)
                        self.models["default"] = def_model
                        print(f"[OK] Default/fallback model loaded: {filename}")
            except Exception as e:
                print(f"[WARN] Error loading model {filename}: {e}")

    def get_supported_categories(self):
        """Return all supported categories with their model availability status."""
        result = {}
        for cat_id, cat_info in SUPPORTED_CATEGORIES.items():
            has_dedicated = cat_id in self.models and isinstance(self.models[cat_id], dict)
            has_fallback  = "default" in self.models or bool(self.models)
            result[cat_id] = {
                "label":               cat_info["label"],
                "ids":                 cat_info["ids"],
                "has_dedicated_model": has_dedicated,
                "status":              "calibrated" if has_dedicated else ("fallback" if has_fallback else "unavailable"),
            }
        return result

    def _preprocess(self, file_path):
        """Convert audio file to feature vectors matching MIMII baseline.py preprocessing."""
        y, sr = librosa.load(file_path, sr=None, mono=False)
        # Handle multi-channel: take channel 0 (same as demux_wav in baseline.py)
        if y.ndim > 1:
            y = y[0, :]

        # Mel spectrogram with power=2.0 (same as baseline.py)
        mel_spectrogram = librosa.feature.melspectrogram(
            y=y, sr=sr,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            n_mels=self.n_mels,
            power=2.0
        )

        # EXACT same log formula as baseline.py line 220:
        # 20.0 / power * log10(mel + epsilon) with power=2.0 → 10 * log10(mel + eps)
        log_mel_spectrogram = 20.0 / 2.0 * np.log10(
            mel_spectrogram + sys.float_info.epsilon
        )

        num_frames = log_mel_spectrogram.shape[1]
        vector_array_size = num_frames - self.n_frames + 1
        if vector_array_size <= 0:
            raise ValueError("Audio too short for analysis")

        vectors = np.zeros((vector_array_size, self.n_mels * self.n_frames))
        for t in range(self.n_frames):
            vectors[:, self.n_mels * t: self.n_mels * (t + 1)] = \
                log_mel_spectrogram[:, t: t + vector_array_size].T
        return vectors

    def predict(self, file_path, category=None, machine_id=None):
        # --- 1. Preprocess audio ---
        try:
            vectors = self._preprocess(file_path)
        except Exception as e:
            return {"status": "Error", "message": f"Processing failed: {str(e)}"}

        # --- 2. Select and run the appropriate model ---
        # Priority order:
        #   1. Direct: exact category + machine_id match (calibrated, fastest)
        #   2. Auto-detect: all IDs in the requested category → pick best
        #   3. Cross-category fallback: use fan/pump/slider models if the
        #      requested category has no dedicated model yet (returns warning)
        #   4. Default: catch-all generic model
        #   5. No model at all → error with training instructions

        used_id       = "unknown"
        used_category = category or "unknown"
        mse_frames    = np.array([0.0])
        anomaly_score = float('inf')
        fallback_mode = None

        models_in_category = self.models.get(category or "", {})

        if machine_id and machine_id in models_in_category:
            # === DIRECT MODE ===
            model_obj     = models_in_category[machine_id]
            reconstructed = model_obj.predict(vectors, verbose=0)
            mse_frames    = np.mean(np.square(vectors - reconstructed), axis=1)
            anomaly_score = float(np.mean(mse_frames))
            used_id       = machine_id

        elif models_in_category:
            # === SMART AUTO-DETECT MODE ===
            # Pick the model that "claims" the sound with most confidence (lowest rank score).
            best_id_match   = None
            best_rank_score = float('inf')
            best_mse_frames = None
            best_avg_mse    = 0

            for mid, mobj in models_in_category.items():
                reconstructed = mobj.predict(vectors, verbose=0)
                frame_mse     = np.mean(np.square(vectors - reconstructed), axis=1)
                avg_mse       = float(np.mean(frame_mse))
                max_mse       = float(np.max(frame_mse))

                m_key        = f"{category}_id_{mid}_dataset"
                m_threshold  = 10.0
                m_auc        = 0.5
                if m_key in self.metrics:
                    m_threshold = self.metrics[m_key].get('threshold', 10.0)
                    m_auc       = self.metrics[m_key].get('AUC', 0.5)

                normalized_avg = avg_mse / m_threshold
                normalized_max = max_mse / (m_threshold * 3.0)
                auc_penalty    = 1.0 + (1.0 - m_auc) * 0.5

                rank_score = (normalized_avg + normalized_max) * auc_penalty

                if rank_score < best_rank_score:
                    best_rank_score  = rank_score
                    best_id_match    = mid
                    best_mse_frames  = frame_mse
                    best_avg_mse     = avg_mse

            used_id       = best_id_match
            mse_frames    = best_mse_frames
            anomaly_score = best_avg_mse

        else:
            # === CROSS-CATEGORY FALLBACK ===
            # No dedicated model for the requested category.
            # Try to use any available category's model as a proxy.
            fallback_priority = ["fan", "pump", "slider", "valve"]
            fallback_found = False
            for fb_cat in fallback_priority:
                if fb_cat in self.models and isinstance(self.models[fb_cat], dict):
                    fb_models  = self.models[fb_cat]
                    # Use highest-AUC model in the fallback category
                    best_fb_id  = None
                    best_fb_auc = -1
                    for mid in fb_models:
                        mk  = f"{fb_cat}_id_{mid}_dataset"
                        auc = self.metrics.get(mk, {}).get('AUC', 0.5)
                        if auc > best_fb_auc:
                            best_fb_auc = auc
                            best_fb_id  = mid

                    if best_fb_id is not None:
                        model_obj     = fb_models[best_fb_id]
                        reconstructed = model_obj.predict(vectors, verbose=0)
                        mse_frames    = np.mean(np.square(vectors - reconstructed), axis=1)
                        anomaly_score = float(np.mean(mse_frames))
                        used_id       = best_fb_id
                        used_category = fb_cat
                        fallback_mode = "cross_category"
                        fallback_found = True
                        break

            if not fallback_found:
                # === DEFAULT / GENERIC FALLBACK ===
                if "default" in self.models:
                    model_obj     = self.models["default"]
                    reconstructed = model_obj.predict(vectors, verbose=0)
                    mse_frames    = np.mean(np.square(vectors - reconstructed), axis=1)
                    anomaly_score = float(np.mean(mse_frames))
                    used_id       = "default"
                    fallback_mode = "default"
                else:
                    return {
                        "status":  "No Model",
                        "message": (
                            f"No model available for category '{category}'. "
                            "Train and place .h5 files in model/server/assets/ "
                            "using the cloud_trainer.ipynb notebook."
                        ),
                    }

        # --- 3. Load calibrated threshold and AUC ---
        model_auc            = 0.0
        calibrated_threshold = None
        metric_key           = f"{used_category}_id_{used_id}_dataset"
        if metric_key in self.metrics:
            model_auc            = self.metrics[metric_key].get('AUC', 0.0)
            calibrated_threshold = self.metrics[metric_key].get('threshold', None)

        # --- 4. Determine reliability label ---
        if fallback_mode == "cross_category":
            reliability = "Low (Cross-Category Fallback)"
        elif fallback_mode == "default" or used_id == "default":
            reliability = "Standard (General Purpose)"
        else:
            reliability = "High" if model_auc > 0.85 else "Medium" if model_auc > 0.7 else "Low (Generic Pattern)"

        # --- 5. Apply calibrated threshold ---
        if calibrated_threshold is not None:
            if model_auc > 0:
                auc_adjust = 1.0 + (0.5 - model_auc) * 0.3
                threshold  = calibrated_threshold * max(0.85, min(1.15, auc_adjust))
            else:
                threshold = calibrated_threshold
        else:
            threshold = 10.0

        # --- 6. Classify and compute health score ---
        is_anomaly = anomaly_score > threshold
        is_warning = anomaly_score > (threshold * 0.8) and not is_anomaly

        if anomaly_score < (threshold * 0.8):
            health_score = 100 - (anomaly_score / (threshold * 0.8) * 15)
        elif not is_anomaly:
            health_score = 85 - ((anomaly_score - threshold * 0.8) / (threshold * 0.2) * 15)
        else:
            health_score = max(0, 70 - ((anomaly_score - threshold) / threshold * 70))

        status_label   = "Anomaly" if is_anomaly else "Warning" if is_warning else "Normal"
        engine_health  = "Critical" if is_anomaly else "Degrading" if is_warning else "Good"
        recommendation = (
            "URGENT: Machine failure imminent. Stop operation immediately." if is_anomaly else
            "CAUTION: Unusual patterns detected. Schedule maintenance soon." if is_warning else
            "Healthy: Machine operating within normal parameters."
        )

        result = {
            "status":               status_label,
            "score":                float(anomaly_score),
            "max_frame_error":      float(np.max(mse_frames)),
            "min_frame_error":      float(np.min(mse_frames)),
            "threshold_used":       round(float(threshold), 2),
            "health_percentage":    round(float(health_score), 2),
            "engine_health":        engine_health,
            "recommendation":       recommendation,
            "machine_id":           used_id,
            "machine_category":     used_category,
            "model_auc":            float(model_auc) if model_auc > 0 else 0.0,
            "detection_reliability": reliability,
            "baseline_compliant":   True,
            "model_used":           f"{used_category}_id_{used_id}",
            "fallback_mode":        fallback_mode,
        }

        if fallback_mode == "cross_category":
            result["fallback_note"] = (
                f"No dedicated model for '{category}'. "
                f"Used '{used_category}' (ID {used_id}) as a cross-category proxy. "
                "Accuracy may be reduced. Run cloud_trainer.ipynb to train a dedicated model."
            )
        elif fallback_mode == "default":
            result["fallback_note"] = (
                "No dedicated model available. General-purpose model used. "
                "Run cloud_trainer.ipynb to train a dedicated model for higher accuracy."
            )

        return result

