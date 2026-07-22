"""
Base Defender Node Class
"""
from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseDefender(ABC):
    def __init__(self, node_id: str, node_type: str):
        self.node_id = node_id
        self.node_type = node_type

    @abstractmethod
    def evaluate_event(self, audit_event: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate raw auditd event through detection layers."""
        pass

    @abstractmethod
    def update_weights(self, detected_surface: str) -> None:
        """Update Bayesian risk weights."""
        pass
