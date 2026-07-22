"""
AdverSim Static Attacker Profiles
Defines 8 fixed-strategy adversary profiles with specific probability distributions over techniques,
timing behaviors (fast, medium, slow), and simulated attack execution generators.
"""

import random
from typing import Dict, List, Any, Optional

try:
    from simulation.mitre_map import MITRE_TECHNIQUES, create_event
except ImportError:
    from ..mitre_map import MITRE_TECHNIQUES, create_event


class BaseStaticAttacker:
    """Base class for all static adversary profiles."""

    def __init__(
        self,
        profile_name: str,
        timing_pattern: str,
        technique_distribution: Dict[str, float],
    ):
        self.profile_name = profile_name
        self.timing_pattern = timing_pattern  # "fast", "medium", or "slow"
        self.technique_distribution = self._normalize_distribution(
            technique_distribution
        )
        self.techniques = list(self.technique_distribution.keys())
        self.weights = list(self.technique_distribution.values())

    def _normalize_distribution(
        self, dist: Dict[str, float]
    ) -> Dict[str, float]:
        """Ensures probability values sum to 1.0 across all 15 MITRE techniques."""
        all_techniques = list(MITRE_TECHNIQUES.keys())
        full_dist = {t: dist.get(t, 0.05) for t in all_techniques}
        total = sum(full_dist.values())
        return {k: v / total for k, v in full_dist.items()}

    def sample_technique(self) -> str:
        """Weighted random pick of technique based on profile distribution."""
        return random.choices(self.techniques, weights=self.weights, k=1)[0]

    def attack(self, node: Any, round_number: int) -> Dict[str, Any]:
        """
        Executes an attack on target node at specified round.
        Returns a complete audit event dictionary.
        """
        chosen_tech = self.sample_technique()
        node_id = node.get("id", str(node)) if isinstance(node, dict) else str(node)
        target_ip = node.get("ip", "172.20.0.11") if isinstance(node, dict) else "172.20.0.11"

        return create_event(
            technique=chosen_tech,
            node_id=node_id,
            is_attack=True,
            target_ip=target_ip,
            sequence_position=round_number,
        )


# --- 1. Aggressive Attacker ---
class AggressiveAttacker(BaseStaticAttacker):
    """High-frequency, noisy adversary probing all surfaces rapidly."""

    def __init__(self):
        dist = {t: 1.0 for t in MITRE_TECHNIQUES.keys()}
        super().__init__("Aggressive", "fast", dist)


# --- 2. Stealthy Attacker ---
class StealthyAttacker(BaseStaticAttacker):
    """Low-frequency, stealthy adversary favoring low-noise surfaces."""

    def __init__(self):
        dist = {
            "service_enumeration": 0.25,
            "os_fingerprinting": 0.20,
            "credential_access": 0.20,
            "process_injection": 0.15,
            "pass_the_hash": 0.10,
            "encrypted_channel": 0.10,
        }
        super().__init__("Stealthy", "slow", dist)


# --- 3. Credential Focused Attacker ---
class CredentialFocusedAttacker(BaseStaticAttacker):
    """Adversary targeting account takeover and credential harvesting."""

    def __init__(self):
        dist = {
            "credential_access": 0.40,
            "pass_the_hash": 0.25,
            "account_creation": 0.15,
            "service_enumeration": 0.10,
            "lateral_movement": 0.10,
        }
        super().__init__("Credential-Focused", "medium", dist)


# --- 4. Lateral Mover Attacker ---
class LateralMoverAttacker(BaseStaticAttacker):
    """Adversary focused on scanning and pivoting across network nodes."""

    def __init__(self):
        dist = {
            "lateral_movement": 0.35,
            "network_scanning": 0.25,
            "pass_the_hash": 0.20,
            "credential_access": 0.10,
            "script_execution": 0.10,
        }
        super().__init__("Lateral-Mover", "medium", dist)


# --- 5. APT Style Attacker ---
class APTStyleAttacker(BaseStaticAttacker):
    """Advanced Persistent Threat following methodical multi-stage progression."""

    def __init__(self):
        dist = {
            "network_scanning": 0.15,
            "credential_access": 0.15,
            "script_execution": 0.15,
            "registry_persistence": 0.15,
            "log_clearing": 0.15,
            "lateral_movement": 0.15,
            "outbound_transfer": 0.10,
        }
        super().__init__("APT-Style", "slow", dist)


# --- 6. Ransomware Attacker ---
class RansomwareAttacker(BaseStaticAttacker):
    """Fast, destructive adversary focused on execution, compression, and exfiltration."""

    def __init__(self):
        dist = {
            "script_execution": 0.30,
            "data_compression": 0.25,
            "outbound_transfer": 0.20,
            "encrypted_channel": 0.15,
            "scheduled_task": 0.10,
        }
        super().__init__("Ransomware", "fast", dist)


# --- 7. Insider Threat Attacker ---
class InsiderThreatAttacker(BaseStaticAttacker):
    """Privileged internal actor creating backdoors and modifying system logs."""

    def __init__(self):
        dist = {
            "account_creation": 0.30,
            "log_clearing": 0.25,
            "scheduled_task": 0.20,
            "process_injection": 0.15,
            "registry_persistence": 0.10,
        }
        super().__init__("Insider-Threat", "medium", dist)


# --- 8. Reconnaissance Heavy Attacker ---
class ReconnaissanceHeavyAttacker(BaseStaticAttacker):
    """Reconnaissance-heavy adversary gathering extensive network host intelligence."""

    def __init__(self):
        dist = {
            "network_scanning": 0.40,
            "service_enumeration": 0.30,
            "os_fingerprinting": 0.20,
            "credential_access": 0.10,
        }
        super().__init__("Recon-Heavy", "medium", dist)


# Factory mapping of all 8 static attacker profiles
STATIC_PROFILES: Dict[str, type] = {
    "aggressive": AggressiveAttacker,
    "stealthy": StealthyAttacker,
    "credential": CredentialFocusedAttacker,
    "lateral": LateralMoverAttacker,
    "apt": APTStyleAttacker,
    "ransomware": RansomwareAttacker,
    "insider": InsiderThreatAttacker,
    "recon": ReconnaissanceHeavyAttacker,
}


def get_static_attacker(profile_key: str) -> BaseStaticAttacker:
    """Instantiates a static attacker profile by key."""
    cls = STATIC_PROFILES.get(profile_key.lower(), AggressiveAttacker)
    return cls()


if __name__ == "__main__":
    print("==========================================================================")
    print("                  ADVERSIM STATIC ATTACKER PROFILES TEST")
    print("==========================================================================")

    sample_node = {"id": "node-server-1", "ip": "172.20.0.21"}

    for key, cls in STATIC_PROFILES.items():
        attacker = cls()
        print(f"\nProfile: {attacker.profile_name} (Timing: {attacker.timing_pattern})")
        sample_evt = attacker.attack(sample_node, round_number=1)
        print(f"  Sample Attack Event: technique='{sample_evt['technique']}' (Code: {sample_evt['code']}) | Stage: {sample_evt['stage']}")

    print("==========================================================================")
