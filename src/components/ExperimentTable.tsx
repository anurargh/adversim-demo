import React from 'react';
import { AblationMetric, ConditionId } from '../types';
import { FlaskConical, CheckCircle } from 'lucide-react';

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
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg overflow-x-auto">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            Experimental Ablation Matrix (Conditions A – F)
          </h3>
          <p className="text-xs text-slate-400">
            Click any row to switch active experimental condition in real-time
          </p>
        </div>
      </div>

      <table className="w-full text-xs text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
            <th className="py-2.5 px-3">Condition</th>
            <th className="py-2.5 px-2">MTTD (s)</th>
            <th className="py-2.5 px-2">FPR (%)</th>
            <th className="py-2.5 px-2">Weight Conv.</th>
            <th className="py-2.5 px-2">Det. Regret</th>
            <th className="py-2.5 px-2">Collab. Adv</th>
            <th className="py-2.5 px-2">Honeypot Eng.</th>
            <th className="py-2.5 px-2">Pred. Acc.</th>
            <th className="py-2.5 px-2">Consistency Rej.</th>
            <th className="py-2.5 px-2">Bandit Regret</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {metrics.map((row) => {
            const isActive = activeCondition === row.conditionId;

            return (
              <tr
                key={row.conditionId}
                onClick={() => onSelectCondition(row.conditionId)}
                className={`cursor-pointer transition-colors hover:bg-slate-800/60 ${
                  isActive ? 'bg-cyan-950/30 font-semibold text-cyan-200' : 'text-slate-300'
                }`}
              >
                <td className="py-3 px-3 flex items-center gap-2 font-sans">
                  {isActive && <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  <span className={isActive ? 'text-cyan-300 font-bold' : 'text-slate-200'}>
                    {row.conditionName}
                  </span>
                </td>
                <td className="py-3 px-2 text-rose-400 font-bold">{row.mttd}s</td>
                <td className="py-3 px-2 text-amber-300">{row.fpr}%</td>
                <td className="py-3 px-2">{row.weightConvergenceSpeed} rounds</td>
                <td className="py-3 px-2">{row.detectionRegret}</td>
                <td className="py-3 px-2 text-blue-400">{row.collaborativeAdvantage}%</td>
                <td className="py-3 px-2 text-teal-400">{row.honeypotEngagementRate}%</td>
                <td className="py-3 px-2 text-purple-400">{row.predictionAccuracy}%</td>
                <td className="py-3 px-2 text-orange-400">{row.consistencyRejectionRate}%</td>
                <td className="py-3 px-2 text-slate-400">{row.banditRegret}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
