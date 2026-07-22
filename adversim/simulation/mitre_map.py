"""
AdverSim MITRE ATT&CK Mapping Module
Provides surface mapping, kill chain stage lookup, and auditd event creation helpers.
"""

import time
import uuid
import random
from datetime import datetime
from typing import Dict, List, Any, Optional

# 1. Kill Chain Stages in strict chronological order
KILL_CHAIN_STAGES: List[str] = [
    "Reconnaissance",
    "Initial Access",
    "Execution",
    "Persistence",
    "Defense Evasion",
    "Lateral Movement",
    "Exfiltration",
]

# 2. Complete dictionary mapping 15 attack surfaces to MITRE ATT&CK codes, names, tactics, and kill chain stages
MITRE_TECHNIQUES: Dict[str, Dict[str, str]] = {
    "network_scanning": {
        "code": "T1046",
        "name": "Network Service Discovery",
        "tactic": "Reconnaissance",
        "stage": "Reconnaissance",
    },
    "service_enumeration": {
        "code": "T1592",
        "name": "Gather Victim Host Information",
        "tactic": "Reconnaissance",
        "stage": "Reconnaissance",
    },
    "os_fingerprinting": {
        "code": "T1082",
        "name": "System Information Discovery",
        "tactic": "Discovery",
        "stage": "Reconnaissance",
    },
    "credential_access": {
        "code": "T1078",
        "name": "Valid Accounts",
        "tactic": "Credential Access",
        "stage": "Initial Access",
    },
    "script_execution": {
        "code": "T1059",
        "name": "Command and Scripting Interpreter",
        "tactic": "Execution",
        "stage": "Execution",
    },
    "scheduled_task": {
        "code": "T1053",
        "name": "Scheduled Task/Job",
        "tactic": "Execution",
        "stage": "Execution",
    },
    "process_injection": {
        "code": "T1055",
        "name": "Process Injection",
        "tactic": "Defense Evasion",
        "stage": "Execution",
    },
    "registry_persistence": {
        "code": "T1547",
        "name": "Boot or Logon Autostart Execution",
        "tactic": "Persistence",
        "stage": "Persistence",
    },
    "account_creation": {
        "code": "T1136",
        "name": "Create Account",
        "tactic": "Persistence",
        "stage": "Persistence",
    },
    "log_clearing": {
        "code": "T1070",
        "name": "Indicator Removal on Host",
        "tactic": "Defense Evasion",
        "stage": "Defense Evasion",
    },
    "lateral_movement": {
        "code": "T1021",
        "name": "Remote Services",
        "tactic": "Lateral Movement",
        "stage": "Lateral Movement",
    },
    "pass_the_hash": {
        "code": "T1550",
        "name": "Use Alternate Authentication Material",
        "tactic": "Lateral Movement",
        "stage": "Lateral Movement",
    },
    "outbound_transfer": {
        "code": "T1041",
        "name": "Exfiltration Over C2 Channel",
        "tactic": "Exfiltration",
        "stage": "Exfiltration",
    },
    "data_compression": {
        "code": "T1560",
        "name": "Archive Collected Data",
        "tactic": "Collection",
        "stage": "Exfiltration",
    },
    "encrypted_channel": {
        "code": "T1573",
        "name": "Encrypted Channel",
        "tactic": "Command and Control",
        "stage": "Exfiltration",
    },
}

# Global sequence tracking per node for event generation
_node_sequence_counters: Dict[str, int] = {}
_node_last_event_times: Dict[str, float] = {}


def get_stage(technique_name: str) -> str:
    """Returns the kill chain stage for any technique or surface name."""
    if technique_name in MITRE_TECHNIQUES:
        return MITRE_TECHNIQUES[technique_name]["stage"]

    # Search by technique code or display name
    for key, data in MITRE_TECHNIQUES.items():
        if (
            data["code"].lower() == technique_name.lower()
            or data["name"].lower() == technique_name.lower()
        ):
            return data["stage"]

    return "Execution"  # Fallback default stage


def create_event(
    technique: str,
    node_id: str,
    is_attack: bool,
    source_ip: str = "172.20.0.100",
    target_ip: str = "172.20.0.11",
    sequence_position: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Creates a complete event dictionary with all required telemetry fields.
    Includes timestamp, inter_event_delta, and sequence position.
    """
    now_time = time.time()
    now_iso = datetime.fromtimestamp(now_time).isoformat()

    # Calculate sequence position
    if sequence_position is None:
        _node_sequence_counters[node_id] = _node_sequence_counters.get(node_id, 0) + 1
        seq_pos = _node_sequence_counters[node_id]
    else:
        seq_pos = sequence_position

    # Calculate inter-event delta timing
    last_time = _node_last_event_times.get(node_id, now_time - random.uniform(0.1, 1.5))
    delta_s = max(0.001, round(now_time - last_time, 4))
    _node_last_event_times[node_id] = now_time

    # Lookup technique details
    tech_info = MITRE_TECHNIQUES.get(
        technique,
        {
            "code": "T1059",
            "name": "Command and Scripting Interpreter",
            "tactic": "Execution",
            "stage": "Execution",
        },
    )

    return {
        "event_id": f"evt-{uuid.uuid4().hex[:10]}",
        "timestamp": now_iso,
        "timestamp_s": round(now_time, 3),
        "node_id": node_id,
        "is_attack": is_attack,
        "technique": technique,
        "code": tech_info["code"],
        "technique_name": tech_info["name"],
        "tactic": tech_info["tactic"],
        "stage": tech_info["stage"],
        "source_ip": source_ip,
        "target_ip": target_ip,
        "inter_event_delta": delta_s,
        "sequence_position": seq_pos,
    }


def print_mitre_table() -> None:
    """Prints all 15 techniques in a clean formatted verification table."""
    print("==========================================================================================")
    print("                      ADVERSIM MITRE ATT&CK MAPPING TABLE")
    print("==========================================================================================")
    print(
        f"{'SURFACE KEY':<22} | {'CODE':<6} | {'STAGE':<18} | {'TACTIC':<20} | {'TECHNIQUE NAME'}"
    )
    print("-" * 90)

    for surface, info in MITRE_TECHNIQUES.items():
        print(
            f"{surface:<22} | {info['code']:<6} | {info['stage']:<18} | {info['tactic']:<20} | {info['name']}"
        )

    print("-" * 90)
    print(f"Total Attack Surfaces: {len(MITRE_TECHNIQUES)}")
    print(f"Kill Chain Stages: {' -> '.join(KILL_CHAIN_STAGES)}")
    print("==========================================================================================")


if __name__ == "__main__":
    print_mitre_table()
    print("\n[VERIFICATION TEST] Creating sample audit event:")
    sample_evt = create_event("credential_access", "node-user-1", is_attack=True)
    for k, v in sample_evt.items():
        print(f"  {k:<20}: {v}")
