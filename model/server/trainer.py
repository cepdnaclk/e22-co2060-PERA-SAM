"""
trainer.py  –  PERA-SAM Model Trainer
======================================
Unified training pipeline extracted from Hitachi MIMII baseline.py.

Handles:
  1. Dataset scanning
  2. Feature extraction + pickle caching
  3. Autoencoder training
  4. Full model export → assets/ (not weights-only)
  5. Threshold calibration from real data
  6. metrics.yaml update

All of this is triggered automatically by main.py on startup if models
are missing. You never need to run this file manually.
"""
import os
import sys
import glob
import pickle
import logging
import numpy as np
import yaml

log = logging.getLogger("trainer")

# ─── Autoencoder (same architecture as Hitachi baseline) ─────────────────────
def build_autoencoder(input_dim: int = 320):
    from keras.models import Model
    from keras.layers import Input, Dense
    inp = Input(shape=(input_dim,))
    h   = Dense(64, activation="relu")(inp)
    h   = Dense(64, activation="relu")(h)
    h   = Dense(8,  activation="relu")(h)
    h   = Dense(64, activation="relu")(h)
    h   = Dense(64, activation="relu")(h)
    out = Dense(input_dim, activation=None)(h)
    return Model(inputs=inp, outputs=out)

# ─── Feature extraction (identical formula to baseline.py) ───────────────────
def wav_to_vectors(file_path: str, n_mels=64, n_frames=5, n_fft=1024, hop_length=512, power=2.0):
    import librosa
    try:
        y, sr = librosa.load(file_path, sr=None, mono=False)
        if y.ndim > 1:
            y = y[0, :]
        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=n_fft,
                                              hop_length=hop_length, n_mels=n_mels, power=power)
        log_mel = 20.0 / power * np.log10(mel + sys.float_info.epsilon)
        vsz = log_mel.shape[1] - n_frames + 1
        if vsz < 1:
            return None
        vecs = np.zeros((vsz, n_mels * n_frames))
        for t in range(n_frames):
            vecs[:, n_mels * t: n_mels * (t + 1)] = log_mel[:, t: t + vsz].T
        return vecs
    except Exception as e:
        log.warning(f"Failed to process {file_path}: {e}")
        return None


def list_to_vectors(file_list, n_mels=64, n_frames=5, n_fft=1024, hop_length=512, power=2.0):
    """Convert a list of wav files to a single stacked numpy array."""
    all_vecs = []
    for f in file_list:
        v = wav_to_vectors(f, n_mels, n_frames, n_fft, hop_length, power)
        if v is not None:
            all_vecs.append(v)
    if not all_vecs:
        return np.empty((0, n_mels * n_frames))
    return np.concatenate(all_vecs, axis=0)


# ─── Trainer class ────────────────────────────────────────────────────────────
class MIMIITrainer:
    def __init__(self, config: dict, assets_dir: str):
        self.config = config
        self.assets_dir = assets_dir
        self.feat = config["feature"]
        self.train_cfg = config["training"]

        # Resolve dataset path relative to assets_dir
        raw_base = config["dataset"]["base_directory"]
        if not os.path.isabs(raw_base):
            raw_base = os.path.normpath(os.path.join(assets_dir, "..", raw_base))
        self.base_dir = raw_base

        raw_pickle = config["dataset"].get("pickle_directory", "../../mimii_baseline/pickle")
        if not os.path.isabs(raw_pickle):
            raw_pickle = os.path.normpath(os.path.join(assets_dir, "..", raw_pickle))
        self.pickle_dir = raw_pickle
        os.makedirs(self.pickle_dir, exist_ok=True)

        self.noise_level = config["dataset"].get("noise_level", "0dB")
        self.cal_files   = self.train_cfg.get("calibration_files", 30)

    # ── Internal helpers ──────────────────────────────────────────────────────
    def _machine_dirs(self):
        """Find all machine ID directories in the dataset tree.
        
        Dataset structure: {base}/{noise_level}/{db_folder}/{machine_type}/{id_folder}/
        e.g. dataset/0dB/0_dB_fan/fan/id_00/
        Returns list of (machine_type, machine_id_short, full_path).
        """
        pattern = os.path.join(self.base_dir, self.noise_level, "*", "*", "*")
        dirs = sorted(glob.glob(pattern))
        results = []
        for d in dirs:
            machine_type = os.path.basename(os.path.dirname(d))   # "fan"
            id_folder    = os.path.basename(d)                     # "id_00"
            # Strip 'id_' prefix to get just the numeric ID
            machine_id   = id_folder.replace("id_", "", 1)        # "00"
            results.append((machine_type, machine_id, d))
        return results

    def _asset_name(self, machine_type, machine_id):
        return os.path.join(self.assets_dir, f"model_{machine_type}_id_{machine_id}_dataset.h5")

    def _metric_key(self, machine_type, machine_id):
        return f"{machine_type}_id_{machine_id}_dataset"

    # ── Public API ────────────────────────────────────────────────────────────
    def needs_training(self):
        """Returns True if any machine ID is missing its model file."""
        dirs = self._machine_dirs()
        if not dirs:
            log.warning(f"No machine directories found under {self.base_dir}")
            return False
        for machine_type, machine_id, _ in dirs:
            if not os.path.exists(self._asset_name(machine_type, machine_id)):
                return True
        return False

    def run(self):
        """Full training + calibration + export run for all machine IDs."""
        dirs = self._machine_dirs()
        if not dirs:
            log.error(f"Dataset not found at: {self.base_dir}")
            log.error("Update dataset.base_directory in config.yaml")
            return

        # Load or initialise existing metrics
        metrics_path = os.path.join(self.assets_dir, "metrics.yaml")
        all_metrics  = {}
        if os.path.exists(metrics_path):
            with open(metrics_path) as f:
                all_metrics = yaml.safe_load(f) or {}

        for machine_type, machine_id, target_dir in dirs:
            model_path   = self._asset_name(machine_type, machine_id)
            metric_key   = self._metric_key(machine_type, machine_id)
            db_label     = os.path.basename(os.path.dirname(os.path.dirname(target_dir)))

            log.info(f"\n{'='*55}")
            log.info(f"  {machine_type} / {machine_id}")
            log.info(f"{'='*55}")

            # ── Skip if already trained ────────────────────────────────────
            if os.path.exists(model_path):
                log.info(f"  Model exists - skipping training ({model_path})")
                # Still recalibrate threshold if missing
                if metric_key not in all_metrics or "threshold" not in all_metrics.get(metric_key, {}):
                    log.info("  Calibrating threshold...")
                    threshold, auc = self._calibrate(target_dir, model_path)
                    all_metrics[metric_key] = {"AUC": auc, "threshold": round(threshold, 4)}
                    self._save_metrics(all_metrics, metrics_path)
                continue

            train_pickle = os.path.join(
                self.pickle_dir, f"train_{machine_type}_{machine_id}_{db_label}.pickle"
            )

            if os.path.exists(train_pickle):
                log.info("  Loading cached training vectors...")
                with open(train_pickle, "rb") as f:
                    train_data = pickle.load(f)
            else:
                log.info("  Extracting features from normal audio files...")
                normal_dir  = os.path.join(target_dir, "normal")
                normal_files = sorted(glob.glob(os.path.join(normal_dir, "*.wav")))
                if not normal_files:
                    log.warning(f"  No normal WAV files in {normal_dir} – skipping")
                    continue
                train_data = list_to_vectors(
                    normal_files,
                    n_mels=self.feat["n_mels"],
                    n_frames=self.feat["frames"],
                    n_fft=self.feat["n_fft"],
                    hop_length=self.feat["hop_length"],
                    power=self.feat["power"],
                )
                with open(train_pickle, "wb") as f:
                    pickle.dump(train_data, f)
                log.info(f"  Cached {train_data.shape[0]} vectors to {train_pickle}")

            if train_data.shape[0] == 0:
                log.error("  No training data – skipping")
                continue

            # ── Build + train model ────────────────────────────────────────
            input_dim = self.feat["n_mels"] * self.feat["frames"]
            model = build_autoencoder(input_dim)
            model.compile(optimizer="adam", loss="mean_squared_error")
            log.info(f"  Training autoencoder ({input_dim}-dim input, {train_data.shape[0]} vectors)...")
            model.fit(
                train_data, train_data,
                epochs=self.train_cfg["epochs"],
                batch_size=self.train_cfg["batch_size"],
                shuffle=self.train_cfg["shuffle"],
                validation_split=self.train_cfg["validation_split"],
                verbose=1,
            )

            # ── Export as FULL model (not weights-only like baseline.py) ───
            model.save(model_path)
            log.info(f"  [OK] Model saved -> {model_path}")

            # ── Calibrate threshold ────────────────────────────────────────
            log.info("  Calibrating anomaly threshold from real data...")
            threshold, auc = self._calibrate(target_dir, model_path, preloaded_model=model)
            all_metrics[metric_key] = {"AUC": round(auc, 6), "threshold": round(threshold, 4)}
            log.info(f"  AUC={auc:.4f}  Threshold={threshold:.4f}")
            self._save_metrics(all_metrics, metrics_path)

        log.info("\n[OK] All models ready.\n")

    # ── Threshold calibration ─────────────────────────────────────────────────
    def _calibrate(self, machine_dir, model_path, preloaded_model=None):
        """Compute AUC and data-driven threshold from eval data."""
        import tensorflow as tf
        from sklearn.metrics import roc_auc_score

        model = preloaded_model or tf.keras.models.load_model(model_path)

        normal_dir   = os.path.join(machine_dir, "normal")
        abnormal_dir = os.path.join(machine_dir, "abnormal")

        normal_files   = sorted(glob.glob(os.path.join(normal_dir,   "*.wav")))[:self.cal_files]
        abnormal_files = sorted(glob.glob(os.path.join(abnormal_dir, "*.wav")))[:self.cal_files]

        def score_files(files):
            scores = []
            for f in files:
                v = wav_to_vectors(
                    f,
                    n_mels=self.feat["n_mels"],
                    n_frames=self.feat["frames"],
                    n_fft=self.feat["n_fft"],
                    hop_length=self.feat["hop_length"],
                    power=self.feat["power"],
                )
                if v is not None and len(v) > 0:
                    r = model.predict(v, verbose=0)
                    scores.append(float(np.mean(np.square(v - r))))
            return scores

        norm_scores = score_files(normal_files)
        abn_scores  = score_files(abnormal_files)

        # AUC
        auc = 0.5
        if norm_scores and abn_scores:
            y_true = [0] * len(norm_scores) + [1] * len(abn_scores)
            y_pred = norm_scores + abn_scores
            try:
                auc = roc_auc_score(y_true, y_pred)
            except Exception:
                pass

        # Threshold: midpoint between normal max and abnormal min
        # Falls back to mean + 2*std if ranges overlap
        if norm_scores and abn_scores:
            n_max = max(norm_scores)
            a_min = min(abn_scores)
            if a_min > n_max:
                threshold = (n_max + a_min) / 2.0
            else:
                threshold = float(np.mean(norm_scores) + 2.0 * np.std(norm_scores))
        elif norm_scores:
            threshold = float(np.mean(norm_scores) + 2.0 * np.std(norm_scores))
        else:
            threshold = 10.0

        return threshold, auc

    def _save_metrics(self, data, path):
        with open(path, "w") as f:
            yaml.dump(data, f, default_flow_style=False)
        log.info(f"  metrics.yaml updated -> {path}")
