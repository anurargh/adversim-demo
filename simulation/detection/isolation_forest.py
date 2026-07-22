"""
AdverSim Isolation Forest Anomaly Detector Module
Extracts 19-dimensional feature vectors from windowed auditd event sequences:
- 15 x Normalized technique frequencies
- Mean inter-event delta timing
- Inter-event delta timing variance
- Sequence Shannon entropy
- Window event size
"""

import os
import math
import pickle
import numpy as np
from typing import List, Dict, Any, Optional

try:
    from sklearn.ensemble import IsolationForest
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    from simulation.mitre_map import MITRE_TECHNIQUES
except ImportError:
    try:
        from ..mitre_map import MITRE_TECHNIQUES
    except ImportError:
        # Fallback 15 techniques keys
        MITRE_TECHNIQUES = {
            "network_scanning": {}, "service_enumeration": {}, "os_fingerprinting": {},
            "credential_access": {}, "script_execution": {}, "scheduled_task": {},
            "process_injection": {}, "registry_persistence": {}, "account_creation": {},
            "log_clearing": {}, "lateral_movement": {}, "pass_the_hash": {},
            "outbound_transfer": {}, "data_compression": {}, "encrypted_channel": {}
        }


TECHNIQUE_KEYS = list(MITRE_TECHNIQUES.keys())


class IsolationForestDetector:
    """
    Unsupervised Anomaly Detector using Isolation Forest on windowed audit telemetry.
    """

    def __init__(self, contamination: float = 0.05, n_estimators: int = 100):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self._model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=42
        ) if HAS_SKLEARN else None
        self._is_trained: bool = False
        self.technique_keys: List[str] = TECHNIQUE_KEYS

    @property
    def is_trained(self) -> bool:
        """Returns training state of detector."""
        return self._is_trained

    def extract_features(self, event_window: List[Dict[str, Any]]) -> np.ndarray:
        """
        Extracts 19-dimensional feature vector from an event window list:
        - 15 x Technique Frequencies
        - Mean Inter-Event Delta
        - Variance Inter-Event Delta
        - Sequence Shannon Entropy
        - Window Size
        """
        window_size = float(len(event_window))
        if window_size == 0:
            return np.zeros(19, dtype=np.float64)

        # 1. 15 x Technique frequency calculation
        tech_counts = {t: 0.0 for t in self.technique_keys}
        deltas = []

        for evt in event_window:
            tech = evt.get("technique", "")
            if tech in tech_counts:
                tech_counts[tech] += 1.0
            
            delta = evt.get("inter_event_delta", 0.5)
            deltas.append(float(delta))

        freqs = [tech_counts[t] / window_size for t in self.technique_keys]

        # 2. Timing metrics: mean_delta, delta_variance
        mean_delta = float(np.mean(deltas)) if deltas else 0.5
        delta_variance = float(np.var(deltas)) if deltas else 0.0

        # 3. Sequence Shannon Entropy
        entropy = 0.0
        for p in freqs:
            if p > 0.0:
                entropy -= p * math.log2(p)

        # Combine into 19-dim feature array
        features = freqs + [mean_delta, delta_variance, entropy, window_size]
        return np.array(features, dtype=np.float64)

    def train(self, normal_windows: List[List[Dict[str, Any]]]) -> None:
        """Fits the Isolation Forest on a collection of normal event windows."""
        if not normal_windows:
            print("[IF DETECTOR] Warning: Empty normal window list provided for training.")
            return

        feature_matrix = [self.extract_features(win) for win in normal_windows]
        X = np.array(feature_matrix)

        if HAS_SKLEARN and self._model is not None:
            self._model.fit(X)
        else:
            # Simple heuristic baseline if sklearn not present
            self._mean_vec = np.mean(X, axis=0)
            self._std_vec = np.std(X, axis=0) + 1e-6

        self._is_trained = True
        print(f"[IF DETECTOR] Trained successfully on {len(normal_windows)} normal event windows (Feature shape: {X.shape}).")

    def score(self, event_window: List[Dict[str, Any]]) -> float:
        """
        Computes normalized anomaly score between 0.0 (normal) and 1.0 (anomalous).
        """
        if not self._is_trained:
            # Untrained model returns mild baseline default
            return 0.15

        x = self.extract_features(event_window).reshape(1, -1)

        if HAS_SKLEARN and self._model is not None:
            # sklearn IsolationForest decision_function returns raw anomaly score
            # negative = outlier, positive = inlier
            raw_score = self._model.decision_function(x)[0]
            # Map raw score [-0.5, 0.5] to [0.0, 1.0]
            norm_score = max(0.0, min(1.0, 0.5 - raw_score))
            return round(norm_score, 4)
        else:
            # Distance based heuristic score
            dist = np.mean(np.abs(x[0] - self._mean_vec) / self._std_vec)
            norm_score = max(0.0, min(1.0, dist / 5.0))
            return round(norm_score, 4)

    def save_model(self, filepath: str = "isolation_forest.pkl") -> None:
        """Saves trained model state to disk."""
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        with open(filepath, "wb") as f:
            pickle.dump({
                "model": self._model,
                "is_trained": self._is_trained,
                "contamination": self.contamination,
                "n_estimators": self.n_estimators,
            }, f)
        print(f"[IF DETECTOR] Model saved to {filepath}")

    def load_model(self, filepath: str = "isolation_forest.pkl") -> bool:
        """Loads trained model state from disk."""
        if not os.path.exists(filepath):
            print(f"[IF DETECTOR] Model file {filepath} not found.")
            return False

        with open(filepath, "rb") as f:
            data = pickle.load(f)
            self._model = data.get("model")
            self._is_trained = data.get("is_trained", False)
            self.contamination = data.get("contamination", 0.05)
            self.n_estimators = data.get("n_estimators", 100)

        print(f"[IF DETECTOR] Model loaded successfully from {filepath}")
        return True


if __name__ == "__main__":
    print("[TEST] Initializing IsolationForestDetector...")
    detector = IsolationForestDetector()

    # Create dummy normal windows
    normal_wins = []
    for _ in range(50):
        win = [
            {"technique": "network_scanning", "inter_event_delta": 0.5},
            {"technique": "service_enumeration", "inter_event_delta": 0.4},
            {"technique": "os_fingerprinting", "inter_event_delta": 0.6},
        ]
        normal_wins.append(win)

    detector.train(normal_wins)

    normal_test = [
        {"technique": "network_scanning", "inter_event_delta": 0.5},
        {"technique": "service_enumeration", "inter_event_delta": 0.4},
    ]

    anomaly_test = [
        {"technique": "credential_access", "inter_event_delta": 0.01},
        {"technique": "log_clearing", "inter_event_delta": 0.001},
        {"technique": "outbound_transfer", "inter_event_delta": 0.001},
    ]

    print(f"Normal Window Anomaly Score:  {detector.score(normal_test)}")
    print(f"Anomalous Window Anomaly Score: {detector.score(anomaly_test)}")
