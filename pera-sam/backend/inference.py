import librosa
import numpy as np
import tensorflow as tf
import os
import sys
import glob
import yaml
import json

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
        """Loads model performance metrics and calibrated thresholds."""
        metrics_path = os.path.join(ASSETS_DIR, "metrics.yaml")
        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, 'r') as f:
                    self.metrics = yaml.safe_load(f)
                print(f"Metrics loaded from {metrics_path}")
            except Exception as e:
                print(f"Error loading metrics: {e}")

    def load_all_models(self):
        """Loads all .h5 models found in the assets directory."""
        h5_files = glob.glob(os.path.join(ASSETS_DIR, "*.h5"))

        if not h5_files:
            print(f"Warning: No .h5 models found in {ASSETS_DIR}")
            return

        for model_path in h5_files:
            filename = os.path.basename(model_path)
            try:
                # Naming pattern: model_CATEGORY_id_ID_dataset.h5
                # e.g., model_fan_id_00_dataset.h5
                parts = filename.split('_')
                if len(parts) >= 4:
                    category = parts[1]    # "fan"
                    machine_id = parts[3]  # "00"

                    if category not in self.models:
                        self.models[category] = {}

                    self.models[category][machine_id] = tf.keras.models.load_model(model_path)
                    print(f"Model loaded: Category={category}, ID={machine_id} ({filename})")
                else:
                    self.models["default"] = tf.keras.models.load_model(model_path)
                    print(f"Default model loaded: {filename}")
            except Exception as e:
                print(f"Error loading model {filename}: {e}")

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
        # DIRECT MODE: If machine_id is given → use ONLY that model (calibrated path).
        # AUTO-DETECT MODE: scan all models in category → pick lowest MSE (fallback).
        used_id = "unknown"
        mse_frames = np.array([0.0])
        anomaly_score = float('inf')

        models_in_category = self.models.get(category or "", {})

        if machine_id and machine_id in models_in_category:
            # === DIRECT MODE ===
            model_obj = models_in_category[machine_id]
            reconstructed = model_obj.predict(vectors, verbose=0)
            mse_frames = np.mean(np.square(vectors - reconstructed), axis=1)
            anomaly_score = float(np.mean(mse_frames))
            used_id = machine_id

        elif models_in_category:
            # === SMART AUTO-DETECT MODE (v2) ===
            # We look for the model that "claims" the sound with the most confidence.
            # Confidence is higher if the sound is well below the threshold AND
            # has no high-error frame spikes.
            
            best_id_match = None
            best_rank_score = float('inf') 
            best_mse_frames = None
            best_avg_mse = 0
            
            for mid, mobj in models_in_category.items():
                reconstructed = mobj.predict(vectors, verbose=0)
                frame_mse = np.mean(np.square(vectors - reconstructed), axis=1)
                avg_mse = float(np.mean(frame_mse))
                max_mse = float(np.max(frame_mse))
                
                m_key = f"{category}_id_{mid}_dataset"
                m_threshold = 10.0
                m_auc = 0.5
                if m_key in self.metrics:
                    m_threshold = self.metrics[m_key].get('threshold', 10.0)
                    m_auc = self.metrics[m_key].get('AUC', 0.5)
                
                # Rank Score: 
                # 1. Lower is better
                # 2. We use (avg_mse / threshold) as the base
                # 3. We add a penalty for high max_mse relative to the average
                # 4. We favor models with higher AUC (reliability)
                
                normalized_avg = avg_mse / m_threshold
                normalized_max = max_mse / (m_threshold * 3.0) # frames are noisier than averages
                
                # Penalty for models that are "too loose" (low AUC)
                auc_penalty = 1.0 + (1.0 - m_auc) * 0.5 # AUC 0.6 -> 1.2x penalty; AUC 0.98 -> 1.01x
                
                rank_score = (normalized_avg + normalized_max) * auc_penalty
                
                if rank_score < best_rank_score:
                    best_rank_score = rank_score
                    best_id_match = mid
                    best_mse_frames = frame_mse
                    best_avg_mse = avg_mse
            
            used_id = best_id_match
            mse_frames = best_mse_frames
            anomaly_score = best_avg_mse

        elif "default" in self.models:
            model_obj = self.models["default"]
            reconstructed = model_obj.predict(vectors, verbose=0)
            mse_frames = np.mean(np.square(vectors - reconstructed), axis=1)
            anomaly_score = float(np.mean(mse_frames))
            used_id = "default"

        else:
            return {
                "status": "No Model",
                "message": f"No models found for category '{category}'"
            }

        used_category = category or "unknown"

        # --- 3. Load calibrated threshold and AUC for that specific model ---
        model_auc = 0.0
        calibrated_threshold = None
        metric_key = f"{used_category}_id_{used_id}_dataset"
        if metric_key in self.metrics:
            model_auc = self.metrics[metric_key].get('AUC', 0.0)
            calibrated_threshold = self.metrics[metric_key].get('threshold', None)

        reliability = "High" if model_auc > 0.85 else "Medium" if model_auc > 0.7 else "Low (Generic Pattern)"
        if used_id == "default":
            reliability = "Standard (General Purpose)"

        # --- 4. Apply calibrated threshold (data-driven, not guessed) ---
        if calibrated_threshold is not None:
            # Small AUC-based adjustment (±15%): high AUC tightens, low AUC loosens slightly
            if model_auc > 0:
                auc_adjust = 1.0 + (0.5 - model_auc) * 0.3
                threshold = calibrated_threshold * max(0.85, min(1.15, auc_adjust))
            else:
                threshold = calibrated_threshold
        else:
            # Fallback: safe conservative default based on empirical data
            threshold = 10.0

        # --- 5. Classify and compute health score ---
        is_anomaly = anomaly_score > threshold
        is_warning = anomaly_score > (threshold * 0.8) and not is_anomaly

        if anomaly_score < (threshold * 0.8):
            health_score = 100 - (anomaly_score / (threshold * 0.8) * 15)
        elif not is_anomaly:
            health_score = 85 - ((anomaly_score - threshold * 0.8) / (threshold * 0.2) * 15)
        else:
            health_score = max(0, 70 - ((anomaly_score - threshold) / threshold * 70))

        status_label = "Anomaly" if is_anomaly else "Warning" if is_warning else "Normal"
        engine_health = "Critical" if is_anomaly else "Degrading" if is_warning else "Good"
        recommendation = (
            "URGENT: Machine failure imminent. Stop operation immediately." if is_anomaly else
            "CAUTION: Unusual patterns detected. Schedule maintenance soon." if is_warning else
            "Healthy: Machine operating within normal parameters."
        )

        return {
            "status": status_label,
            "score": float(anomaly_score),
            "max_frame_error": float(np.max(mse_frames)),
            "min_frame_error": float(np.min(mse_frames)),
            "threshold_used": round(float(threshold), 2),
            "health_percentage": round(float(health_score), 2),
            "engine_health": engine_health,
            "recommendation": recommendation,
            "machine_id": used_id,
            "machine_category": used_category,
            "model_auc": float(model_auc) if model_auc > 0 else 0.0,
            "detection_reliability": reliability,
            "baseline_compliant": True,
            "model_used": f"{used_category}_id_{used_id}",
        }
