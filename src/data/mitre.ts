import { MitreMapping, AttackSurface } from '../types';

export const MITRE_SURFACE_MAP: Record<AttackSurface, MitreMapping> = {
  network_scanning: {
    surface: 'network_scanning',
    techniqueCode: 'T1046',
    techniqueName: 'Network Service Discovery',
    stage: 'Reconnaissance',
  },
  service_enumeration: {
    surface: 'service_enumeration',
    techniqueCode: 'T1592',
    techniqueName: 'Gather Victim Host Information',
    stage: 'Reconnaissance',
  },
  os_fingerprinting: {
    surface: 'os_fingerprinting',
    techniqueCode: 'T1082',
    techniqueName: 'System Information Discovery',
    stage: 'Reconnaissance',
  },
  credential_access: {
    surface: 'credential_access',
    techniqueCode: 'T1078',
    techniqueName: 'Valid Accounts',
    stage: 'Initial Access',
  },
  script_execution: {
    surface: 'script_execution',
    techniqueCode: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    stage: 'Execution',
  },
  scheduled_task: {
    surface: 'scheduled_task',
    techniqueCode: 'T1053',
    techniqueName: 'Scheduled Task/Job',
    stage: 'Execution',
  },
  process_injection: {
    surface: 'process_injection',
    techniqueCode: 'T1055',
    techniqueName: 'Process Injection',
    stage: 'Execution',
  },
  registry_persistence: {
    surface: 'registry_persistence',
    techniqueCode: 'T1547',
    techniqueName: 'Boot or Logon Autostart Execution',
    stage: 'Persistence',
  },
  account_creation: {
    surface: 'account_creation',
    techniqueCode: 'T1136',
    techniqueName: 'Create Account',
    stage: 'Persistence',
  },
  log_clearing: {
    surface: 'log_clearing',
    techniqueCode: 'T1070',
    techniqueName: 'Indicator Removal on Host',
    stage: 'Defense Evasion',
  },
  lateral_movement: {
    surface: 'lateral_movement',
    techniqueCode: 'T1021',
    techniqueName: 'Remote Services',
    stage: 'Lateral Movement',
  },
  pass_the_hash: {
    surface: 'pass_the_hash',
    techniqueCode: 'T1550',
    techniqueName: 'Use Alternate Authentication Material',
    stage: 'Lateral Movement',
  },
  outbound_transfer: {
    surface: 'outbound_transfer',
    techniqueCode: 'T1041',
    techniqueName: 'Exfiltration Over C2 Channel',
    stage: 'Exfiltration',
  },
  data_compression: {
    surface: 'data_compression',
    techniqueCode: 'T1560',
    techniqueName: 'Archive Collected Data',
    stage: 'Exfiltration',
  },
  encrypted_channel: {
    surface: 'encrypted_channel',
    techniqueCode: 'T1573',
    techniqueName: 'Encrypted Channel',
    stage: 'Exfiltration',
  },
};

export const ATTACK_SURFACES: AttackSurface[] = Object.keys(MITRE_SURFACE_MAP) as AttackSurface[];

/**
 * Surface Criticality Weights from AlertFusion specification (simulation/detection/alert_fusion.py).
 * 1.0 = baseline risk; >1.0 = high-impact/critical risk techniques (e.g. Exfiltration 1.5x, Log Clearing 1.4x, PtH 1.3x).
 */
export const SURFACE_CRITICALITY_WEIGHTS: Record<AttackSurface, number> = {
  network_scanning: 0.8,
  service_enumeration: 0.8,
  os_fingerprinting: 0.8,
  credential_access: 1.2,
  script_execution: 1.1,
  scheduled_task: 1.0,
  process_injection: 1.3,
  registry_persistence: 1.1,
  account_creation: 1.2,
  log_clearing: 1.4,
  lateral_movement: 1.3,
  pass_the_hash: 1.3,
  outbound_transfer: 1.5,
  data_compression: 1.2,
  encrypted_channel: 1.2,
};
