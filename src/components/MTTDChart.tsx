import React from 'react';
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
import { Activity } from 'lucide-react';

interface MTTDChartProps {
  history: { round: number; [key: string]: number }[];
}

export const MTTDChart: React.FC<MTTDChartProps> = ({ history }) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Mean Time To Detection (MTTD) Across Experimental Conditions
          </h3>
          <p className="text-xs text-slate-400">
            Comparative ablation trajectories over simulation rounds (lower is better)
          </p>
        </div>
      </div>

      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="round" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'MTTD (s)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="ConditionA" name="A: Baseline" stroke="#94a3b8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ConditionB" name="B: Collab" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ConditionC" name="C: Honeypot" stroke="#14b8a6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ConditionD" name="D: Predictor" stroke="#a855f7" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ConditionE" name="E: All (Naive)" stroke="#eab308" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ConditionF" name="F: Full (Bandit)" stroke="#ef4444" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
