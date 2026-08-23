"""
Contextual Multi-Armed Bandit Attacker
"""
import random
import math
from typing import Dict, List, Any, Optional
from simulation.attackers.bandit_attacker import BanditAttacker

class ContextualBanditAttacker(BanditAttacker):
    """
    Contextual Bandit Attacker incorporating target node state and defender alertness
    into technique selection policy.
    """
    def __init__(self, name: str = "Contextual_Bandit_Attacker", orchestrator: Optional[Any] = None):
        super().__init__(name=name, orchestrator=orchestrator)
        self.context_weights: Dict[str, Dict[str, float]] = {
            t: {"User": 1.0, "Server": 1.2, "Admin": 0.8, "Honeypot": 0.2} for t in self.techniques
        }

    def pick_contextual_technique(self, target_node_type: str, round_number: int) -> str:
        ucb_scores = self.get_ucb_scores()
        weighted_scores = {}
        for t, score in ucb_scores.items():
            mult = self.context_weights.get(t, {}).get(target_node_type, 1.0)
            weighted_scores[t] = (score * mult) if not math.isinf(score) else float("inf")

        max_val = max(weighted_scores.values())
        best = [t for t, s in weighted_scores.items() if s == max_val]
        return random.choice(best)
