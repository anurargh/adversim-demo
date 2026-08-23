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
from typing import List, Dict, Any, Optional

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

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
        self._mean_vec = None
        self._std_vec = None

    @property
    def is_trained(self) -> bool:
        """Returns training state of detector."""
        return self._is_trained

    def extract_features(self, event_window: List[Dict[str, Any]]) -> List[float]:
        """
        Extracts 21-dimensional feature vector from an event window list:
        - 15 x Technique Frequencies (mapped from technique/event_type)
        - Source Container Concentration / Entropy
        - Window Event Frequency Rate (events per sec)
        - Mean Inter-Event Delta Timing
        - Variance Inter-Event Delta Timing
        - Sequence Shannon Entropy
        - Total Window Size
        """
        window_size = float(len(event_window))
        if window_size == 0:
            return [0.0] * 21

        # 1. 15 x Technique frequency calculation from real event stream
        tech_counts = {t: 0.0 for t in self.technique_keys}
        container_counts: Dict[str, float] = {}
        deltas = []

        for i, evt in enumerate(event_window):
            # Extract technique or derive from event_type
            raw_tech = evt.get("technique") or evt.get("event_type", "")
            # Strip prefixes like live_
            clean_tech = raw_tech.replace("live_", "")
            if clean_tech in tech_counts:
                tech_counts[clean_tech] += 1.0
            elif "scan" in clean_tech:
                tech_counts["network_scanning"] += 1.0
            elif "ssh" in clean_tech or "auth" in clean_tech:
                tech_counts["credential_access"] += 1.0
            elif "exec" in clean_tech or "cmd" in clean_tech:
                tech_counts["script_execution"] += 1.0
            elif "honeypot" in clean_tech or evt.get("is_honeypot"):
                tech_counts["service_enumeration"] += 1.0

            # Source container / node tracking
            container = evt.get("node_id") or evt.get("source_container") or evt.get("target_ip", "node-user-1")
            container_counts[container] = container_counts.get(container, 0.0) + 1.0

            # Timing delta
            delta = evt.get("inter_event_delta") or evt.get("latency_s") or 0.35
            deltas.append(float(delta))

        freqs = [tech_counts[t] / window_size for t in self.technique_keys]

        # 2. Container concentration
        max_container_share = max(container_counts.values()) / window_size if container_counts else 0.0

        # 3. Timing metrics: mean_delta, delta_variance, event rate
        if deltas:
            mean_delta = sum(deltas) / len(deltas)
            delta_variance = sum((d - mean_delta) ** 2 for d in deltas) / len(deltas)
            event_rate = 1.0 / max(0.01, mean_delta)
        else:
            mean_delta = 0.35
            delta_variance = 0.0
            event_rate = 2.8

        # 4. Sequence Shannon Entropy
        entropy = 0.0
        for p in freqs:
            if p > 0.0:
                entropy -= p * math.log2(p)

        # Combine into feature array
        features = freqs + [max_container_share, event_rate, mean_delta, delta_variance, entropy, window_size]
        return features

    def train(self, normal_windows: List[List[Dict[str, Any]]]) -> None:
        """Fits the Isolation Forest on a collection of normal event windows."""
        if not normal_windows:
            print("[IF DETECTOR] Warning: Empty normal window list provided for training.")
            return

        feature_matrix = [self.extract_features(win) for win in normal_windows]

        if HAS_SKLEARN and self._model is not None and HAS_NUMPY:
            X = np.array(feature_matrix)
            self._model.fit(X)
        else:
            # Simple heuristic baseline if sklearn not present
            dim = len(feature_matrix[0])
            n = len(feature_matrix)
            self._mean_vec = [sum(row[i] for row in feature_matrix) / n for i in range(dim)]
            self._std_vec = [
                math.sqrt(sum((row[i] - self._mean_vec[i]) ** 2 for row in feature_matrix) / n) + 1e-6
                for i in range(dim)
            ]

        self._is_trained = True
        print(f"[IF DETECTOR] Trained successfully on {len(normal_windows)} normal event windows.")

    def score(self, event_window: List[Dict[str, Any]]) -> float:
        """
        Computes normalized anomaly score between 0.0 (normal) and 1.0 (anomalous).
        """
        if not self._is_trained:
            return 0.15

        features = self.extract_features(event_window)

        if HAS_SKLEARN and self._model is not None and HAS_NUMPY:
            x = np.array(features).reshape(1, -1)
            raw_score = self._model.decision_function(x)[0]
            norm_score = max(0.0, min(1.0, 0.5 - raw_score))
            return round(norm_score, 4)
        else:
            # Distance based heuristic score
            if self._mean_vec is None:
                return 0.2
            dist = sum(
                abs(features[i] - self._mean_vec[i]) / self._std_vec[i]
                for i in range(len(features))
            ) / len(features)
            norm_score = max(0.0, min(1.0, dist / 4.0))
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
                "mean_vec": self._mean_vec,
                "std_vec": self._std_vec,
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
            self._mean_vec = data.get("mean_vec")
            self._std_vec = data.get("std_vec")

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
