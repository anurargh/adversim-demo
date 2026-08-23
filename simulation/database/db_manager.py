"""
AdverSim Database Manager Module
Handles local SQLite and PostgreSQL persistence using database/schema.sql.
"""
import os
import sqlite3
from typing import Dict, List, Any, Optional
from datetime import datetime

SCHEMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database", "schema.sql")

class DatabaseManager:
    """
    Persistent store for simulation runs, audit logs, threat alerts, and ablation metrics.
    Defaults to a local SQLite database with PostgreSQL schema compatibility.
    """

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database")
            os.makedirs(db_dir, exist_ok=True)
            self.db_path = os.path.join(db_dir, "adversim.db")
        else:
            self.db_path = db_path
            
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initializes database schema from schema.sql or fallback definition."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # SQLite schema matching schema.sql
        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS sim_runs (
            run_id VARCHAR(64) PRIMARY KEY,
            condition_id CHAR(1) NOT NULL,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            total_rounds INT DEFAULT 0,
            status VARCHAR(32) DEFAULT 'running'
        );

        CREATE TABLE IF NOT EXISTS node_audit_logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id VARCHAR(64) REFERENCES sim_runs(run_id) ON DELETE CASCADE,
            round_num INT NOT NULL,
            node_id VARCHAR(64) NOT NULL,
            event_type VARCHAR(64) NOT NULL,
            auditd_syscall VARCHAR(64),
            raw_payload TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS threat_alerts (
            alert_id VARCHAR(64) PRIMARY KEY,
            run_id VARCHAR(64) REFERENCES sim_runs(run_id) ON DELETE CASCADE,
            round_num INT NOT NULL,
            node_id VARCHAR(64) NOT NULL,
            mitre_code VARCHAR(16) NOT NULL,
            stage VARCHAR(64) NOT NULL,
            attacker_profile VARCHAR(64) NOT NULL,
            layer1_if_score REAL NOT NULL,
            layer2_mc_score REAL NOT NULL,
            fused_score REAL NOT NULL,
            confidence REAL NOT NULL,
            action_taken VARCHAR(128) NOT NULL,
            is_honeypot_capture BOOLEAN DEFAULT 0,
            rejected_by_consistency BOOLEAN DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ablation_metrics (
            metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id VARCHAR(64) REFERENCES sim_runs(run_id) ON DELETE CASCADE,
            condition_id CHAR(1) NOT NULL,
            mttd_seconds REAL NOT NULL,
            fpr_percentage REAL NOT NULL,
            weight_convergence_rounds INT NOT NULL,
            detection_regret REAL NOT NULL,
            collaborative_advantage REAL NOT NULL,
            honeypot_engagement_rate REAL NOT NULL,
            prediction_accuracy REAL NOT NULL,
            consistency_rejection_rate REAL NOT NULL,
            bandit_regret REAL NOT NULL
        );
        """)
        conn.commit()
        conn.close()

    def record_run_start(self, run_id: str, condition_id: str) -> None:
        conn = self._get_connection()
        conn.execute(
            "INSERT OR REPLACE INTO sim_runs (run_id, condition_id, status) VALUES (?, ?, 'running')",
            (run_id, condition_id)
        )
        conn.commit()
        conn.close()

    def record_run_end(self, run_id: str, total_rounds: int, status: str = "completed") -> None:
        conn = self._get_connection()
        conn.execute(
            "UPDATE sim_runs SET end_time = ?, total_rounds = ?, status = ? WHERE run_id = ?",
            (datetime.utcnow().isoformat(), total_rounds, status, run_id)
        )
        conn.commit()
        conn.close()

    def insert_audit_log(
        self,
        run_id: str,
        round_num: int,
        node_id: str,
        event_type: str,
        auditd_syscall: Optional[str] = None,
        raw_payload: Optional[str] = None
    ) -> None:
        conn = self._get_connection()
        conn.execute(
            """
            INSERT INTO node_audit_logs (run_id, round_num, node_id, event_type, auditd_syscall, raw_payload)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (run_id, round_num, node_id, event_type, auditd_syscall, raw_payload)
        )
        conn.commit()
        conn.close()

    def insert_threat_alert(self, alert: Dict[str, Any]) -> None:
        conn = self._get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO threat_alerts (
                alert_id, run_id, round_num, node_id, mitre_code, stage, attacker_profile,
                layer1_if_score, layer2_mc_score, fused_score, confidence, action_taken,
                is_honeypot_capture, rejected_by_consistency
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                alert.get("alert_id", f"alt-{int(datetime.utcnow().timestamp() * 1000)}"),
                alert.get("run_id", "default-run"),
                alert.get("round_num", 0),
                alert.get("node_id", "unknown"),
                alert.get("mitre_code", "T1059"),
                alert.get("stage", "Execution"),
                alert.get("attacker_profile", "BanditAttacker"),
                float(alert.get("layer1_if_score", 0.0)),
                float(alert.get("layer2_mc_score", 0.0)),
                float(alert.get("fused_score", 0.0)),
                float(alert.get("confidence", 0.0)),
                alert.get("action_taken", "Alert Logged"),
                1 if alert.get("is_honeypot_capture", False) else 0,
                1 if alert.get("rejected_by_consistency", False) else 0
            )
        )
        conn.commit()
        conn.close()

    def insert_ablation_metric(self, run_id: str, condition_id: str, metrics: Dict[str, Any]) -> None:
        conn = self._get_connection()
        conn.execute(
            """
            INSERT INTO ablation_metrics (
                run_id, condition_id, mttd_seconds, fpr_percentage, weight_convergence_rounds,
                detection_regret, collaborative_advantage, honeypot_engagement_rate,
                prediction_accuracy, consistency_rejection_rate, bandit_regret
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                condition_id,
                float(metrics.get("mttd", 0.0)),
                float(metrics.get("fpr", 0.0)),
                int(metrics.get("weight_convergence_rounds", 0)),
                float(metrics.get("detection_regret", 0.0)),
                float(metrics.get("collaborative_advantage", 0.0)),
                float(metrics.get("honeypot_engagement_rate", 0.0)),
                float(metrics.get("prediction_accuracy", 0.0)),
                float(metrics.get("consistency_rejection_rate", 0.0)),
                float(metrics.get("bandit_regret", 0.0))
            )
        )
        conn.commit()
        conn.close()

    def get_recent_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        rows = conn.execute("SELECT * FROM node_audit_logs ORDER BY log_id DESC LIMIT ?", (limit,)).fetchall()
        result = [dict(row) for row in rows]
        conn.close()
        return result
