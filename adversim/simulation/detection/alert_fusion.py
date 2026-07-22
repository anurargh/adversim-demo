"""
AdverSim Alert Fusion Engine Module
Combines Isolation Forest anomaly score, Markov chain sequence log-probability,
and MITRE surface critical weights into a unified, threshold-tunable alert score.
"""

from typing import Dict, List, Any, Optional


class AlertFusion:
    """
    Fuses multi-modal detection signals (Isolation Forest + Markov Chain + Surface Risk Weights)
    into a consolidated risk score and binary security alert decision.
    """

    def __init__(
        self,
        weight_if: float = 0.5,
        weight_markov: float = 0.5,
        default_threshold: float = 0.55,
        surface_weights: Optional[Dict[str, float]] = None
    ):
        self.weight_if = weight_if
        self.weight_markov = weight_markov
        self.default_threshold = default_threshold

        # Default surface criticality weights (1.0 = baseline, >1.0 = high risk)
        self.surface_weights: Dict[str, float] = surface_weights or {
            "network_scanning": 0.8,
            "service_enumeration": 0.8,
            "os_fingerprinting": 0.8,
            "credential_access": 1.2,
            "script_execution": 1.1,
            "scheduled_task": 1.0,
            "process_injection": 1.3,
            "registry_persistence": 1.1,
            "account_creation": 1.2,
            "log_clearing": 1.4,
            "lateral_movement": 1.3,
            "pass_the_hash": 1.3,
            "outbound_transfer": 1.5,
            "data_compression": 1.2,
            "encrypted_channel": 1.2,
        }

    def convert_markov_logprob_to_score(self, log_prob: float) -> float:
        """
        Converts raw Markov negative log likelihood into a normalized 0.0 - 1.0 anomaly score.
        Negative log probability below -30.0 approaches maximum anomaly score 1.0.
        """
        if log_prob >= 0.0:
            return 0.0
        
        # Linear/sigmoid mapping from negative logprob
        neg_logprob = abs(log_prob)
        norm_score = min(1.0, neg_logprob / 30.0)
        return round(norm_score, 4)

    def fuse(
        self,
        if_score: float,
        markov_log_prob: float,
        technique: str = "script_execution",
        threshold_override: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculates fused score and alert determination.
        fused_score = (w_if * if_score + w_markov * markov_score) * surface_weight
        """
        markov_score = self.convert_markov_logprob_to_score(markov_log_prob)
        surface_weight = self.surface_weights.get(technique, 1.0)

        # Base weighted sum
        base_fused = (self.weight_if * if_score) + (self.weight_markov * markov_score)
        
        # Apply surface risk multiplier
        fused_score = min(1.0, max(0.0, base_fused * (surface_weight / 1.0)))
        fused_score = round(fused_score, 4)

        threshold = threshold_override if threshold_override is not None else self.default_threshold
        is_alert = fused_score >= threshold

        return {
            "fused_score": fused_score,
            "is_alert": is_alert,
            "if_score": round(if_score, 4),
            "markov_score": markov_score,
            "markov_log_prob": round(markov_log_prob, 4),
            "surface_weight": surface_weight,
            "technique": technique,
            "threshold": threshold,
        }


if __name__ == "__main__":
    print("[TEST] Initializing AlertFusion engine...")
    fusion = AlertFusion()

    # Test 1: Low risk event
    res_low = fusion.fuse(if_score=0.1, markov_log_prob=-2.0, technique="network_scanning")
    print("\nLow Risk Event Fusion Result:")
    for k, v in res_low.items():
        print(f"  {k:<20}: {v}")

    # Test 2: High risk event (e.g. log clearing + process injection anomaly)
    res_high = fusion.fuse(if_score=0.85, markov_log_prob=-25.0, technique="log_clearing")
    print("\nHigh Risk Event Fusion Result:")
    for k, v in res_high.items():
        print(f"  {k:<20}: {v}")
