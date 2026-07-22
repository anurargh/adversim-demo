"""
AdverSim Bayesian Surface Weight Vector Module
Maintains Beta(alpha, beta) distributions per MITRE attack surface.
Updates posteriors on threat detection, applies exponential decay toward uniform prior,
samples dynamic randomized monitoring rates, and exports/imports weight arrays.
"""

import math
import random
import numpy as np
from typing import Dict, List, Any, Optional

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


class BayesianWeightVector:
    """
    Maintains Beta(alpha, beta) prior/posterior distribution parameters for 15 MITRE attack surfaces.
    """

    def __init__(self, prior_alpha: float = 1.0, prior_beta: float = 1.0):
        self.technique_keys: List[str] = TECHNIQUE_KEYS
        self.prior_alpha = prior_alpha
        self.prior_beta = prior_beta

        # Initialize Beta parameters for all 15 techniques
        self.alpha: Dict[str, float] = {t: self.prior_alpha for t in self.technique_keys}
        self.beta: Dict[str, float] = {t: self.prior_beta for t in self.technique_keys}

    def update_on_detection(self, technique: str, weight_boost: float = 1.0) -> None:
        """
        Updates Beta posterior parameters upon attack detection on a specific surface.
        Increments alpha parameter (success/threat evidence counter).
        """
        if technique in self.alpha:
            self.alpha[technique] += weight_boost

    def update_on_false_positive(self, technique: str, penalty: float = 0.5) -> None:
        """
        Increments beta parameter upon false positive detection to reduce over-sensitivity.
        """
        if technique in self.beta:
            self.beta[technique] += penalty

    def decay(self, decay_factor: float = 0.995) -> None:
        """
        Applies exponential decay pulling posteriors back toward uniform prior Beta(1,1).
        Prevents static weight lock-in and enables adaptability to shifting attacker behavior.
        """
        for t in self.technique_keys:
            self.alpha[t] = 1.0 + (self.alpha[t] - 1.0) * decay_factor
            self.beta[t] = 1.0 + (self.beta[t] - 1.0) * decay_factor

    def sample_monitoring_rate(self, technique: str) -> float:
        """
        Samples a randomized monitoring intensity rate from Beta(alpha, beta) distribution.
        Adds stochastic defense behavior to confuse UCB attacker strategy profiling.
        """
        a = self.alpha.get(technique, 1.0)
        b = self.beta.get(technique, 1.0)
        rate = np.random.beta(a, b)
        return float(np.clip(rate, 0.05, 0.95))

    def get_mean_weights(self) -> Dict[str, float]:
        """
        Returns expected mean E[X] = alpha / (alpha + beta) for each technique.
        """
        means = {}
        for t in self.technique_keys:
            a = self.alpha[t]
            b = self.beta[t]
            means[t] = a / (a + b)
        return means

    def get_weights(self) -> Dict[str, float]:
        """
        Returns normalized surface weight distribution (sums to 1.0 across 15 techniques).
        Used for setting defense resource allocation and detection thresholds.
        """
        means = self.get_mean_weights()
        total_mean = sum(means.values())
        if total_mean > 0:
            return {t: round(m / total_mean, 4) for t, m in means.items()}
        return {t: round(1.0 / len(self.technique_keys), 4) for t in self.technique_keys}

    def to_vector(self) -> np.ndarray:
        """
        Exports alpha and beta parameters as a 30-element numpy array [alphas..., betas...]
        for vector network sharing with Central Intelligence Server.
        """
        alphas = [self.alpha[t] for t in self.technique_keys]
        betas = [self.beta[t] for t in self.technique_keys]
        return np.array(alphas + betas, dtype=np.float64)

    def from_vector(self, vector: np.ndarray) -> None:
        """
        Loads and updates Beta parameters from a 30-element numpy array.
        """
        if len(vector) != 2 * len(self.technique_keys):
            print(f"[BAYES WEIGHTS] Error: Expected array length {2 * len(self.technique_keys)}, got {len(vector)}")
            return

        n = len(self.technique_keys)
        alphas = vector[:n]
        betas = vector[n:]

        for i, t in enumerate(self.technique_keys):
            self.alpha[t] = float(alphas[i])
            self.beta[t] = float(betas[i])

    def print_weights(self, round_number: int) -> None:
        """Prints current normalized surface weights every 10 rounds for verification."""
        if round_number % 10 == 0:
            weights = self.get_weights()
            print(f"\n==========================================================================")
            print(f" [VERIFICATION - Round {round_number}] DEFENDER BAYESIAN SURFACE WEIGHTS")
            print(f"==========================================================================")
            print(f"{'MITRE SURFACE KEY':<22} | {'ALPHA (A)':<10} | {'BETA (B)':<10} | {'NORMALIZED WEIGHT'}")
            print("-" * 75)
            for t in self.technique_keys:
                a = self.alpha[t]
                b = self.beta[t]
                w = weights[t]
                print(f"{t:<22} | {a:<10.2f} | {b:<10.2f} | {w:<.4f}")
            print("==========================================================================\n")


if __name__ == "__main__":
    print("[TEST] Initializing BayesianWeightVector...")
    bwv = BayesianWeightVector()

    for r in range(1, 21):
        if r % 3 == 0:
            bwv.update_on_detection("credential_access")
            bwv.update_on_detection("log_clearing")
        bwv.decay()
        bwv.print_weights(r)

    v = bwv.to_vector()
    print(f"\n[TEST] Exported 30-dim vector shape: {v.shape}")
