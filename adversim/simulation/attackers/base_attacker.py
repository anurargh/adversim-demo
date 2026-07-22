"""
AdverSim Base Attacker Interface
"""
from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAttacker(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def select_action(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Select attack surface and target node based on current observation."""
        pass

    @abstractmethod
    def update_feedback(self, reward: float, detected: bool) -> None:
        """Receive environment or defender feedback."""
        pass
