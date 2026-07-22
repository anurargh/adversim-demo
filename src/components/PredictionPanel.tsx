import React from 'react';
import { StagePrediction } from '../types';
import { Target, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface PredictionPanelProps {
  predictions: StagePrediction[];
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ predictions }) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          Probabilistic Stage Forecasts & Pre-Hardening
        </h3>
        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
          Markov Chain Predictor
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
        {predictions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 italic">
            Gathering sequence transition data from honeypots...
          </div>
        ) : (
          predictions.map((pred, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between font-medium text-slate-200">
                <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Target Node: {pred.nodeId}
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {(pred.confidence * 100).toFixed(0)}% Confidence
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Current Stage</span>
                  <span className="font-semibold text-slate-300">{pred.currentStage}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Forecasted Stage</span>
                  <span className="font-semibold text-rose-400">{pred.predictedNextStage}</span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Pre-Hardened Attack Surfaces:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {pred.recommendedPreHardening.map((surf) => (
                    <span
                      key={surf}
                      className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono text-[10px]"
                    >
                      {surf.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
