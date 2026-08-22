import React, { useState, useEffect } from 'react';
import { AblationMetric, ConditionId } from '../types';
import { FlaskConical, CheckCircle2, Sliders, ChevronRight, Zap, Maximize2, Minimize2, Info } from 'lucide-react';

interface ExperimentTableProps {
  metrics: AblationMetric[];
  activeCondition: ConditionId;
  onSelectCondition: (condId: ConditionId) => void;
}

export const ExperimentTable: React.FC<ExperimentTableProps> = ({
  metrics,
  activeCondition,
  onSelectCondition,
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
              Experimental Ablation Matrix (Conditions A – F)
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                DEEP PARAMETRIC BENCHMARKS
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              CLICK ROW TO SWITCH MISSION PROFILE
            </span>

            {/* Expand / Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/60'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Ablation Matrix to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Ablation Matrix to Full Screen'}
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
          Comparative empirical performance benchmarks isolating peer collaboration, deception honeypots, Markov forecasting, and bandit adaptation.
        </p>
      </div>

      {/* Table Area */}
      <div className="my-2 overflow-x-auto overflow-y-auto flex-1 min-h-0">
        <table className="w-full text-xs text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-slate-950/90 text-slate-400 uppercase tracking-wider border-y border-white/[0.08] text-[10px] sticky top-0 z-10">
              <th className="py-2.5 px-3">Condition Profile</th>
              <th className="py-2.5 px-2">MTTD (s)</th>
              <th className="py-2.5 px-2">FPR (%)</th>
              <th className="py-2.5 px-2">Weight Conv.</th>
              <th className="py-2.5 px-2">Det. Regret</th>
              <th className="py-2.5 px-2">Collab. Adv</th>
              <th className="py-2.5 px-2">Honeypot Eng.</th>
              <th className="py-2.5 px-2">Pred. Acc.</th>
              <th className="py-2.5 px-2">Filter Rej.</th>
              <th className="py-2.5 px-2">Bandit Regret</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {metrics.map((row) => {
              const isActive = activeCondition === row.conditionId;

              return (
                <tr
                  key={row.conditionId}
                  onClick={() => onSelectCondition(row.conditionId)}
                  className={`cursor-pointer transition-all ${
                    isActive
                      ? 'bg-cyan-950/40 text-cyan-200 font-semibold border-l-2 border-cyan-400'
                      : 'text-slate-300 hover:bg-slate-900/60'
                  }`}
                >
                  <td className="py-2.5 px-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`} />
                    <span className={isActive ? 'text-cyan-300 font-bold' : 'text-slate-200'}>
                      {row.conditionName}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 font-bold text-rose-300">{row.mttd}s</td>
                  <td className="py-2.5 px-2 text-amber-300">{row.fpr}%</td>
                  <td className="py-2.5 px-2 text-slate-400">{row.weightConvergenceSpeed} r</td>
                  <td className="py-2.5 px-2 text-slate-300">{row.detectionRegret}</td>
                  <td className="py-2.5 px-2 font-bold text-cyan-300">{row.collaborativeAdvantage}%</td>
                  <td className="py-2.5 px-2 text-teal-300">{row.honeypotEngagementRate}%</td>
                  <td className="py-2.5 px-2 text-purple-300">{row.predictionAccuracy}%</td>
                  <td className="py-2.5 px-2 text-orange-300">{row.consistencyRejectionRate}%</td>
                  <td className="py-2.5 px-2 text-slate-400">{row.banditRegret}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Instrument Status Strip */}
      <div className="border-t border-white/[0.08] pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          Active Mission Profile: <strong className="text-cyan-300">Condition {activeCondition}</strong>
        </span>
        <span className="text-slate-500">Live Metric Recalibration Active</span>
      </div>
    </div>
  );

  return panelContent;
};

export default ExperimentTable;
