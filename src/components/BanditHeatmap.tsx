import React from 'react';
import { UcbSurfaceStats } from '../types';
import { Cpu } from 'lucide-react';

interface BanditHeatmapProps {
  ucbStats: UcbSurfaceStats[];
}

export const BanditHeatmap: React.FC<BanditHeatmapProps> = ({ ucbStats }) => {
  const sorted = [...ucbStats].sort((a, b) => b.ucbScore - a.ucbScore);
  const maxScore = Math.max(...sorted.map((s) => s.ucbScore), 1.0);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            Adaptive Bandit (UCB) Surface Concentration
          </h3>
          <p className="text-xs text-slate-400">
            UCB Score = avg_success + sqrt(2 * log(total) / attempts)
          </p>
        </div>
        <span className="text-xs font-mono text-amber-400 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
          Upper Confidence Bound
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
        {sorted.map((stat) => {
          const fillWidth = Math.min(100, Math.max(5, (stat.ucbScore / maxScore) * 100));

          return (
            <div
              key={stat.surface}
              className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold text-[10px]">
                    {stat.mitreCode}
                  </span>
                  {stat.surface.replace('_', ' ')}
                </span>
                <span className="text-amber-400 font-bold">
                  UCB: {stat.ucbScore.toFixed(2)}
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${fillWidth}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Attempts: {stat.attempts}</span>
                <span>Success Rate: {(stat.avgSuccess * 100).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
