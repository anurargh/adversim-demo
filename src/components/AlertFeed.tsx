import React, { useState, useEffect } from 'react';
import { AlertEvent } from '../types';
import {
  ShieldAlert,
  Terminal,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Filter,
  Target,
  Zap,
  Maximize2,
  Minimize2,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface AlertFeedProps {
  alerts: AlertEvent[];
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ alerts }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'HONEYPOT' | 'REJECTED' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredAlerts = alerts.filter((alert) => {
    if (filterMode === 'HONEYPOT' && !alert.isHoneypotCapture) return false;
    if (filterMode === 'REJECTED' && !alert.rejectedByConsistency) return false;
    if (filterMode === 'CRITICAL' && alert.fusedScore < 0.75) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        alert.nodeName.toLowerCase().includes(q) ||
        alert.mitreCode.toLowerCase().includes(q) ||
        alert.killChainStage.toLowerCase().includes(q) ||
        alert.attackerProfile.toLowerCase().includes(q) ||
        alert.actionTaken.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const honeypotCount = alerts.filter((a) => a.isHoneypotCapture).length;
  const rejectedCount = alerts.filter((a) => a.rejectedByConsistency).length;
  const criticalCount = alerts.filter((a) => a.fusedScore >= 0.75).length;

  const panelContent = (
    <div
      ref={containerRef}
      className={`cockpit-panel rounded-xl p-4 flex flex-col justify-between transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-hidden shadow-2xl w-screen h-screen'
          : 'h-[450px]'
      }`}
    >
      {/* Instrument Header */}
      <div>
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-widest text-slate-100 flex items-center gap-1.5`}>
              Live Threat Intercept Register
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40">
                DEEP THREAT ANALYSIS STREAM
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/30">
              {alerts.length} INTERCEPTS
            </span>

            {/* Fullscreen Expand / Minimize Toggle */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/60'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Alert Register to Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Alert Register to Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Controls & Search (Expanded in Fullscreen) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2.5">
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950/80 rounded-lg border border-white/[0.05] text-[10px] font-mono flex-1">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`py-1 px-1 rounded text-center transition-colors font-semibold truncate ${
                filterMode === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL ({alerts.length})
            </button>

            <button
              onClick={() => setFilterMode('HONEYPOT')}
              className={`py-1 px-1 rounded text-center transition-colors font-semibold truncate ${
                filterMode === 'HONEYPOT'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DECOY ({honeypotCount})
            </button>

            <button
              onClick={() => setFilterMode('REJECTED')}
              className={`py-1 px-1 rounded text-center transition-colors font-semibold truncate ${
                filterMode === 'REJECTED'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FILT ({rejectedCount})
            </button>

            <button
              onClick={() => setFilterMode('CRITICAL')}
              className={`py-1 px-1 rounded text-center transition-colors font-semibold truncate ${
                filterMode === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CRIT ({criticalCount})
            </button>
          </div>

          {isFullscreen && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by node, MITRE code, stage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.1] rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rolling Telemetry Alert Stream */}
      <div className={`flex-1 overflow-y-auto space-y-2 pr-1 mt-2.5 min-h-0 ${isFullscreen ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 space-y-0' : ''}`}>
        {filteredAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 font-mono text-xs col-span-full py-12">
            <Radio className="w-6 h-6 text-slate-600 animate-pulse" />
            <span>No threat intercepts matching selected telemetry criteria...</span>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => {
            const isLatest = index === 0;

            let borderStyle = 'border-white/[0.08] bg-slate-950/70 text-slate-300';
            let tagColor = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
            let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />;

            if (alert.rejectedByConsistency) {
              borderStyle = 'border-amber-500/40 bg-amber-950/20 text-amber-200';
              tagColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
            } else if (alert.isHoneypotCapture) {
              borderStyle = 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200';
              tagColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              statusIcon = <Zap className="w-3.5 h-3.5 text-emerald-400" />;
            } else if (alert.fusedScore >= 0.75) {
              borderStyle = 'border-rose-500/50 bg-rose-950/30 text-rose-100';
              tagColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              statusIcon = <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
            }

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${borderStyle} ${
                  isLatest ? 'animate-alert-entry shadow-lg' : ''
                }`}
              >
                {/* Top Telemetry Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">
                      R{alert.round}
                    </span>
                    <span className="text-slate-400 text-[10px]">{alert.timestamp}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${tagColor}`}>
                    {alert.mitreCode}
                  </span>
                </div>

                {/* Node Target & MITRE Technique Progression */}
                <div className="flex items-baseline justify-between my-1">
                  <span className="font-bold text-slate-100 text-[11px] truncate max-w-[170px]">
                    {alert.nodeName}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {alert.killChainStage}
                  </span>
                </div>

                {/* Score Barometer & Profile Vector */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-white/[0.06]">
                  <span className="truncate max-w-[140px]">
                    Adversary: <strong className="text-slate-200">{alert.attackerProfile}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <span>Fused Score:</span>
                    <span className={`font-bold ${
                      alert.fusedScore >= 0.7 ? 'text-rose-400' : 'text-cyan-300'
                    }`}>
                      {(alert.fusedScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Action Taken Status Indicator */}
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-300">
                  {statusIcon}
                  <span className="truncate">{alert.actionTaken}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Instrument Status Strip */}
      <div className="border-t border-white/[0.08] pt-2 mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Real-Time Anomaly Interceptor Active
        </span>
        <span className="text-slate-500">Auto-Scrolling Buffer ({alerts.length} Total)</span>
      </div>
    </div>
  );

  return panelContent;
};

export default AlertFeed;
