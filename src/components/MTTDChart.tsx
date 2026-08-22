import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, Zap, TrendingDown, ArrowDownRight, Maximize2, Minimize2, BarChart2 } from 'lucide-react';

interface MTTDChartProps {
  history: { round: number; [key: string]: number }[];
}

export const MTTDChart: React.FC<MTTDChartProps> = ({ history }) => {
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

  const latest = history[history.length - 1] || {
    ConditionA: 140,
    ConditionB: 90,
    ConditionC: 75,
    ConditionD: 65,
    ConditionE: 30,
    ConditionF: 35,
  };

  const baselineA = latest.ConditionA || 140;
  const currentF = latest.ConditionF || 35;
  const reductionPct = Math.max(0, Math.min(95, ((baselineA - currentF) / baselineA) * 100));

  const panelContent = (
    <div
      ref={containerRef}
      className={`cockpit-panel rounded-xl p-4 flex flex-col justify-between text-xs font-mono transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-hidden shadow-2xl w-screen h-screen'
          : 'h-[440px]'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-live-blip" />
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-widest text-slate-100 flex items-center gap-1.5`}>
              Mean Time To Detection (MTTD) Longitudinal Trajectory
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                FULL ANALYTICAL TIMELINE
              </span>
            )}
          </div>

          {/* Real-time Acceleration Advantage Needle & Fullscreen Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold text-[11px]">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>{reductionPct.toFixed(1)}% Containment Velocity</span>
            </div>
            <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-white/[0.08] text-[10px]">
              F: <strong className="text-cyan-300">{currentF.toFixed(1)}s</strong> vs Baseline: <strong className="text-slate-400">{baselineA.toFixed(1)}s</strong>
            </span>

            {/* Expand / Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/60'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand MTTD Graph to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand MTTD Graph to Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2">
          Comparative ablation telemetry across 6 experimental configurations (lower is faster detection velocity).
        </p>
      </div>

      {/* Chart Canvas */}
      <div className={`w-full min-w-0 my-2 ${isFullscreen ? 'flex-1 min-h-[350px]' : 'h-[280px] min-h-[280px]'}`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={history} margin={{ top: 10, right: 20, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="round"
              stroke="#64748b"
              tick={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
              label={{ value: 'Simulation Tick / Round', position: 'insideBottomRight', offset: -4, fill: '#475569', fontSize: 9 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
              label={{ value: 'MTTD (seconds)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#07090e',
                borderColor: 'rgba(6, 182, 212, 0.4)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '11px',
                fontFamily: 'ui-monospace, monospace',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: isFullscreen ? '11px' : '10px', fontFamily: 'ui-monospace, monospace', paddingTop: '8px' }}
            />
            <Line type="monotone" dataKey="ConditionA" name="A: Baseline (No Sharing)" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="ConditionB" name="B: Peer Collab" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="ConditionC" name="C: Honeypot" stroke="#2dd4bf" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="ConditionD" name="D: Markov Predictor" stroke="#c084fc" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="ConditionE" name="E: All (Naive Attacker)" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="ConditionF" name="F: Full AdverSim (Bandit)" stroke="#ef4444" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Instrument Status Strip */}
      <div className="border-t border-white/[0.08] pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          Rolling Telemetry Buffer ({history.length} Samples Active)
        </span>
        <span className="text-slate-500">Continuous Stream Verification</span>
      </div>
    </div>
  );

  return panelContent;
};

export default MTTDChart;
