import numpy as np
from typing import Dict, Any, List

class CybOrgEnvWrapper:
    """
    Adapter wrapper for CybORG cage-challenge-2 simulation environment.
    Provides gym-like step/reset interfaces mapped to Docker nodes.
    """
    def __init__(self, num_nodes: int = 12):
        self.num_nodes = num_nodes
        self.current_step = 0
        self.nodes = [
            "node-user-1", "node-user-2", "node-user-3", "node-user-4", "node-user-5",
            "node-server-1", "node-server-2", "node-server-3",
            "node-admin-1", "node-admin-2",
            "honeypot-1", "honeypot-2"
        ]

    def reset(self) -> Dict[str, Any]:
        self.current_step = 0
        return {
            "step": self.current_step,
            "status": "initialized",
            "active_nodes": self.nodes
        }

    def step(self, action: Dict[str, Any]) -> Dict[str, Any]:
        self.current_step += 1
        target = action.get("target_node", "node-user-1")
        surface = action.get("attack_surface", "network_scanning")
        
        # Simulate reward and state transition
        reward = np.random.uniform(-1.0, 1.0)
        done = self.current_step >= 500

        return {
            "obs": {
                "step": self.current_step,
                "target": target,
                "surface": surface,
            },
            "reward": reward,
            "done": done,
            "info": {"cyborg_step": self.current_step}
        }
