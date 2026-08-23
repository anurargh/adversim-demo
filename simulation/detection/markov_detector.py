"""
AdverSim First-Order Markov Chain Sequence Anomaly Detector Module
Builds 15x15 technique transition probability matrix from baseline normal activity.
Calculates log probability of technique transitions to identify malicious action sequences.
"""

import math
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
        self.transition_matrix = [
            [1.0 / self.n_states for _ in range(self.n_states)]
            for _ in range(self.n_states)
        ]
        self.log_transition_matrix = [
            [math.log(1.0 / self.n_states) for _ in range(self.n_states)]
            for _ in range(self.n_states)
        ]
        self.is_trained = False

    def train(self, normal_sequences: List[List[str]]) -> None:
        """
        Calculates empirical transition counts from normal baseline sequences,
        applies Laplace/additive smoothing, and normalizes rows to form probability distributions.
        """
        counts = [
            [self.smoothing_alpha for _ in range(self.n_states)]
            for _ in range(self.n_states)
        ]

        for seq in normal_sequences:
            for i in range(len(seq) - 1):
                from_tech = seq[i]
                to_tech = seq[i + 1]
                if from_tech in self.tech_to_idx and to_tech in self.tech_to_idx:
                    u = self.tech_to_idx[from_tech]
                    v = self.tech_to_idx[to_tech]
                    counts[u][v] += 1.0

        for u in range(self.n_states):
            row_sum = sum(counts[u])
            for v in range(self.n_states):
                prob = counts[u][v] / row_sum
                self.transition_matrix[u][v] = prob
                self.log_transition_matrix[u][v] = math.log(max(1e-9, prob))

        self.is_trained = True
        print(f"[MARKOV DETECTOR] Model trained on {len(normal_sequences)} normal sequences.")

    def log_probability(self, sequence: Union[List[str], List[Dict[str, Any]]]) -> float:
        """
        Calculates cumulative log probability of a sequence of techniques or event dicts.
        """
        if not sequence or len(sequence) < 2:
            return -1.0

        tech_list = [
            item.get("technique") if isinstance(item, dict) else str(item)
            for item in sequence
        ]

        total_log_prob = 0.0
        num_transitions = 0

        for i in range(len(tech_list) - 1):
            from_tech = tech_list[i]
            to_tech = tech_list[i + 1]

            if from_tech in self.tech_to_idx and to_tech in self.tech_to_idx:
                u = self.tech_to_idx[from_tech]
                v = self.tech_to_idx[to_tech]
                total_log_prob += self.log_transition_matrix[u][v]
                num_transitions += 1

        if num_transitions == 0:
            return -5.0

        return total_log_prob

    def score_sequence(self, sequence: Union[List[str], List[Dict[str, Any]]]) -> float:
        """
        Calculates normalized negative log likelihood anomaly score for a technique sequence.
        Returns a score in [0.0, 1.0], where 0.0 is completely normal and 1.0 is highly anomalous.
        """
        if len(sequence) < 2:
            return 0.1

        total_log_prob = 0.0
        num_transitions = 0

        for i in range(len(sequence) - 1):
            from_tech = sequence[i]
            to_tech = sequence[i + 1]

            if from_tech in self.tech_to_idx and to_tech in self.tech_to_idx:
                u = self.tech_to_idx[from_tech]
                v = self.tech_to_idx[to_tech]
                total_log_prob += self.log_transition_matrix[u][v]
                num_transitions += 1

        if num_transitions == 0:
            return 0.5

        avg_log_prob = total_log_prob / num_transitions
        # Map log-prob: normal sequences have higher log prob (-1.0), anomalous have lower (-6.0)
        norm_score = max(0.0, min(1.0, (-avg_log_prob - 1.0) / 5.0))
        return round(norm_score, 4)


if __name__ == "__main__":
    print("[TEST] Testing MarkovDetector...")
    markov = MarkovDetector()

    normal_seqs = [
        ["network_scanning", "service_enumeration", "os_fingerprinting"],
        ["service_enumeration", "os_fingerprinting", "network_scanning"],
    ] * 20

    markov.train(normal_seqs)

    normal_test = ["network_scanning", "service_enumeration", "os_fingerprinting"]
    anomaly_test = ["credential_access", "log_clearing", "outbound_transfer"]

    print(f"Normal Sequence Score:    {markov.score_sequence(normal_test)}")
    print(f"Anomalous Sequence Score: {markov.score_sequence(anomaly_test)}")
