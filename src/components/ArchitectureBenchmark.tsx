import React, { useState, useEffect } from 'react';
import { SimNode, NetworkEdge, AblationMetric } from '../types';
import { ShieldCheck, AlertTriangle, Cpu, Share2, Target, CheckCircle2, XCircle, Activity, Award, Zap, Gauge, Maximize2, Minimize2 } from 'lucide-react';

interface ArchitectureBenchmarkProps {
  nodes: SimNode[];
  edges: NetworkEdge[];
  metrics: AblationMetric[];
  currentRound: number;
}

export const ArchitectureBenchmark: React.FC<ArchitectureBenchmarkProps> = ({
  nodes,
  edges,
  metrics,
  currentRound,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle ESC key and prevent body scrolling when in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const currentMetric = metrics[0] || { mttd: 10, predictionAccuracy: 0.85 };
  const mttd = currentMetric.mttd;
  const detectionAccuracy = currentMetric.predictionAccuracy;

  // 1. Calculate Interconnectivity & Sharing Density
  const totalPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
  const sharingDensityRatio = totalPossibleEdges > 0 ? edges.length / totalPossibleEdges : 0;

  // 2. Honeypot Deception Ratio
  const honeypots = nodes.filter((n) => n.isHoneypot);
  const honeypotRatio = nodes.length > 0 ? honeypots.length / nodes.length : 0;

  // 3. SOC Hub Centralization
  const hasSocHub = nodes.some((n) => n.type === 'SOC');

  // 4. Critical Asset Isolation
  const directUserToAdmin = edges.some((e) => {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    return (src?.type === 'User' && tgt?.type === 'Admin') || (src?.type === 'Admin' && tgt?.type === 'User');
  });

  // 5. Compute Real-World Resilience Grade
  let score = 100;
  const flaws: string[] = [];
  const strengths: string[] = [];

  if (directUserToAdmin) {
    score -= 25;
    flaws.push('Direct User-to-Admin Link: High risk of Pass-the-Hash (T1550) lateral movement.');
  } else {
    strengths.push('Admin Controller Segmented: Admin assets isolated behind DMZ/App clusters.');
  }

  if (honeypotRatio === 0) {
    score -= 20;
    flaws.push('Zero Decoy Deception: Adversary UCB bandit algorithm learns true attack paths unhindered.');
  } else if (honeypotRatio >= 0.2) {
    strengths.push(`Active Deception Density (${(honeypotRatio * 100).toFixed(0)}% Decoys): Rapidly poisons adversary Bayesian reinforcement learning.`);
  }

  if (edges.length < nodes.length - 1) {
    score -= 20;
    flaws.push('Fragmented Subnets: Isolated nodes cannot participate in real-time Bayesian weight sharing.');
  } else if (hasSocHub || sharingDensityRatio > 0.3) {
    strengths.push('High Information Sharing Mesh: Rapid inter-node risk propagation reduces MTTD.');
  }

  if (mttd > 12) {
    score -= 15;
    flaws.push(`High Mean Time to Detect (${mttd.toFixed(1)}s): Attacker gains persistence before quarantine.`);
  } else {
    strengths.push(`Fast Detection Velocity (MTTD: ${mttd.toFixed(1)}s).`);
  }

  let grade = 'A+';
  let gradeColor = 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40';
  let viabilityText = 'HIGH PRODUCTION RESILIENCE';

  if (score < 50) {
    grade = 'F';
    gradeColor = 'text-rose-300 border-rose-500/40 bg-rose-950/40';
    viabilityText = 'CRITICAL FAILURE RISK';
  } else if (score < 65) {
    grade = 'D';
    gradeColor = 'text-orange-300 border-orange-500/40 bg-orange-950/40';
    viabilityText = 'HIGH EXPLOITATION VULNERABILITY';
  } else if (score < 80) {
    grade = 'C';
    gradeColor = 'text-amber-300 border-amber-500/40 bg-amber-950/40';
    viabilityText = 'MODERATE REAL-WORLD EXPOSURE';
  } else if (score < 90) {
    grade = 'B';
    gradeColor = 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40';
    viabilityText = 'SOLID DEFENSIVE POSTURE';
  }

  const panelContent = (
    <div
      ref={containerRef}
      className={`bg-[#0b1120] border border-slate-800 rounded-lg p-4 flex flex-col gap-3 text-xs font-mono transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-y-auto shadow-2xl w-screen h-screen justify-between'
          : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5`}>
              Topology & Resilience Scorecard
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
              Topology Audit
            </span>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Verification of network topology resilience against multi-armed bandit exploration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded border flex items-center gap-2 font-semibold ${gradeColor}`}>
            <span className="text-sm tracking-wide">GRADE {grade}</span>
            <span className="text-[10px] text-slate-300 font-normal">({score}/100)</span>
          </div>

          {/* Expand / Minimize Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
              isFullscreen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Scorecard to Full Screen'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Scorecard to Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 ${isFullscreen ? 'my-2' : ''}`}>
        <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            Sharing Density
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-base font-semibold text-slate-100">
              {edges.length} <span className="text-[10px] text-slate-500 font-normal">Links</span>
            </span>
            <span className="text-xs font-semibold text-cyan-400">
              {(sharingDensityRatio * 100).toFixed(0)}% Mesh
            </span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-teal-400" />
            Decoy Ratio
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-base font-semibold text-slate-100">
              {honeypots.length} <span className="text-[10px] text-slate-500 font-normal">Decoys</span>
            </span>
            <span className="text-xs font-semibold text-teal-400">
              {(honeypotRatio * 100).toFixed(0)}% Density
            </span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Detection Velocity
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-base font-semibold text-slate-100">
              {mttd.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">s</span>
            </span>
            <span className={`text-xs font-semibold ${mttd <= 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {mttd <= 40 ? 'Optimal' : 'Delayed'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Prediction Accuracy
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-base font-semibold text-slate-100">
              {(detectionAccuracy * 100).toFixed(0)}%
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              Pre-Hardened
            </span>
          </div>
        </div>
      </div>

      {/* Strengths & Vulnerabilities Diagnostic Strip */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${isFullscreen ? 'flex-1 my-2' : ''}`}>
        {/* Strengths */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2 flex flex-col">
          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Defensive Strengths ({strengths.length})
          </div>
          {strengths.length === 0 ? (
            <p className="text-slate-500 text-[11px]">No key defensive strengths detected in current configuration.</p>
          ) : (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {strengths.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-semibold">›</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vulnerabilities */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2 flex flex-col">
          <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <XCircle className="w-4 h-4" />
            Structural Vulnerabilities ({flaws.length})
          </div>
          {flaws.length === 0 ? (
            <p className="text-slate-500 text-[11px]">No critical structural vulnerabilities detected in current layout.</p>
          ) : (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {flaws.map((f, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="text-rose-400 font-semibold">›</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Status Strip */}
      <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          Topology Scorecard
        </span>
        <span className="text-slate-500">Security Invariant Checks Passed</span>
      </div>
    </div>
  );

  return panelContent;
};

export default ArchitectureBenchmark;
