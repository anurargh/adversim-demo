"""
AdverSim First-Order Markov Chain Sequence Anomaly Detector Module
Builds 15x15 technique transition probability matrix from baseline normal activity.
Calculates log probability of technique transitions to identify malicious action sequences.
"""

import math
import numpy as np
from typing import List, Dict, Any, Union

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


class MarkovDetector:
    """
    First-order Markov Chain model for technique sequence transition anomaly detection.
    """

    def __init__(self, smoothing_alpha: float = 0.01):
        self.smoothing_alpha = smoothing_alpha
        self.technique_keys: List[str] = TECHNIQUE_KEYS
        self.tech_to_idx: Dict[str, int] = {t: i for i, t in enumerate(self.technique_keys)}
        self.n_states = len(self.technique_keys)

        # 15x15 Transition Matrix initialized with uniform distribution
        self.transition_matrix = np.full(
            (self.n_states, self.n_states),
            1.0 / self.n_states,
            dtype=np.float64
        )
        self.log_transition_matrix = np.log(self.transition_matrix)
        self.is_trained: bool = False

    def train(self, normal_sequences: List[Union[List[str], List[Dict[str, Any]]]]) -> None:
        """
        Builds and normalizes the 15x15 transition probability matrix with Laplace smoothing.
        Accepts sequences of technique string names OR event dictionary lists.
        """
        counts = np.full((self.n_states, self.n_states), self.smoothing_alpha, dtype=np.float64)

        for seq in normal_sequences:
            if not seq:
                continue

            # Extract technique names if dictionary sequence
            tech_seq = []
            for item in seq:
                if isinstance(item, dict):
                    tech_seq.append(item.get("technique", "network_scanning"))
                else:
                    tech_seq.append(str(item))

            for i in range(len(tech_seq) - 1):
                from_tech = tech_seq[i]
                to_tech = tech_seq[i + 1]

                if from_tech in self.tech_to_idx and to_tech in self.tech_to_idx:
                    u = self.tech_to_idx[from_tech]
                    v = self.tech_to_idx[to_tech]
                    counts[u, v] += 1.0

        # Row-normalize transition probabilities
        row_sums = counts.sum(axis=1, keepdims=True)
        self.transition_matrix = counts / row_sums
        self.log_transition_matrix = np.log(self.transition_matrix)
        self.is_trained = True

        print(f"[MARKOV DETECTOR] Trained 15x15 transition matrix over {len(normal_sequences)} baseline sequences.")
        self.print_transition_matrix()

    def log_probability(self, sequence: Union[List[str], List[Dict[str, Any]]]) -> float:
        """
        Calculates cumulative log probability (log likelihood) for a sequence of techniques.
        Unseen or low-probability transition pairs produce high negative log probability.
        """
        if not sequence or len(sequence) < 2:
            return 0.0

        tech_seq = []
        for item in sequence:
            if isinstance(item, dict):
                tech_seq.append(item.get("technique", "network_scanning"))
            else:
                tech_seq.append(str(item))

        log_prob = 0.0
        for i in range(len(tech_seq) - 1):
            from_tech = tech_seq[i]
            to_tech = tech_seq[i + 1]

            u = self.tech_to_idx.get(from_tech, 0)
            v = self.tech_to_idx.get(to_tech, 0)

            log_prob += float(self.log_transition_matrix[u, v])

        return round(log_prob, 4)

    def is_anomalous(
        self,
        sequence: Union[List[str], List[Dict[str, Any]]],
        threshold: float = -15.0
    ) -> bool:
        """
        Returns True if sequence log probability falls below negative log likelihood threshold.
        """
        log_p = self.log_probability(sequence)
        return log_p < threshold

    def print_transition_matrix(self) -> None:
        """Prints formatted 15x15 transition matrix probability values for verification."""
        print("\n==========================================================================")
        print("           MARKOV 15x15 TECHNIQUE TRANSITION MATRIX (HEATMAP VALUES)")
        print("==========================================================================")
        header = f"{'FROM \\ TO':<20} | " + " ".join([f"{t[:4]:>5}" for t in self.technique_keys])
        print(header)
        print("-" * len(header))

        for i, from_t in enumerate(self.technique_keys):
            row_vals = " ".join([f"{self.transition_matrix[i, j]:5.2f}" for j in range(self.n_states)])
            print(f"{from_t:<20} | {row_vals}")

        print("==========================================================================\n")


if __name__ == "__main__":
    print("[TEST] Testing MarkovDetector...")
    markov = MarkovDetector()

    # Normal baseline sequences (orderly recon -> exec)
    normal_seqs = [
        ["network_scanning", "service_enumeration", "os_fingerprinting"],
        ["service_enumeration", "os_fingerprinting", "credential_access"],
        ["credential_access", "script_execution", "scheduled_task"],
    ]

    markov.train(normal_seqs)

    normal_test = ["network_scanning", "service_enumeration", "os_fingerprinting"]
    anomalous_test = ["log_clearing", "outbound_transfer", "process_injection", "pass_the_hash"]

    lp_norm = markov.log_probability(normal_test)
    lp_anom = markov.log_probability(anomalous_test)

    print(f"Normal Sequence Log-Prob:      {lp_norm} (Anomalous: {markov.is_anomalous(normal_test)})")
    print(f"Anomalous Sequence Log-Prob:   {lp_anom} (Anomalous: {markov.is_anomalous(anomalous_test)})")
