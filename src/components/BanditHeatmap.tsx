import React, { useState, useEffect } from 'react';
import { UcbSurfaceStats } from '../types';
import { Cpu, Zap, Crosshair, BarChart2, Maximize2, Minimize2, Activity, Info } from 'lucide-react';

interface BanditHeatmapProps {
  ucbStats: UcbSurfaceStats[];
}

export const BanditHeatmap: React.FC<BanditHeatmapProps> = ({ ucbStats }) => {
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

  const sorted = [...ucbStats].sort((a, b) => b.ucbScore - a.ucbScore);
  const maxScore = Math.max(...sorted.map((s) => s.ucbScore), 1.0);
  const topTarget = sorted[0];

  const panelContent = (
    <div
      ref={containerRef}
      className={`cockpit-panel rounded-xl p-4 flex flex-col justify-between text-xs font-mono transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-hidden shadow-2xl w-screen h-screen'
          : 'h-[420px]'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-live-blip" />
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-widest text-slate-100 flex items-center gap-1.5`}>
              Adversary UCB Bandit Exploitation Matrix
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                MULTI-ARMED REINFORCEMENT LEARNING
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
              REINFORCEMENT LEARNING
            </span>

            {/* Fullscreen Expand / Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/60'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Bandit Matrix to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Bandit Matrix to Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 text-[11px] text-slate-400 gap-1">
          <span>Upper Confidence Bound: <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded border border-white/[0.05]">UCB1 = μ_i + c · √(2·ln(N) / n_i)</code></span>
          <span className="text-slate-300">
            Current Prime Vector: <strong className="text-rose-400 font-bold">{topTarget?.mitreCode}</strong> ({topTarget?.surface.replace(/_/g, ' ')})
          </span>
        </div>
      </div>

      {/* Grid of Surface Bars */}
      <div className={`flex-1 grid gap-2.5 my-2.5 overflow-y-auto pr-1 min-h-0 ${isFullscreen ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {sorted.map((stat, idx) => {
          const fillWidth = Math.min(100, Math.max(8, (stat.ucbScore / maxScore) * 100));
          const isTopThree = idx < 3;

          return (
            <div
              key={stat.surface}
              className={`p-3 rounded-lg border flex flex-col justify-between gap-2 transition-all ${
                isTopThree
                  ? 'bg-slate-950 border-amber-500/40 shadow-md'
                  : 'bg-slate-950/60 border-white/[0.05] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200 font-bold flex items-center gap-1.5 truncate max-w-[200px]">
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[9.5px] ${
                    isTopThree ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {stat.mitreCode}
                  </span>
                  <span className="truncate">{stat.surface.replace(/_/g, ' ')}</span>
                </span>
                <span className="text-amber-300 font-bold text-xs">
                  {stat.ucbScore.toFixed(2)}
                </span>
              </div>

              {/* Progress Needle Bar */}
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isTopThree
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: `${fillWidth}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                <span>Arm Pulls / Probes: <strong className="text-slate-200 font-bold">{stat.attempts}</strong></span>
                <span>Exploit Efficacy: <strong className="text-slate-200 font-bold">{(stat.avgSuccess * 100).toFixed(0)}%</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Instrument Status Strip */}
      <div className="border-t border-white/[0.08] pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          Exploration-Exploitation Tradeoff Monitored (UCB1 Parameter c=1.414)
        </span>
        <span className="text-slate-500">15 MITRE Attack Surfaces</span>
      </div>
    </div>
  );

  return panelContent;
};

export default BanditHeatmap;
