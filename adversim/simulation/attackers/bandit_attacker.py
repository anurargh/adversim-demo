"""
AdverSim Multi-Armed Bandit (UCB) Adaptive Attacker Module
"""

import math
import random
from typing import Dict, List, Any, Optional

try:
    from simulation.mitre_map import MITRE_TECHNIQUES, create_event
except ImportError:
    from ..mitre_map import MITRE_TECHNIQUES, create_event


class BanditAttacker:
    """
    Main adaptive attacker agent utilizing Upper Confidence Bound (UCB) algorithm.
    Selects attack surfaces dynamically, tracks success/attempt statistics,
    profiles background node noise to bypass honeypots, and generates fake
    poisoning sequences.
    """

    def __init__(self, name: str = "UCB_Bandit_Attacker"):
        self.name = name
        self.techniques = list(MITRE_TECHNIQUES.keys())
        self.attempt_count: Dict[str, int] = {t: 0 for t in self.techniques}
        self.success_count: Dict[str, float] = {t: 0.0 for t in self.techniques}
        self.total_attempts: int = 0

    def compute_ucb_score(self, technique: str) -> float:
        """
        Computes Upper Confidence Bound (UCB1) score:
        UCB = avg_success + sqrt(2 * log(total_attempts) / attempts)
        Unvisited techniques (attempts == 0) return infinity to force exploration.
        """
        attempts = self.attempt_count[technique]
        if attempts == 0:
            return float("inf")

        avg_success = self.success_count[technique] / attempts
        total = max(1, self.total_attempts)
        exploration = math.sqrt((2.0 * math.log(total)) / attempts)
        return avg_success + exploration

    def get_ucb_scores(self) -> Dict[str, float]:
        """Returns current UCB scores for all 15 MITRE attack surfaces."""
        return {t: self.compute_ucb_score(t) for t in self.techniques}

    def pick_technique(self, round_number: int) -> str:
        """
        Selects the attack technique with the highest UCB score.
        Prints UCB score table every 10 rounds for verification.
        """
        scores = self.get_ucb_scores()

        # Find maximum score and break ties randomly
        max_score = max(scores.values())
        best_techniques = [t for t, s in scores.items() if s == max_score]
        chosen_technique = random.choice(best_techniques)

        # Print UCB verification table every 10 rounds
        if round_number % 10 == 0:
            print(f"\n==========================================================================")
            print(f" [VERIFICATION - Round {round_number}] BANDIT ATTACKER UCB STATS ({self.name})")
            print(f"==========================================================================")
            print(f"{'TECHNIQUE KEY':<22} | {'ATTEMPTS':<8} | {'SUCCESSES':<9} | {'AVG SUCCESS':<11} | {'UCB SCORE'}")
            print("-" * 75)
            for t in self.techniques:
                att = self.attempt_count[t]
                succ = self.success_count[t]
                avg = (succ / att) if att > 0 else 0.0
                sc = scores[t]
                sc_str = "INF (EXPLORE)" if math.isinf(sc) else f"{sc:.4f}"
                marker = "  <-- PICKED" if t == chosen_technique else ""
                print(f"{t:<22} | {att:<8} | {succ:<9.1f} | {avg:<11.2f} | {sc_str}{marker}")
            print("==========================================================================\n")

        return chosen_technique

    def update(self, technique: str, was_detected: bool) -> None:
        """
        Updates attempt and success counters based on defender outcome.
        was_detected == False implies successful evasion for the attacker.
        """
        if technique in self.attempt_count:
            self.attempt_count[technique] += 1
            self.total_attempts += 1
            if not was_detected:
                self.success_count[technique] += 1.0

    def probe_nodes(self, node_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Profiles node background activity level to avoid honeypots.
        Honeypots exhibit unnatural background noise / zero organic traffic.
        Returns node list sorted with least suspicious / most natural targets first.
        """
        scored_nodes = []
        for node in node_list:
            bg_noise = node.get("background_noise_level", random.uniform(0.1, 0.9))
            is_honeypot = node.get("is_honeypot", False) or node.get("type") == "Honeypot"

            # Honeypots penalized due to unnatural entropy and activity signature
            suspiciousness = bg_noise + (0.6 if is_honeypot else 0.0)
            scored_nodes.append((suspiciousness, node))

        scored_nodes.sort(key=lambda x: x[0])
        return [item[1] for item in scored_nodes]

    def get_surface_weights(self) -> Dict[str, float]:
        """
        Returns normalized probability distribution over techniques
        for visualization in the Bandit Surface Heatmap dashboard component.
        """
        scores = {}
        for t in self.techniques:
            sc = self.compute_ucb_score(t)
            scores[t] = 10.0 if math.isinf(sc) else max(0.01, sc)

        total_score = sum(scores.values())
        if total_score > 0:
            return {t: round(s / total_score, 4) for t, s in scores.items()}
        return {t: round(1.0 / len(self.techniques), 4) for t in self.techniques}

    def generate_fake_sequence(self, length: int = 5) -> List[str]:
        """
        Generates a fake sequence of techniques to inject into honeypots
        to poison stage predictor training data.
        """
        return [random.choice(self.techniques) for _ in range(length)]


if __name__ == "__main__":
    print("[TEST] Initializing BanditAttacker and testing 20 rounds...")
    bandit = BanditAttacker()
    sample_nodes = [
        {"id": "node-user-1", "type": "User", "background_noise_level": 0.2, "is_honeypot": False},
        {"id": "honeypot-1", "type": "Honeypot", "background_noise_level": 0.9, "is_honeypot": True},
    ]

    for r in range(1, 21):
        tech = bandit.pick_technique(r)
        detected = random.random() < 0.4
        bandit.update(tech, was_detected=detected)

    print("\n[TEST] Probing nodes sorted by stealth rank:")
    sorted_nodes = bandit.probe_nodes(sample_nodes)
    for n in sorted_nodes:
        print(f"  Node: {n['id']} | Type: {n['type']}")

    print("\n[TEST] Surface Weights Heatmap Vector:")
    print(bandit.get_surface_weights())
