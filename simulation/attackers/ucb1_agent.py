"""
UCB1 Adaptive Attacker Agent
"""
from typing import Dict, Any, Optional
from simulation.attackers.bandit_attacker import BanditAttacker

class UCB1Attacker(BanditAttacker):
    """Alias for BanditAttacker implementing UCB1 exploration-exploitation."""
    def __init__(self, name: str = "UCB1_Attacker", orchestrator: Optional[Any] = None):
        super().__init__(name=name, orchestrator=orchestrator)
