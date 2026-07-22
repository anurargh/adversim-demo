import numpy as np
from typing import Dict, Any, List

class CybOrgEnvWrapper:
    """
    Adapter wrapper for CybORG cage-challenge-2 simulation environment.
    Provides gym-like step/reset interfaces mapped to Docker nodes.
    """
    def __init__(self, num_nodes: int = 7):
        self.num_nodes = num_nodes
        self.current_step = 0
        self.nodes = [
            "user_node_1", "user_node_2", "dmz_gateway", 
            "server_cluster", "admin_controller", "honeypot_sql", "honeypot_admin"
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
        target = action.get("target_node", "user_node_1")
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
