import { MitreMapping, AttackSurface, NodeType } from '../types';

export const MITRE_SURFACE_MAP: Record<AttackSurface, MitreMapping> = {
  network_scanning: {
    surface: 'network_scanning',
    techniqueCode: 'T1046',
    techniqueName: 'Network Service Discovery',
    stage: 'Reconnaissance',
    baseExploitability: 0.60,
  },
  service_enumeration: {
    surface: 'service_enumeration',
    techniqueCode: 'T1592',
    techniqueName: 'Gather Victim Host Information',
    stage: 'Reconnaissance',
    baseExploitability: 0.50,
  },
  os_fingerprinting: {
    surface: 'os_fingerprinting',
    techniqueCode: 'T1082',
    techniqueName: 'System Information Discovery',
    stage: 'Reconnaissance',
    baseExploitability: 0.55,
  },
  credential_access: {
    surface: 'credential_access',
    techniqueCode: 'T1078',
    techniqueName: 'Valid Accounts',
    stage: 'Initial Access',
    baseExploitability: 0.85,
  },
  script_execution: {
    surface: 'script_execution',
    techniqueCode: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    stage: 'Execution',
    baseExploitability: 0.70,
  },
  scheduled_task: {
    surface: 'scheduled_task',
    techniqueCode: 'T1053',
    techniqueName: 'Scheduled Task/Job',
    stage: 'Execution',
    baseExploitability: 0.45,
  },
  process_injection: {
    surface: 'process_injection',
    techniqueCode: 'T1055',
    techniqueName: 'Process Injection',
    stage: 'Execution',
    baseExploitability: 0.45,
  },
  registry_persistence: {
    surface: 'registry_persistence',
    techniqueCode: 'T1547',
    techniqueName: 'Boot or Logon Autostart Execution',
    stage: 'Persistence',
    baseExploitability: 0.35,
  },
  account_creation: {
    surface: 'account_creation',
    techniqueCode: 'T1136',
    techniqueName: 'Create Account',
    stage: 'Persistence',
    baseExploitability: 0.40,
  },
  log_clearing: {
    surface: 'log_clearing',
    techniqueCode: 'T1070',
    techniqueName: 'Indicator Removal on Host',
    stage: 'Defense Evasion',
    baseExploitability: 0.20,
  },
  lateral_movement: {
    surface: 'lateral_movement',
    techniqueCode: 'T1021',
    techniqueName: 'Remote Services',
    stage: 'Lateral Movement',
    baseExploitability: 0.65,
  },
  pass_the_hash: {
    surface: 'pass_the_hash',
    techniqueCode: 'T1550',
    techniqueName: 'Use Alternate Authentication Material',
    stage: 'Lateral Movement',
    baseExploitability: 0.75,
  },
  outbound_transfer: {
    surface: 'outbound_transfer',
    techniqueCode: 'T1041',
    techniqueName: 'Exfiltration Over C2 Channel',
    stage: 'Exfiltration',
    baseExploitability: 0.35,
  },
  data_compression: {
    surface: 'data_compression',
    techniqueCode: 'T1560',
    techniqueName: 'Archive Collected Data',
    stage: 'Exfiltration',
    baseExploitability: 0.25,
  },
  encrypted_channel: {
    surface: 'encrypted_channel',
    techniqueCode: 'T1573',
    techniqueName: 'Encrypted Channel',
    stage: 'Exfiltration',
    baseExploitability: 0.30,
  },
};

export const ATTACK_SURFACES: AttackSurface[] = Object.keys(MITRE_SURFACE_MAP) as AttackSurface[];

export interface TechKeyItem {
  key: AttackSurface;
  label: string;
  alias: string;
  code: string;
  name: string;
  stage: string;
}

export const TECH_KEYS_15: TechKeyItem[] = ATTACK_SURFACES.map((surf) => {
  const mapping = MITRE_SURFACE_MAP[surf];
  return {
    key: surf,
    label: `${mapping.techniqueCode}: ${mapping.techniqueName}`,
    alias: mapping.techniqueCode,
    code: mapping.techniqueCode,
    name: mapping.techniqueName,
    stage: mapping.stage,
  };
});

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

/**
 * Normalizes the 15 baseExploitability values to sum to 1.0.
 * For Admin-type nodes specifically, applies a 1.3x multiplier to credential_access,
 * pass_the_hash, and lateral_movement before normalizing.
 */
export function getBaselineWeights(nodeType?: NodeType | string): Record<AttackSurface, number> {
  const isAdmin = nodeType === 'Admin';
  const raw: Record<string, number> = {};

  ATTACK_SURFACES.forEach((surf) => {
    let val = MITRE_SURFACE_MAP[surf].baseExploitability;
    if (isAdmin && (surf === 'credential_access' || surf === 'pass_the_hash' || surf === 'lateral_movement')) {
      val *= 1.3;
    }
    raw[surf] = val;
  });

  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  const normalized: Record<AttackSurface, number> = {} as any;
  ATTACK_SURFACES.forEach((surf) => {
    normalized[surf] = Number((raw[surf] / (total || 1)).toFixed(4));
  });

  return normalized;
}
