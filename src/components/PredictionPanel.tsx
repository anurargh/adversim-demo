import React, { useState, useEffect } from 'react';
import { StagePrediction } from '../types';
import { Target, ArrowRight, ShieldCheck, Zap, Radio, GitBranch, Cpu, Maximize2, Minimize2, Activity, Layers } from 'lucide-react';

interface PredictionPanelProps {
  predictions: StagePrediction[];
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ predictions }) => {
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
          : 'h-[420px]'
      }`}
    >
      {/* Instrument Header */}
      <div>
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-live-blip" />
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-widest text-slate-100 flex items-center gap-1.5`}>
              Markov Stage Forecast & Pre-Hardening
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40">
                TRANSITION MATRIX VIEW
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30">
              MARKOV ENGINE ACTIVE
            </span>

            {/* Fullscreen Expand / Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/60'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Markov Engine to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Markov Engine to Full Screen'}
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
          Real-time probabilistic forecasting of adversary kill chain transitions and proactive surface pre-hardening.
        </p>
      </div>

      {/* Prediction Cards Stream */}
      <div className={`flex-1 overflow-y-auto space-y-2.5 my-2 pr-1 min-h-0 ${isFullscreen ? 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0' : ''}`}>
        {predictions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 italic col-span-full py-12">
            <Cpu className="w-6 h-6 text-slate-600 animate-pulse" />
            <span>Gathering sequence transition data from honeypot intercepts...</span>
          </div>
        ) : (
          predictions.map((pred, idx) => {
            const isTop = idx === 0;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border bg-slate-950/80 transition-all ${
                  isTop ? 'border-purple-500/40 shadow-lg animate-alert-entry' : 'border-white/[0.06]'
                }`}
              >
                {/* Node Target & Confidence Meter */}
                <div className="flex items-center justify-between font-bold mb-2">
                  <span className="text-purple-300 flex items-center gap-1.5 text-[11px]">
                    <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                    Target: {pred.nodeId}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Transition Likelihood:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      {(pred.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Transition Pipeline Vector */}
                <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-md border border-white/[0.04] text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase">Observed Stage</span>
                    <span className="font-bold text-slate-200">{pred.currentStage}</span>
                  </div>

                  <div className="flex items-center gap-1 text-purple-400 font-bold text-xs">
                    <span>─────▶</span>
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-slate-500 uppercase">Forecasted Pivot</span>
                    <span className="font-bold text-rose-400">{pred.predictedNextStage}</span>
                  </div>
                </div>

                {/* Pre-Hardening Recommendation Chips */}
                <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1.5 text-[10px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Proactively Pre-Hardening Surfaces:
                    </span>
                    <span className="text-teal-300 font-semibold">Risk Weight Boost Applied</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pred.recommendedPreHardening.map((surf) => (
                      <span
                        key={surf}
                        className="px-2 py-1 rounded bg-teal-950/60 text-teal-300 border border-teal-500/30 font-mono text-[9.5px] uppercase tracking-wider font-semibold flex items-center gap-1"
                      >
                        <Zap className="w-2.5 h-2.5 text-teal-400" />
                        {surf.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Instrument Status Strip */}
      <div className="border-t border-white/[0.08] pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
          Proactive Weight Mutation Engine Active
        </span>
        <span className="text-slate-500">Bayesian Risk Pre-Shifted</span>
      </div>
    </div>
  );

  return panelContent;
};

export default PredictionPanel;
