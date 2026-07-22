import React from 'react';
import { AlertEvent } from '../types';
import { ShieldAlert, Terminal, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AlertFeedProps {
  alerts: AlertEvent[];
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ alerts }) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          Live Threat Detection Feed
        </h3>
        <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
          {alerts.length} Total Alerts
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
        {alerts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 italic">
            No threat alerts recorded yet. Simulation running...
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border transition-all ${
                alert.rejectedByConsistency
                  ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                  : alert.isHoneypotCapture
                  ? 'bg-teal-950/20 border-teal-800/50 text-teal-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between font-mono mb-1">
                <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  R{alert.round} | {alert.timestamp}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {alert.mitreCode}
                </span>
              </div>

              <div className="flex items-center justify-between font-medium text-slate-100 my-1">
                <span>{alert.nodeName}</span>
                <span className="text-slate-400 text-[11px]">{alert.killChainStage}</span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                <span>Profile: <strong className="text-slate-200">{alert.attackerProfile}</strong></span>
                <span>Fused Score: <strong className="text-rose-400">{(alert.fusedScore * 100).toFixed(0)}%</strong></span>
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                {alert.rejectedByConsistency ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{alert.actionTaken}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
