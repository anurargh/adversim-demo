"""
AdverSim Experiment Ablation Study Orchestrator Module
Runs 6 experimental conditions across 500 rounds each to benchmark multi-modal defense performance:
Condition 1 / A: Baseline
Condition 2 / B: + Collaboration
Condition 3 / C: + Honeypot
Condition 4 / D: + Predictor
Condition 5 / E: All Defenses (Standard Attacker)
Condition 6 / F: Full System (Bandit Attacker)

Records per-round metrics: MTTD, FPR, weight_delta, prediction_accuracy, honeypot_engagement, bandit_regret.
Saves results to Parquet files and generates summary comparison tables.
"""

import os
import math
import random
import time
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union

# Import AdverSim simulation modules with robust fallback handlers
try:
    from simulation.mitre_map import MITRE_TECHNIQUES, KILL_CHAIN_STAGES, get_stage
    from simulation.detection.isolation_forest import IsolationForestDetector
    from simulation.detection.markov_detector import MarkovDetector
    from simulation.detection.alert_fusion import AlertFusion
    from simulation.defenders.bayesian_weights import BayesianWeightVector
    from simulation.defenders.intelligence_server import IntelligenceServer, K_ROUNDS
    from simulation.honeypot.honeypot_node import HoneypotNode
    from simulation.predictor.stage_predictor import StagePredictor
    from simulation.attackers.ucb1_agent import UCB1Attacker
    from simulation.attackers.contextual_bandit import ContextualBanditAttacker
except ImportError:
    try:
        from ..mitre_map import MITRE_TECHNIQUES, KILL_CHAIN_STAGES, get_stage
        from ..detection.isolation_forest import IsolationForestDetector
        from ..detection.markov_detector import MarkovDetector
        from ..detection.alert_fusion import AlertFusion
        from ..defenders.bayesian_weights import BayesianWeightVector
        from ..defenders.intelligence_server import IntelligenceServer, K_ROUNDS
        from ..honeypot.honeypot_node import HoneypotNode
        from ..predictor.stage_predictor import StagePredictor
        from ..attackers.ucb1_agent import UCB1Attacker
        from ..attackers.contextual_bandit import ContextualBanditAttacker
    except ImportError:
        # Fallback inline definitions if running standalone
        KILL_CHAIN_STAGES = [
            "Reconnaissance", "Initial Access", "Execution",
            "Persistence", "Defense Evasion", "Lateral Movement", "Exfiltration"
        ]
        MITRE_TECHNIQUES = {
            "network_scanning": {"stage": "Reconnaissance"},
            "service_enumeration": {"stage": "Reconnaissance"},
            "os_fingerprinting": {"stage": "Reconnaissance"},
            "credential_access": {"stage": "Initial Access"},
            "script_execution": {"stage": "Execution"},
            "scheduled_task": {"stage": "Persistence"},
            "process_injection": {"stage": "Defense Evasion"},
            "registry_persistence": {"stage": "Persistence"},
            "account_creation": {"stage": "Persistence"},
            "log_clearing": {"stage": "Defense Evasion"},
            "lateral_movement": {"stage": "Lateral Movement"},
            "pass_the_hash": {"stage": "Lateral Movement"},
            "outbound_transfer": {"stage": "Exfiltration"},
            "data_compression": {"stage": "Exfiltration"},
            "encrypted_channel": {"stage": "Exfiltration"},
        }

        def get_stage(tech: str) -> str:
            return MITRE_TECHNIQUES.get(tech, {}).get("stage", "Execution")

        K_ROUNDS = 5


TECHNIQUE_KEYS = list(MITRE_TECHNIQUES.keys())


class AblationRunner:
    """
    Experimental Orchestrator running full ablation benchmarks across 6 defined defense/attacker conditions.
    """

    CONDITIONS = [
        {
            "id": "1",
            "code": "A",
            "name": "Baseline (No Collab, No Honeypot, No Predictor, Std Attacker)",
            "use_collaboration": False,
            "use_honeypot": False,
            "use_predictor": False,
            "use_bandit_attacker": False,
        },
        {
            "id": "2",
            "code": "B",
            "name": "+ Collaboration (Federated Intel Sharing)",
            "use_collaboration": True,
            "use_honeypot": False,
            "use_predictor": False,
            "use_bandit_attacker": False,
        },
        {
            "id": "3",
            "code": "C",
            "name": "+ Honeypot (Decoy Ingestion & Priority Alert)",
            "use_collaboration": False,
            "use_honeypot": True,
            "use_predictor": False,
            "use_bandit_attacker": False,
        },
        {
            "id": "4",
            "code": "D",
            "name": "+ Predictor (Kill-Chain Proactive Hardening)",
            "use_collaboration": False,
            "use_honeypot": False,
            "use_predictor": True,
            "use_bandit_attacker": False,
        },
        {
            "id": "5",
            "code": "E",
            "name": "All Defenses (Standard Attacker)",
            "use_collaboration": True,
            "use_honeypot": True,
            "use_predictor": True,
            "use_bandit_attacker": False,
        },
        {
            "id": "6",
            "code": "F",
            "name": "Full System (Bandit Attacker)",
            "use_collaboration": True,
            "use_honeypot": True,
            "use_predictor": True,
            "use_bandit_attacker": True,
        },
    ]

    def __init__(self, rounds_per_condition: int = 500, output_dir: str = "simulation_results"):
        self.rounds_per_condition = rounds_per_condition
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

        self.results: Dict[str, pd.DataFrame] = {}
        self.summary_metrics: Dict[str, Dict[str, float]] = {}

    def _generate_synthetic_baseline_data(self) -> Tuple[List[List[Dict[str, Any]]], List[List[str]]]:
        """Generates baseline normal event windows and sequence history for detector training."""
        normal_windows = []
        normal_sequences = []

        for _ in range(80):
            seq = ["network_scanning", "service_enumeration", "os_fingerprinting"]
            win = [
                {"technique": "network_scanning", "inter_event_delta": random.uniform(0.3, 0.8)},
                {"technique": "service_enumeration", "inter_event_delta": random.uniform(0.3, 0.7)},
                {"technique": "os_fingerprinting", "inter_event_delta": random.uniform(0.4, 0.9)},
            ]
            normal_windows.append(win)
            normal_sequences.append(seq)

        for _ in range(50):
            seq = ["service_enumeration", "credential_access", "script_execution"]
            win = [
                {"technique": "service_enumeration", "inter_event_delta": random.uniform(0.3, 0.6)},
                {"technique": "credential_access", "inter_event_delta": random.uniform(0.2, 0.5)},
                {"technique": "script_execution", "inter_event_delta": random.uniform(0.3, 0.8)},
            ]
            normal_windows.append(win)
            normal_sequences.append(seq)

        return normal_windows, normal_sequences

    def run_single_condition(self, cond_idx: int, cond_cfg: Dict[str, Any]) -> pd.DataFrame:
        """
        Executes a 500-round simulation run for a specific experimental condition.
        """
        cond_code = cond_cfg["code"]
        cond_name = cond_cfg["name"]
        use_collab = cond_cfg["use_collaboration"]
        use_honeypot = cond_cfg["use_honeypot"]
        use_predictor = cond_cfg["use_predictor"]
        use_bandit = cond_cfg["use_bandit_attacker"]

        print(f"\n==========================================================================")
        print(f" STARTING EXPERIMENT CONDITION {cond_idx}/6 [{cond_code}]: {cond_name}")
        print(f" Rounds: {self.rounds_per_condition} | Collab: {use_collab} | Honeypot: {use_honeypot} | Predictor: {use_predictor} | Bandit: {use_bandit}")
        print(f"==========================================================================\n")

        # 1. Initialize Detectors & Train Baseline Models
        normal_wins, normal_seqs = self._generate_synthetic_baseline_data()
        if_detector = IsolationForestDetector()
        if_detector.train(normal_wins)

        markov_detector = MarkovDetector()
        markov_detector.train(normal_seqs)

        fusion_engine = AlertFusion()

        # 2. Initialize Defender Weight Vector & Intelligence Server
        node_weights = BayesianWeightVector()
        intel_server = IntelligenceServer(k_rounds=K_ROUNDS)

        # Register secondary nodes if collaboration enabled
        if use_collab:
            intel_server.receive_weights("node-primary", node_weights.to_vector(), fpr=0.03)
            intel_server.receive_weights("node-secondary-1", BayesianWeightVector().to_vector(), fpr=0.04)
            intel_server.receive_weights("node-secondary-2", BayesianWeightVector().to_vector(), fpr=0.02)

        # 3. Initialize Honeypot & Predictor
        honeypot = HoneypotNode(node_id="honeypot-dmz", fidelity="high", intel_server=intel_server) if use_honeypot else None
        predictor = StagePredictor(confidence_threshold=0.50) if use_predictor else None
        if predictor:
            predictor.train(normal_seqs)

        # 4. Initialize Attacker Agent
        if use_bandit:
            try:
                attacker = UCB1Attacker()
            except Exception:
                attacker = None
        else:
            attacker = None

        # Tracking state metrics
        round_records = []
        total_detections = 0
        total_detection_latency = 0.0
        total_benign_evals = 0
        false_positives = 0
        cumulative_regret = 0.0
        prev_weights_normalized = np.array(list(node_weights.get_weights().values()))
        prev_stage = "Reconnaissance"

        for r in range(1, self.rounds_per_condition + 1):
            # --- STEP A: FIRE ATTACKER ---
            if use_bandit and attacker is not None:
                if hasattr(attacker, "select_action"):
                    action_idx = attacker.select_action()
                    chosen_tech = TECHNIQUE_KEYS[action_idx % len(TECHNIQUE_KEYS)]
                else:
                    chosen_tech = random.choice(TECHNIQUE_KEYS)
            else:
                # Standard sequential or heuristic kill-chain attacker
                stage_idx = (r - 1) % len(KILL_CHAIN_STAGES)
                current_kill_stage = KILL_CHAIN_STAGES[stage_idx]
                matching_techs = [t for t, info in MITRE_TECHNIQUES.items() if info.get("stage") == current_kill_stage]
                chosen_tech = random.choice(matching_techs) if matching_techs else random.choice(TECHNIQUE_KEYS)

            current_stage = get_stage(chosen_tech)

            # Generate event window for chosen technique
            inter_delta = round(random.uniform(0.01, 0.25) if current_stage in ["Execution", "Exfiltration"] else random.uniform(0.3, 1.0), 3)
            event_window = [
                {"technique": chosen_tech, "inter_event_delta": inter_delta},
                {"technique": chosen_tech, "inter_event_delta": inter_delta * 0.8},
            ]

            # --- STEP B: RUN MULTI-MODAL DETECTION ---
            if_score = if_detector.score(event_window)
            markov_logp = markov_detector.log_probability(event_window)
            fusion_res = fusion_engine.fuse(if_score=if_score, markov_log_prob=markov_logp, technique=chosen_tech)

            is_alert = fusion_res["is_alert"]
            fused_score = fusion_res["fused_score"]

            # Calculate MTTD metric (Mean Time To Detect in seconds/latency)
            if is_alert:
                total_detections += 1
                latency = inter_delta * 2.0
                total_detection_latency += latency
                mttd = round(total_detection_latency / max(1, total_detections), 4)
            else:
                mttd = round(total_detection_latency / max(1, total_detections), 4) if total_detections > 0 else 2.5000

            # Evaluate False Positive Rate (FPR) on occasional benign evaluation
            if r % 3 == 0:
                total_benign_evals += 1
                benign_win = [{"technique": "network_scanning", "inter_event_delta": 0.6}]
                b_if = if_detector.score(benign_win)
                b_mk = markov_detector.log_probability(benign_win)
                b_fuse = fusion_engine.fuse(if_score=b_if, markov_log_prob=b_mk, technique="network_scanning")
                if b_fuse["is_alert"]:
                    false_positives += 1

            current_fpr = round(false_positives / max(1, total_benign_evals), 4)

            # --- STEP C: UPDATE DEFENDER WEIGHTS & COLLABORATION ---
            if is_alert:
                node_weights.update_on_detection(chosen_tech, weight_boost=1.2)
            node_weights.decay(decay_factor=0.995)

            current_weights_normalized = np.array(list(node_weights.get_weights().values()))
            weight_delta = round(float(np.linalg.norm(current_weights_normalized - prev_weights_normalized)), 5)
            prev_weights_normalized = current_weights_normalized.copy()

            # Periodic Federated Collaboration sync
            if use_collab and r % K_ROUNDS == 0:
                intel_server.receive_weights("node-primary", node_weights.to_vector(), fpr=max(0.01, current_fpr))
                agg_vector = intel_server.aggregate()
                node_weights.from_vector(agg_vector)

            # --- STEP D: HONEYPOT ENGAGEMENT ---
            honeypot_engaged = 0.0
            if use_honeypot and honeypot is not None:
                # Attacker interacts with honeypot with 25% probability or during recon
                if random.random() < 0.25 or current_stage == "Reconnaissance":
                    honeypot.receive_attack({"technique": chosen_tech, "inter_event_delta": inter_delta})
                    honeypot.inject_noise()
                    captures = honeypot.get_captures()
                    if captures:
                        honeypot_engaged = 1.0

            # --- STEP E: STAGE PREDICTOR & HARDENING ---
            pred_accuracy = 0.0
            if use_predictor and predictor is not None:
                next_stage_pred, conf = predictor.predict_next(prev_stage)
                pred_accuracy = 1.0 if next_stage_pred == current_stage else 0.0
                if conf > 0.50:
                    hardening_techs = predictor.get_recommended_hardening(prev_stage)
                    if chosen_tech in hardening_techs:
                        # Pre-hardening penalty applied to attacker signal
                        fused_score = min(1.0, fused_score + 0.10)

                predictor.train([event_window])
                prev_stage = current_stage

            # --- STEP F: BANDIT REGRET TRACKING ---
            if use_bandit and attacker is not None:
                # Optimal reward = max evasion/damage reward (1.0 - fused_score)
                reward = max(0.0, 1.0 - fused_score)
                optimal_reward = 0.95
                round_regret = max(0.0, optimal_reward - reward)
                cumulative_regret += round_regret

                if hasattr(attacker, "update"):
                    attacker.update(action_idx if 'action_idx' in locals() else 0, reward)
            else:
                round_regret = 0.0

            # Log Round Record
            rec = {
                "round": r,
                "condition_id": cond_code,
                "technique": chosen_tech,
                "stage": current_stage,
                "fused_score": fused_score,
                "is_alert": int(is_alert),
                "MTTD": mttd,
                "FPR": current_fpr,
                "weight_delta": weight_delta,
                "prediction_accuracy": pred_accuracy,
                "honeypot_engagement": honeypot_engaged,
                "bandit_regret": round(cumulative_regret, 4),
            }
            round_records.append(rec)

            # --- PRINT CLEAR PROGRESS ---
            if r % 50 == 0 or r == self.rounds_per_condition:
                print(f"[PROGRESS] Round {r:3d}/{self.rounds_per_condition} | Condition {cond_idx}/6 [{cond_code}] | Current MTTD: {mttd:.3f}s | Current FPR: {current_fpr:.4f}")

        # Convert to DataFrame
        df_res = pd.DataFrame(round_records)
        self.results[cond_code] = df_res

        # Save Parquet File
        parquet_path = os.path.join(self.output_dir, f"condition_{cond_code}_results.parquet")
        csv_path = os.path.join(self.output_dir, f"condition_{cond_code}_results.csv")

        try:
            df_res.to_parquet(parquet_path, index=False)
            print(f"[SAVED] Condition {cond_code} results saved to Parquet: {parquet_path}")
        except Exception as e:
            df_res.to_csv(csv_path, index=False)
            print(f"[SAVED FALLBACK] Parquet engine unavailable ({e}). Saved CSV to: {csv_path}")

        # Compute summary averages
        self.summary_metrics[cond_code] = {
            "condition_code": cond_code,
            "condition_name": cond_name,
            "final_mttd": df_res["MTTD"].iloc[-1],
            "final_fpr": df_res["FPR"].iloc[-1],
            "avg_weight_delta": round(df_res["weight_delta"].mean(), 5),
            "avg_pred_acc": round(df_res["prediction_accuracy"].mean(), 4),
            "total_honeypot_captures": int(df_res["honeypot_engagement"].sum()),
            "total_bandit_regret": round(df_res["bandit_regret"].iloc[-1], 2),
        }

        return df_res

    def run_all_conditions(self) -> Dict[str, pd.DataFrame]:
        """
        Runs all 6 experimental conditions sequentially.
        """
        print("\n==========================================================================")
        print("    STARTING FULL ADVERSIM ABLATION STUDY (6 CONDITIONS x 500 ROUNDS)")
        print("==========================================================================\n")

        start_time = time.time()
        for idx, cfg in enumerate(self.CONDITIONS, 1):
            self.run_single_condition(idx, cfg)

        elapsed = time.time() - start_time
        print(f"\n==========================================================================")
        print(f" ALL 6 CONDITIONS COMPLETED IN {elapsed:.2f} SECONDS!")
        print(f"==========================================================================\n")

        self.compare_conditions()
        return self.results

    def get_results(self) -> Dict[str, pd.DataFrame]:
        """
        Returns dictionary mapping condition code (A..F) to result DataFrames.
        """
        return self.results

    def compare_conditions(self) -> None:
        """
        Prints clean formatted summary comparison table across all 6 conditions.
        """
        print("\n=========================================================================================================")
        print("                                   ADVERSIM ABLATION STUDY SUMMARY TABLE")
        print("=========================================================================================================")
        header = f"{'COND':<5} | {'NAME':<38} | {'MTTD (s)':<10} | {'FPR':<8} | {'WT DELTA':<10} | {'PRED ACC':<10} | {'HP CAPT':<8} | {'REGRET':<8}"
        print(header)
        print("-" * len(header))

        for code in ["A", "B", "C", "D", "E", "F"]:
            if code in self.summary_metrics:
                m = self.summary_metrics[code]
                c_code = m["condition_code"]
                c_name = m["condition_name"][:38]
                mttd = f"{m['final_mttd']:.3f}"
                fpr = f"{m['final_fpr']:.4f}"
                wdelta = f"{m['avg_weight_delta']:.5f}"
                pacc = f"{m['avg_pred_acc']:.1%}"
                hp = f"{m['total_honeypot_captures']}"
                regret = f"{m['total_bandit_regret']:.1f}"

                print(f"{c_code:<5} | {c_name:<38} | {mttd:<10} | {fpr:<8} | {wdelta:<10} | {pacc:<10} | {hp:<8} | {regret:<8}")

        print("=========================================================================================================\n")


if __name__ == "__main__":
    print("[TEST] Running AblationRunner test run (50 rounds per condition for rapid verification)...")
    runner = AblationRunner(rounds_per_condition=50)
    runner.run_all_conditions()
