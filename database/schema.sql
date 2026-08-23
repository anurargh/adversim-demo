-- AdverSim Database Schema (PostgreSQL & SQLite Compatible)

CREATE TABLE IF NOT EXISTS sim_runs (
    run_id VARCHAR(64) PRIMARY KEY,
    condition_id CHAR(1) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threat_alerts (
    alert_id VARCHAR(64) PRIMARY KEY,
    run_id VARCHAR(64) REFERENCES sim_runs(run_id) ON DELETE CASCADE,
    round_num INT NOT NULL,
    node_id VARCHAR(64) NOT NULL,
    mitre_code VARCHAR(16) NOT NULL,
    stage VARCHAR(64) NOT NULL,
    attacker_profile VARCHAR(64) NOT NULL,
    layer1_if_score DOUBLE PRECISION NOT NULL,
    layer2_mc_score DOUBLE PRECISION NOT NULL,
    fused_score DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    action_taken VARCHAR(128) NOT NULL,
    is_honeypot_capture BOOLEAN DEFAULT FALSE,
    rejected_by_consistency BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ablation_metrics (
    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id VARCHAR(64) REFERENCES sim_runs(run_id) ON DELETE CASCADE,
    condition_id CHAR(1) NOT NULL,
    mttd_seconds DOUBLE PRECISION NOT NULL,
    fpr_percentage DOUBLE PRECISION NOT NULL,
    weight_convergence_rounds INT NOT NULL,
    detection_regret DOUBLE PRECISION NOT NULL,
    collaborative_advantage DOUBLE PRECISION NOT NULL,
    honeypot_engagement_rate DOUBLE PRECISION NOT NULL,
    prediction_accuracy DOUBLE PRECISION NOT NULL,
    consistency_rejection_rate DOUBLE PRECISION NOT NULL,
    bandit_regret DOUBLE PRECISION NOT NULL
);
