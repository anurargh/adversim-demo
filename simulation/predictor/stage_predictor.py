"""
AdverSim Attacker Stage Predictor Module
Learns kill-chain stage transition probabilities from attack event sequences.
Predicts the most probable next attack stage and recommends proactive defense hardening
when prediction confidence exceeds 50%.
"""

import numpy as np
from typing import List, Dict, Any, Tuple, Union

try:
    from simulation.mitre_map import MITRE_TECHNIQUES, KILL_CHAIN_STAGES, get_stage
except ImportError:
    try:
        from ..mitre_map import MITRE_TECHNIQUES, KILL_CHAIN_STAGES, get_stage
    except ImportError:
        KILL_CHAIN_STAGES = [
            "Reconnaissance", "Initial Access", "Execution",
            "Persistence", "Defense Evasion", "Lateral Movement", "Exfiltration"
        ]
        MITRE_TECHNIQUES = {}
        def get_stage(tech: str) -> str:
            return "Execution"


class StagePredictor:
    """
    Predicts next kill-chain stage based on learned Markovian stage transition probabilities.
    Recommends proactive surface pre-hardening when confidence > 0.50.
    """

    def __init__(self, confidence_threshold: float = 0.50):
        self.stages: List[str] = list(KILL_CHAIN_STAGES)
        self.n_stages = len(self.stages)
        self.stage_to_idx: Dict[str, int] = {s: i for i, s in enumerate(self.stages)}
        self.confidence_threshold = confidence_threshold

        # Initialize uniform stage transition matrix (7x7)
        self.transition_matrix = np.full(
            (self.n_stages, self.n_stages),
            1.0 / self.n_stages,
            dtype=np.float64
        )
        self.is_trained: bool = False

        # Pre-populate default technique mappings per stage
        self.stage_techniques: Dict[str, List[str]] = self._build_stage_techniques_map()

    def _build_stage_techniques_map(self) -> Dict[str, List[str]]:
        """Maps each kill chain stage to its associated MITRE techniques."""
        stage_map = {stage: [] for stage in self.stages}
        if MITRE_TECHNIQUES:
            for tech, info in MITRE_TECHNIQUES.items():
                s = info.get("stage", "Execution")
                if s in stage_map:
                    stage_map[s].append(tech)
        else:
            # Baseline fallback technique mapping
            stage_map = {
                "Reconnaissance": ["network_scanning", "service_enumeration", "os_fingerprinting"],
                "Initial Access": ["credential_access"],
                "Execution": ["script_execution"],
                "Persistence": ["scheduled_task", "registry_persistence", "account_creation"],
                "Defense Evasion": ["process_injection", "log_clearing"],
                "Lateral Movement": ["lateral_movement", "pass_the_hash"],
                "Exfiltration": ["outbound_transfer", "data_compression", "encrypted_channel"],
            }
        return stage_map

    def train(self, sequences: List[Union[List[str], List[Dict[str, Any]]]]) -> None:
        """
        Learns 7x7 kill chain stage transition probability matrix from attack sequences.
        """
        counts = np.ones((self.n_stages, self.n_stages), dtype=np.float64) * 0.1  # Laplace smoothing

        for seq in sequences:
            if not seq:
                continue

            # Map sequence of techniques to sequence of stages
            stage_seq = []
            for item in seq:
                tech = item.get("technique") if isinstance(item, dict) else str(item)
                stage_seq.append(get_stage(tech))

            for i in range(len(stage_seq) - 1):
                from_s = stage_seq[i]
                to_s = stage_seq[i + 1]

                if from_s in self.stage_to_idx and to_s in self.stage_to_idx:
                    u = self.stage_to_idx[from_s]
                    v = self.stage_to_idx[to_s]
                    counts[u, v] += 1.0

        # Row-normalize transition matrix
        row_sums = counts.sum(axis=1, keepdims=True)
        self.transition_matrix = counts / row_sums
        self.is_trained = True
        print(f"[STAGE PREDICTOR] Trained 7x7 stage transition matrix over {len(sequences)} sequences.")

    def predict_next(self, current_stage: str) -> Tuple[str, float]:
        """
        Predicts the most probable next kill chain stage and transition confidence probability.
        """
        if current_stage not in self.stage_to_idx:
            # Default prediction if unknown stage
            return "Initial Access", 0.35

        idx = self.stage_to_idx[current_stage]
        probs = self.transition_matrix[idx]

        best_next_idx = int(np.argmax(probs))
        next_stage = self.stages[best_next_idx]
        confidence = float(probs[best_next_idx])

        return next_stage, round(confidence, 4)

    def get_recommended_hardening(self, current_stage: str) -> List[str]:
        """
        Returns list of techniques to pre-harden if prediction confidence > 0.50.
        Returns empty list if confidence threshold is not met.
        """
        next_stage, confidence = self.predict_next(current_stage)

        print(f"[STAGE PREDICTOR] Current Stage: '{current_stage}' -> Predicted Next: '{next_stage}' (Conf: {confidence:.2%})")

        if confidence > self.confidence_threshold:
            recommended_techs = self.stage_techniques.get(next_stage, [])
            print(f"[STAGE PREDICTOR] Proactive Hardening Recommended for {len(recommended_techs)} techniques in '{next_stage}'.")
            return recommended_techs
        else:
            print(f"[STAGE PREDICTOR] Confidence ({confidence:.2%}) below threshold ({self.confidence_threshold:.0%}). No hardening recommended.")
            return []


if __name__ == "__main__":
    print("[TEST] Testing StagePredictor...")
    predictor = StagePredictor(confidence_threshold=0.50)

    # Train with sample sequences
    sample_seqs = [
        ["network_scanning", "service_enumeration", "os_fingerprinting"],
        ["os_fingerprinting", "credential_access", "script_execution"],
        ["script_execution", "scheduled_task", "registry_persistence"],
        ["registry_persistence", "process_injection", "log_clearing"],
        ["log_clearing", "lateral_movement", "pass_the_hash"],
        ["pass_the_hash", "outbound_transfer", "data_compression"],
    ]

    predictor.train(sample_seqs)

    next_s, conf = predictor.predict_next("Reconnaissance")
    print(f"\nNext stage after Reconnaissance: {next_s} ({conf:.2%})")

    hardening = predictor.get_recommended_hardening("Reconnaissance")
    print(f"Recommended hardening techniques: {hardening}")
