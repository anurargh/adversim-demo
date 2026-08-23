"""
AdverSim Federated Central Intelligence Server Module
Aggregates node Bayesian weight vectors using inverse False Positive Rate (FPR) weighting.
Performs periodic k-round intelligence sync broadcasts and priority honeypot broadcasts.
"""

from typing import Dict, List, Any, Optional

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    class _NpShim:
        ndarray = list
        float64 = float
        @staticmethod
        def array(data, dtype=None):
            return list(data)
        @staticmethod
        def ones(n, dtype=None):
            return [1.0] * n
    np = _NpShim()

K_ROUNDS = 5  # Sharing cycle length


class IntelligenceServer:
    """
    Central Intelligence Server for federated defender weight vector aggregation and distribution.
    """

    def __init__(self, k_rounds: int = K_ROUNDS):
        self.k_rounds = k_rounds
        self.node_vectors: Dict[str, np.ndarray] = {}
        self.node_fprs: Dict[str, float] = {}
        self.global_aggregated_vector: Optional[np.ndarray] = None

    def receive_weights(self, node_id: str, weight_vector: np.ndarray, fpr: float) -> None:
        """
        Receives and stores latest Bayesian weight vector and False Positive Rate from a node.
        """
        self.node_vectors[node_id] = np.array(weight_vector, dtype=np.float64)
        # Ensure FPR is non-zero to avoid division by zero
        self.node_fprs[node_id] = max(0.001, float(fpr))

    def aggregate(self) -> np.ndarray:
        """
        Computes inverse-FPR weighted average across all registered node weight vectors:
        W_global = sum( (1 / FPR_i) * W_i ) / sum( 1 / FPR_i )
        Nodes with lower FPR get significantly higher weight in global intelligence synthesis.
        """
        if not self.node_vectors:
            print("[INTELLIGENCE SERVER] Warning: No node vectors registered for aggregation.")
            return np.ones(30, dtype=np.float64)

        total_inv_fpr = 0.0
        weighted_sum_vector = None

        if HAS_NUMPY:
            for node_id, vec in self.node_vectors.items():
                fpr = self.node_fprs.get(node_id, 0.05)
                inv_fpr = 1.0 / fpr
                total_inv_fpr += inv_fpr

                if weighted_sum_vector is None:
                    weighted_sum_vector = inv_fpr * vec
                else:
                    weighted_sum_vector += inv_fpr * vec

            if weighted_sum_vector is not None and total_inv_fpr > 0:
                self.global_aggregated_vector = weighted_sum_vector / total_inv_fpr
            else:
                first_key = next(iter(self.node_vectors))
                self.global_aggregated_vector = self.node_vectors[first_key]
        else:
            length = len(next(iter(self.node_vectors.values())))
            weighted_sum = [0.0] * length
            for node_id, vec in self.node_vectors.items():
                fpr = self.node_fprs.get(node_id, 0.05)
                inv_fpr = 1.0 / fpr
                total_inv_fpr += inv_fpr
                for i in range(length):
                    weighted_sum[i] += inv_fpr * vec[i]

            if total_inv_fpr > 0:
                self.global_aggregated_vector = [w / total_inv_fpr for w in weighted_sum]
            else:
                self.global_aggregated_vector = list(next(iter(self.node_vectors.values())))

        print(f"[INTELLIGENCE SERVER] Aggregated {len(self.node_vectors)} node vectors (Inverse-FPR Weighted).")
        return self.global_aggregated_vector

    def broadcast(self) -> Dict[str, np.ndarray]:
        """
        Returns aggregated global weight vector for distribution to all registered nodes.
        """
        if self.global_aggregated_vector is None:
            self.aggregate()

        return {node_id: self.global_aggregated_vector.copy() for node_id in self.node_vectors.keys()}

    def priority_broadcast(self, honeypot_weights: np.ndarray) -> Dict[str, np.ndarray]:
        """
        Immediately pushes honeypot-derived threat intelligence weights to all nodes
        without waiting for the standard k-round sharing cycle.
        """
        print(f"[INTELLIGENCE SERVER - PRIORITY ALERT] Broadcasting Honeypot Threat Intel Vector to {len(self.node_vectors)} nodes!")
        self.global_aggregated_vector = np.array(honeypot_weights, dtype=np.float64)
        return {node_id: self.global_aggregated_vector.copy() for node_id in self.node_vectors.keys()}


if __name__ == "__main__":
    print("[TEST] Testing IntelligenceServer...")
    server = IntelligenceServer(k_rounds=K_ROUNDS)

    v1 = [1.5] * 30 if not HAS_NUMPY else np.ones(30) * 1.5
    v2 = [2.5] * 30 if not HAS_NUMPY else np.ones(30) * 2.5

    server.receive_weights("node-user-1", v1, fpr=0.10)
    server.receive_weights("node-server-1", v2, fpr=0.01)

    agg = server.aggregate()
    mean_val = (sum(agg) / len(agg)) if not HAS_NUMPY else float(np.mean(agg))
    print(f"Aggregated Vector Mean (Node 2 lower FPR should dominate): {mean_val:.4f}")

    priority_vec = [5.0] * 30 if not HAS_NUMPY else np.ones(30) * 5.0
    broadcast_out = server.priority_broadcast(priority_vec)
    print(f"Priority Broadcast Target Count: {len(broadcast_out)}")
