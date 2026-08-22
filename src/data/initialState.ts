import { SimNode, NetworkEdge, AblationCondition, AblationMetric, UcbSurfaceStats, AttackSurface } from '../types';
import { MITRE_SURFACE_MAP, ATTACK_SURFACES } from './mitre';

export function generateInitialWeights(): Record<AttackSurface, number> {
  const base = 1 / 15; // uniform start = 0.0667
  const raw: Record<string, number> = {};
  
  ATTACK_SURFACES.forEach(surf => {
    // ±40% random variation from uniform
    raw[surf] = base * (0.6 + Math.random() * 0.8);
  });
  
  // Normalize to sum to 1
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  ATTACK_SURFACES.forEach(surf => {
    raw[surf] = Number((raw[surf] / total).toFixed(4));
  });
  
  return raw as Record<AttackSurface, number>;
}

export function getInitialNodes(): SimNode[] {
  return [
    {
      id: 'node-dmz-1',
      name: 'Public Web Gateway',
      type: 'DMZ',
      ip: '10.0.0.5',
      isHoneypot: false,
      status: 'normal',
      fpr: Number((0.005 + Math.random() * 0.025).toFixed(4)),
      bayesianWeights: generateInitialWeights(),
      x: 100,
      y: 110,
    },
    {
      id: 'node-user-1',
      name: 'User Workstation 01',
      type: 'User',
      ip: '10.0.1.12',
      isHoneypot: false,
      status: 'normal',
      fpr: Number((0.005 + Math.random() * 0.025).toFixed(4)),
      bayesianWeights: generateInitialWeights(),
      x: 230,
      y: 90,
    },
    {
      id: 'node-user-2',
      name: 'User Workstation 02',
      type: 'User',
      ip: '10.0.1.15',
      isHoneypot: false,
      status: 'normal',
      fpr: Number((0.005 + Math.random() * 0.025).toFixed(4)),
      bayesianWeights: generateInitialWeights(),
      x: 230,
      y: 240,
    },
    {
      id: 'node-server-1',
      name: 'App / DB Server Cluster',
      type: 'Server',
      ip: '10.0.2.20',
      isHoneypot: false,
      status: 'normal',
      fpr: Number((0.005 + Math.random() * 0.025).toFixed(4)),
      bayesianWeights: generateInitialWeights(),
      x: 390,
      y: 160,
    },
    {
      id: 'node-admin-1',
      name: 'Domain Admin Controller',
      type: 'Admin',
      ip: '10.0.3.1',
      isHoneypot: false,
      status: 'normal',
      fpr: Number((0.005 + Math.random() * 0.025).toFixed(4)),
      bayesianWeights: generateInitialWeights(),
      x: 520,
      y: 90,
    },
    {
      id: 'node-honeypot-1',
      name: 'Decoy SQL Honeypot (Medium)',
      type: 'Honeypot',
      ip: '10.0.2.99',
      fidelity: 'Medium',
      isHoneypot: true,
      status: 'normal',
      fpr: Number((0.005 + Math.random() * 0.025).toFixed(4)),
      bayesianWeights: generateInitialWeights(),
      x: 390,
      y: 300,
    },
    {
      id: 'node-honeypot-2',
      name: 'Decoy Admin Jumpbox (High)',
      type: 'Honeypot',
      ip: '10.0.3.99',
      fidelity: 'High',
      isHoneypot: true,
      status: 'normal',
      fpr: Number((0.005 + Math.random() * 0.025).toFixed(4)),
      bayesianWeights: generateInitialWeights(),
      x: 520,
      y: 260,
    },
  ];
}

export const ARCHITECTURE_PRESETS = [
  {
    id: 'default-enterprise',
    name: 'Default Subnet Topology',
    description: 'Standard multi-tier subnet with DMZ, Workstations, App/DB Server, Admin Controller, and 2 Honeypots.',
    nodes: getInitialNodes(),
    edges: [
      { source: 'node-dmz-1', target: 'node-user-1', bandwidth: '1 Gbps' },
      { source: 'node-dmz-1', target: 'node-user-2', bandwidth: '1 Gbps' },
      { source: 'node-user-1', target: 'node-server-1', bandwidth: '10 Gbps' },
      { source: 'node-user-2', target: 'node-server-1', bandwidth: '10 Gbps' },
      { source: 'node-server-1', target: 'node-admin-1', bandwidth: '10 Gbps' },
      { source: 'node-server-1', target: 'node-honeypot-1', bandwidth: '10 Gbps' },
      { source: 'node-admin-1', target: 'node-honeypot-2', bandwidth: '10 Gbps' },
      { source: 'node-user-1', target: 'node-admin-1', bandwidth: '1 Gbps' },
    ],
  },
  {
    id: 'zero-trust-mesh',
    name: 'Zero-Trust Mesh & SOC Hub',
    description: 'Full-mesh information sharing across all defender nodes with a central SOC Relay Hub for real-time risk propagation.',
    nodes: [
      { id: 'node-soc', name: 'Central SOC Relay Hub', type: 'SOC' as const, ip: '10.0.0.1', isHoneypot: false, status: 'normal' as const, fpr: 0.005, bayesianWeights: generateInitialWeights(), x: 320, y: 170 },
      { id: 'node-dmz-1', name: 'Web Gateway', type: 'DMZ' as const, ip: '10.0.0.5', isHoneypot: false, status: 'normal' as const, fpr: 0.02, bayesianWeights: generateInitialWeights(), x: 120, y: 70 },
      { id: 'node-user-1', name: 'Workstation 01', type: 'User' as const, ip: '10.0.1.12', isHoneypot: false, status: 'normal' as const, fpr: 0.015, bayesianWeights: generateInitialWeights(), x: 120, y: 270 },
      { id: 'node-server-1', name: 'DB Cluster', type: 'Server' as const, ip: '10.0.2.20', isHoneypot: false, status: 'normal' as const, fpr: 0.01, bayesianWeights: generateInitialWeights(), x: 520, y: 70 },
      { id: 'node-admin-1', name: 'Admin Controller', type: 'Admin' as const, ip: '10.0.3.1', isHoneypot: false, status: 'normal' as const, fpr: 0.008, bayesianWeights: generateInitialWeights(), x: 520, y: 270 },
      { id: 'node-honeypot-1', name: 'Decoy Trap 01', type: 'Honeypot' as const, ip: '10.0.9.1', fidelity: 'High' as const, isHoneypot: true, status: 'normal' as const, fpr: 0.001, bayesianWeights: generateInitialWeights(), x: 320, y: 40 },
      { id: 'node-honeypot-2', name: 'Decoy Trap 02', type: 'Honeypot' as const, ip: '10.0.9.2', fidelity: 'High' as const, isHoneypot: true, status: 'normal' as const, fpr: 0.001, bayesianWeights: generateInitialWeights(), x: 320, y: 300 },
    ],
    edges: [
      { source: 'node-soc', target: 'node-dmz-1', bandwidth: '10 Gbps' },
      { source: 'node-soc', target: 'node-user-1', bandwidth: '10 Gbps' },
      { source: 'node-soc', target: 'node-server-1', bandwidth: '10 Gbps' },
      { source: 'node-soc', target: 'node-admin-1', bandwidth: '10 Gbps' },
      { source: 'node-soc', target: 'node-honeypot-1', bandwidth: '10 Gbps' },
      { source: 'node-soc', target: 'node-honeypot-2', bandwidth: '10 Gbps' },
      { source: 'node-dmz-1', target: 'node-server-1', bandwidth: '1 Gbps' },
      { source: 'node-user-1', target: 'node-server-1', bandwidth: '1 Gbps' },
    ],
  },
  {
    id: 'honeypot-fortress',
    name: 'Honeypot Perimeter Fortress',
    description: 'High density decoy honeypots protecting core servers to capture early reconnaissance and poison attacker learning.',
    nodes: [
      { id: 'node-dmz-1', name: 'Web Ingress', type: 'DMZ' as const, ip: '10.0.0.5', isHoneypot: false, status: 'normal' as const, fpr: 0.02, bayesianWeights: generateInitialWeights(), x: 100, y: 170 },
      { id: 'node-hp-1', name: 'Honey Web Gateway', type: 'Honeypot' as const, ip: '10.0.0.6', fidelity: 'High' as const, isHoneypot: true, status: 'normal' as const, fpr: 0.001, bayesianWeights: generateInitialWeights(), x: 220, y: 80 },
      { id: 'node-hp-2', name: 'Honey Auth Server', type: 'Honeypot' as const, ip: '10.0.1.99', fidelity: 'High' as const, isHoneypot: true, status: 'normal' as const, fpr: 0.001, bayesianWeights: generateInitialWeights(), x: 220, y: 260 },
      { id: 'node-server-1', name: 'Core DB', type: 'Server' as const, ip: '10.0.2.1', isHoneypot: false, status: 'normal' as const, fpr: 0.01, bayesianWeights: generateInitialWeights(), x: 420, y: 170 },
      { id: 'node-hp-3', name: 'Honey DB Mirror', type: 'Honeypot' as const, ip: '10.0.2.2', fidelity: 'Medium' as const, isHoneypot: true, status: 'normal' as const, fpr: 0.001, bayesianWeights: generateInitialWeights(), x: 420, y: 290 },
      { id: 'node-admin-1', name: 'Domain Admin', type: 'Admin' as const, ip: '10.0.3.1', isHoneypot: false, status: 'normal' as const, fpr: 0.005, bayesianWeights: generateInitialWeights(), x: 560, y: 170 },
    ],
    edges: [
      { source: 'node-dmz-1', target: 'node-hp-1', bandwidth: '1 Gbps' },
      { source: 'node-dmz-1', target: 'node-hp-2', bandwidth: '1 Gbps' },
      { source: 'node-dmz-1', target: 'node-server-1', bandwidth: '10 Gbps' },
      { source: 'node-hp-1', target: 'node-server-1', bandwidth: '10 Gbps' },
      { source: 'node-hp-2', target: 'node-server-1', bandwidth: '10 Gbps' },
      { source: 'node-server-1', target: 'node-hp-3', bandwidth: '10 Gbps' },
      { source: 'node-server-1', target: 'node-admin-1', bandwidth: '10 Gbps' },
    ],
  },
  {
    id: 'flat-legacy',
    name: 'Flat Legacy Subnet (Minimal Sharing)',
    description: 'Minimal interconnectivity with no honeypots. Tests high MTTD and vulnerable cascading propagation.',
    nodes: [
      { id: 'node-dmz-1', name: 'Legacy Router', type: 'DMZ' as const, ip: '192.168.1.1', isHoneypot: false, status: 'normal' as const, fpr: 0.03, bayesianWeights: generateInitialWeights(), x: 100, y: 170 },
      { id: 'node-user-1', name: 'Office PC 01', type: 'User' as const, ip: '192.168.1.10', isHoneypot: false, status: 'normal' as const, fpr: 0.025, bayesianWeights: generateInitialWeights(), x: 260, y: 100 },
      { id: 'node-user-2', name: 'Office PC 02', type: 'User' as const, ip: '192.168.1.11', isHoneypot: false, status: 'normal' as const, fpr: 0.025, bayesianWeights: generateInitialWeights(), x: 260, y: 240 },
      { id: 'node-server-1', name: 'File Server', type: 'Server' as const, ip: '192.168.1.50', isHoneypot: false, status: 'normal' as const, fpr: 0.02, bayesianWeights: generateInitialWeights(), x: 440, y: 170 },
      { id: 'node-admin-1', name: 'Admin Workstation', type: 'Admin' as const, ip: '192.168.1.100', isHoneypot: false, status: 'normal' as const, fpr: 0.015, bayesianWeights: generateInitialWeights(), x: 580, y: 170 },
    ],
    edges: [
      { source: 'node-dmz-1', target: 'node-user-1', bandwidth: '100 Mbps' },
      { source: 'node-dmz-1', target: 'node-user-2', bandwidth: '100 Mbps' },
      { source: 'node-user-1', target: 'node-server-1', bandwidth: '1 Gbps' },
      { source: 'node-user-2', target: 'node-server-1', bandwidth: '1 Gbps' },
      { source: 'node-server-1', target: 'node-admin-1', bandwidth: '1 Gbps' },
    ],
  },
];

export const INITIAL_NODES: SimNode[] = new Proxy([] as SimNode[], {
  get(target, prop, receiver) {
    const fresh = getInitialNodes();
    const val = Reflect.get(fresh, prop, receiver);
    return typeof val === 'function' ? val.bind(fresh) : val;
  }
});

export const INITIAL_EDGES: NetworkEdge[] = [
  { source: 'node-dmz-1', target: 'node-user-1', bandwidth: '1 Gbps' },
  { source: 'node-dmz-1', target: 'node-user-2', bandwidth: '1 Gbps' },
  { source: 'node-user-1', target: 'node-server-1', bandwidth: '10 Gbps' },
  { source: 'node-user-2', target: 'node-server-1', bandwidth: '10 Gbps' },
  { source: 'node-server-1', target: 'node-admin-1', bandwidth: '10 Gbps' },
  { source: 'node-server-1', target: 'node-honeypot-1', bandwidth: '10 Gbps' },
  { source: 'node-admin-1', target: 'node-honeypot-2', bandwidth: '10 Gbps' },
  { source: 'node-user-1', target: 'node-admin-1', bandwidth: '1 Gbps' },
];

export const ABLATION_CONDITIONS: AblationCondition[] = [
  {
    id: 'A',
    name: 'Condition A: Baseline (No Defense)',
    description: 'Isolation Forest & Markov baseline only without collaboration, honeypots, or stage predictor.',
    collaborativeActive: false,
    honeypotActive: false,
    predictorActive: false,
    attackerType: 'Static',
  },
  {
    id: 'B',
    name: 'Condition B: Collaboration Only',
    description: 'K-round inter-node Bayesian weight vector sharing with inverse-FPR aggregation.',
    collaborativeActive: true,
    honeypotActive: false,
    predictorActive: false,
    attackerType: 'Static',
  },
  {
    id: 'C',
    name: 'Condition C: Honeypot Only',
    description: 'Multi-fidelity honeypot decoys with consistency filtering and immediate broadcast.',
    collaborativeActive: false,
    honeypotActive: true,
    predictorActive: false,
    attackerType: 'Static',
  },
  {
    id: 'D',
    name: 'Condition D: Predictor Only',
    description: 'Probabilistic MITRE stage predictor with proactive pre-hardening.',
    collaborativeActive: false,
    honeypotActive: false,
    predictorActive: true,
    attackerType: 'Static',
  },
  {
    id: 'E',
    name: 'Condition E: All Defenses (Naive Attacker)',
    description: 'Collaborative + Honeypot + Stage Predictor active against naive static profile attacker.',
    collaborativeActive: true,
    honeypotActive: true,
    predictorActive: true,
    attackerType: 'Naive',
  },
  {
    id: 'F',
    name: 'Condition F: Full System (UCB Bandit Attacker)',
    description: 'Full AdverSim architecture: Co-evolving UCB Bandit attacker vs complete defense stack.',
    collaborativeActive: true,
    honeypotActive: true,
    predictorActive: true,
    attackerType: 'Bandit',
  },
];

export const INITIAL_METRICS: AblationMetric[] = [
  {
    conditionId: 'A',
    conditionName: 'Condition A (Baseline)',
    mttd: 142.5,
    fpr: 4.8,
    weightConvergenceSpeed: 68,
    detectionRegret: 85.2,
    collaborativeAdvantage: 0.0,
    honeypotEngagementRate: 0.0,
    predictionAccuracy: 0.0,
    consistencyRejectionRate: 0.0,
    banditRegret: 12.4,
  },
  {
    conditionId: 'B',
    conditionName: 'Condition B (Collab Only)',
    mttd: 88.3,
    fpr: 2.1,
    weightConvergenceSpeed: 34,
    detectionRegret: 48.6,
    collaborativeAdvantage: 38.0,
    honeypotEngagementRate: 0.0,
    predictionAccuracy: 0.0,
    consistencyRejectionRate: 0.0,
    banditRegret: 18.2,
  },
  {
    conditionId: 'C',
    conditionName: 'Condition C (Honeypot Only)',
    mttd: 72.1,
    fpr: 1.4,
    weightConvergenceSpeed: 28,
    detectionRegret: 36.1,
    collaborativeAdvantage: 15.2,
    honeypotEngagementRate: 41.5,
    predictionAccuracy: 0.0,
    consistencyRejectionRate: 18.5,
    banditRegret: 24.1,
  },
  {
    conditionId: 'D',
    conditionName: 'Condition D (Predictor Only)',
    mttd: 64.8,
    fpr: 1.9,
    weightConvergenceSpeed: 30,
    detectionRegret: 31.0,
    collaborativeAdvantage: 12.0,
    honeypotEngagementRate: 0.0,
    predictionAccuracy: 79.4,
    consistencyRejectionRate: 0.0,
    banditRegret: 22.0,
  },
  {
    conditionId: 'E',
    conditionName: 'Condition E (All Defenses vs Naive)',
    mttd: 28.4,
    fpr: 0.6,
    weightConvergenceSpeed: 14,
    detectionRegret: 11.2,
    collaborativeAdvantage: 80.1,
    honeypotEngagementRate: 58.2,
    predictionAccuracy: 92.1,
    consistencyRejectionRate: 12.0,
    banditRegret: 8.5,
  },
  {
    conditionId: 'F',
    conditionName: 'Condition F (Full System vs UCB Bandit)',
    mttd: 36.2,
    fpr: 0.8,
    weightConvergenceSpeed: 18,
    detectionRegret: 15.8,
    collaborativeAdvantage: 74.6,
    honeypotEngagementRate: 64.8,
    predictionAccuracy: 88.5,
    consistencyRejectionRate: 31.2,
    banditRegret: 42.8,
  },
];

export const INITIAL_UCB_STATS: UcbSurfaceStats[] = ATTACK_SURFACES.map((surface) => {
  const mapping = MITRE_SURFACE_MAP[surface];
  const attempts = Math.floor(Math.random() * 20) + 10;
  const successes = Math.floor(attempts * (0.3 + Math.random() * 0.4));
  const avgSuccess = successes / attempts;
  const totalAttempts = 200;
  const ucbScore = avgSuccess + Math.sqrt((2 * Math.log(totalAttempts)) / attempts);

  return {
    surface,
    mitreCode: mapping.techniqueCode,
    attempts,
    successes,
    avgSuccess,
    ucbScore,
    currentWeight: 1 / ATTACK_SURFACES.length,
  };
});
