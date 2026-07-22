"""
AdverSim Honeypot Decoy Node Module
Silently records attacker interactions, injects dynamic background noise based on fidelity level,
validates captured sequences using ConsistencyChecker, and triggers IntelligenceServer priority broadcast.
"""

import random
import numpy as np
from typing import List, Dict, Any, Optional

try:
    from simulation.honeypot.consistency_checker import ConsistencyChecker
except ImportError:
    try:
        from .consistency_checker import ConsistencyChecker
    except ImportError:
        from consistency_checker import ConsistencyChecker

try:
    from simulation.defenders.intelligence_server import IntelligenceServer
except ImportError:
    try:
        from ..defenders.intelligence_server import IntelligenceServer
    except ImportError:
        IntelligenceServer = None

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


class HoneypotNode:
    """
    Decoy node configured with fidelity level (low/medium/high).
    Silently records attack events and filters out random noise via ConsistencyChecker.
    """

    def __init__(
        self,
        node_id: str = "honeypot-node-1",
        fidelity: str = "high",
        intel_server: Optional[Any] = None
    ):
        self.node_id = node_id
        self.fidelity = fidelity.lower()  # low, medium, high
        self.intel_server = intel_server

        self.checker = ConsistencyChecker()
        self.raw_event_buffer: List[Dict[str, Any]] = []
        self.decoy_logs: List[Dict[str, Any]] = []
        self.validated_captures: List[List[Dict[str, Any]]] = []

    def receive_attack(self, event: Dict[str, Any]) -> None:
        """
        Silently records attacker interaction into raw event buffer without revealing honeypot identity.
        """
        event_entry = dict(event)
        event_entry["honeypot_node"] = self.node_id
        self.raw_event_buffer.append(event_entry)

    def inject_noise(self) -> List[Dict[str, Any]]:
        """
        Generates realistic decoy background noise events according to fidelity setting:
        - Low: 1-2 low-activity benign events
        - Medium: 3-5 standard system maintenance events
        - High: 6-10 realistic multi-service background traffic events
        """
        count_map = {"low": random.randint(1, 2), "medium": random.randint(3, 5), "high": random.randint(6, 10)}
        noise_count = count_map.get(self.fidelity, random.randint(3, 5))

        benign_techniques = ["network_scanning", "service_enumeration", "script_execution"]
        generated_noise = []

        for _ in range(noise_count):
            tech = random.choice(benign_techniques)
            noise_evt = {
                "technique": tech,
                "inter_event_delta": round(random.uniform(1.0, 5.0), 2),
                "is_noise": True,
                "honeypot_node": self.node_id
            }
            generated_noise.append(noise_evt)

        self.decoy_logs.extend(generated_noise)
        return generated_noise

    def _generate_honeypot_threat_weights(self, validated_seq: List[Dict[str, Any]]) -> np.ndarray:
        """
        Derives high-priority 30-dim threat weight vector [15 alphas, 15 betas]
        from techniques observed in a validated captured attacker sequence.
        """
        alphas = [1.0] * 15
        betas = [1.0] * 15

        observed_counts = {t: 0 for t in TECHNIQUE_KEYS}
        for item in validated_seq:
            tech = item.get("technique") if isinstance(item, dict) else str(item)
            if tech in observed_counts:
                observed_counts[tech] += 1

        for idx, tech in enumerate(TECHNIQUE_KEYS):
            if observed_counts[tech] > 0:
                # Strong weight boost for honeypot captured techniques
                alphas[idx] += float(observed_counts[tech] * 3.0)

        return np.array(alphas + betas, dtype=np.float64)

    def get_captures(self) -> List[List[Dict[str, Any]]]:
        """
        Evaluates raw buffer using ConsistencyChecker.
        Returns only validated attack sequences and triggers Intel Server priority broadcast.
        """
        if not self.raw_event_buffer:
            return self.validated_captures

        # Validate accumulated buffer
        is_valid, reason = self.checker.check(self.raw_event_buffer)

        if is_valid:
            captured_seq = list(self.raw_event_buffer)
            self.validated_captures.append(captured_seq)
            print(f"\n[HONEYPOT CAPTURE - {self.node_id}] Validated attack sequence captured! Count: {len(captured_seq)}")

            # Trigger immediate Priority Broadcast to Central Intelligence Server
            if self.intel_server is not None:
                threat_weights = self._generate_honeypot_threat_weights(captured_seq)
                self.intel_server.priority_broadcast(threat_weights)

            # Clear raw buffer after capture
            self.raw_event_buffer = []

        return self.validated_captures


if __name__ == "__main__":
    print("[TEST] Initializing HoneypotNode...")
    honeypot = HoneypotNode(node_id="honeypot-dmz-1", fidelity="high")

    # Inject background noise
    noise = honeypot.inject_noise()
    print(f"Generated {len(noise)} high fidelity noise logs.")

    # Receive attack events
    honeypot.receive_attack({"technique": "network_scanning", "inter_event_delta": 0.5})
    honeypot.receive_attack({"technique": "service_enumeration", "inter_event_delta": 0.4})
    honeypot.receive_attack({"technique": "credential_access", "inter_event_delta": 0.3})
    honeypot.receive_attack({"technique": "script_execution", "inter_event_delta": 0.2})

    captures = honeypot.get_captures()
    print(f"Total Validated Captures: {len(captures)}")
