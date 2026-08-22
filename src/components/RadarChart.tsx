import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { SimNode } from '../types';
import { Activity, ShieldAlert, Target, Zap, Maximize2, Minimize2, X, BarChart3, Layers } from 'lucide-react';

export const TECH_KEYS_15 = [
  { key: 'network_scanning', label: 'Scan', alias: 'scanning', code: 'T1046', name: 'Network Service Scanning', stage: 'Reconnaissance' },
  { key: 'service_enumeration', label: 'Enum', alias: 'enum', code: 'T1057', name: 'Process / Service Discovery', stage: 'Reconnaissance' },
  { key: 'os_fingerprinting', label: 'OS-FP', alias: 'os', code: 'T1082', name: 'System Information Discovery', stage: 'Reconnaissance' },
  { key: 'credential_access', label: 'Creds', alias: 'credential', code: 'T1003', name: 'OS Credential Dumping', stage: 'Initial Access' },
  { key: 'script_execution', label: 'Script', alias: 'script', code: 'T1059', name: 'Command & Scripting Interpreter', stage: 'Execution' },
  { key: 'scheduled_task', label: 'Task', alias: 'task', code: 'T1053', name: 'Scheduled Task / Job', stage: 'Execution' },
  { key: 'process_injection', label: 'Inject', alias: 'injection', code: 'T1055', name: 'Process Injection', stage: 'Defense Evasion' },
  { key: 'registry_persistence', label: 'RegPersist', alias: 'registry', code: 'T1112', name: 'Modify Registry Persistence', stage: 'Persistence' },
  { key: 'account_creation', label: 'AccCreate', alias: 'account', code: 'T1136', name: 'Local / Domain Account Creation', stage: 'Persistence' },
  { key: 'log_clearing', label: 'LogClear', alias: 'log', code: 'T1070', name: 'Indicator Removal on Host', stage: 'Defense Evasion' },
  { key: 'lateral_movement', label: 'LatMove', alias: 'lateral', code: 'T1021', name: 'Remote Services Lateral Move', stage: 'Lateral Movement' },
  { key: 'pass_the_hash', label: 'PtH', alias: 'pth', code: 'T1550', name: 'Use Alternate Authentication Material', stage: 'Lateral Movement' },
  { key: 'outbound_transfer', label: 'Exfil', alias: 'exfil', code: 'T1041', name: 'Exfiltration Over C2 Channel', stage: 'Exfiltration' },
  { key: 'data_compression', label: 'Compress', alias: 'compress', code: 'T1560', name: 'Archive Collected Data', stage: 'Exfiltration' },
  { key: 'encrypted_channel', label: 'EncChan', alias: 'channel', code: 'T1573', name: 'Encrypted Non-Standard Channel', stage: 'Exfiltration' },
];

export interface RadarChartProps {
  weightVector?: Record<string, number>;
  weights?: Record<string, number>;
  selectedNode?: SimNode | null;
  nodeName?: string;
  ip?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  weightVector,
  weights,
  selectedNode,
  nodeName,
  ip,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredTech, setHoveredTech] = useState<{
    code: string;
    label: string;
    name: string;
    stage: string;
    val: number;
  } | null>(null);

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

  // Extract weights dictionary with fallback support
  const rawWeights = weightVector || weights || selectedNode?.bayesianWeights || {};
  const activeName = nodeName || selectedNode?.name || 'Tactical Node Profile';
  const activeIp = ip || selectedNode?.ip || '10.0.0.x';

  // Find dominant threat vector
  const data = TECH_KEYS_15.map((tech) => {
    const val =
      rawWeights[tech.key] ??
      rawWeights[tech.alias] ??
      rawWeights[tech.label] ??
      0.05;
    return {
      key: tech.key,
      label: tech.label,
      code: tech.code,
      name: tech.name,
      stage: tech.stage,
      val: Math.max(0, Math.min(1.0, val)),
    };
  });

  const maxTech = [...data].sort((a, b) => b.val - a.val)[0];
  const hasCriticalSpike = data.some((d) => d.val > 0.14);

  const drawRadar = useCallback(() => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || (isFullscreen ? window.innerWidth * 0.7 : 420);
    const height = rect.height || (isFullscreen ? window.innerHeight * 0.75 : 350);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) * (isFullscreen ? 0.78 : 0.68);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const numAxes = data.length; // 15
    const angleSlice = (Math.PI * 2) / numAxes;

    // Dynamic scale limit for high resolution
    const maxVal = d3.max(data, (d) => d.val) || 0.2;
    const scaleMax = Math.max(0.24, maxVal * 1.15);
    const rScale = d3.scaleLinear().domain([0, scaleMax]).range([0, radius]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${cx}, ${cy})`);

    // Tactical Dial Range Rings
    const levels = [0.25, 0.5, 0.75, 1.0];
    levels.forEach((level) => {
      const levelRadius = radius * level;
      const points: [number, number][] = data.map((_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return [levelRadius * Math.cos(angle), levelRadius * Math.sin(angle)];
      });

      // Polygon perimeter
      g.append('polygon')
        .attr('points', points.map((p) => p.join(',')).join(' '))
        .attr('fill', level === 1.0 ? 'rgba(6, 182, 212, 0.02)' : 'none')
        .attr('stroke', level === 1.0 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(51, 65, 85, 0.4)')
        .attr('stroke-width', level === 1.0 ? 1.5 : 1)
        .attr('stroke-dasharray', level === 1.0 ? 'none' : '2,3');

      // Calibration tick mark labels
      g.append('text')
        .attr('x', 4)
        .attr('y', -levelRadius + 3)
        .attr('fill', level === 1.0 ? '#06b6d4' : '#475569')
        .attr('font-size', isFullscreen ? '8.5px' : '7.5px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', 'bold')
        .text(`${Math.round(level * scaleMax * 100)}%`);
    });

    // Radial Spokes & MITRE Codes
    data.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const lineX = radius * Math.cos(angle);
      const lineY = radius * Math.sin(angle);

      // Spoke vector
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', lineX)
        .attr('y2', lineY)
        .attr('stroke', 'rgba(71, 85, 105, 0.4)')
        .attr('stroke-width', 1);

      // Label coordinate
      const labelRadius = radius + (isFullscreen ? 24 : 18);
      const labelX = labelRadius * Math.cos(angle);
      const labelY = labelRadius * Math.sin(angle);

      let anchor = 'middle';
      if (Math.abs(Math.cos(angle)) > 0.3) {
        anchor = Math.cos(angle) > 0 ? 'start' : 'end';
      }

      const isCritical = d.val > 0.14;

      const textNode = g.append('text')
        .attr('x', labelX)
        .attr('y', labelY + 3)
        .attr('text-anchor', anchor)
        .attr('fill', isCritical ? '#f87171' : '#94a3b8')
        .attr('font-size', isFullscreen ? '10px' : '8.5px')
        .attr('font-weight', isCritical ? 'bold' : 'normal')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('class', 'cursor-pointer hover:text-cyan-300 transition-colors')
        .text(d.code);

      textNode.on('mouseenter', () => setHoveredTech(d));
      textNode.on('mouseleave', () => setHoveredTech(null));
    });

    // Polygon Data Coordinates
    const pointsData: [number, number][] = data.map((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const r = rScale(d.val);
      return [r * Math.cos(angle), r * Math.sin(angle)];
    });

    const strokeColor = hasCriticalSpike ? '#ef4444' : '#06b6d4';
    const fillColor = hasCriticalSpike ? 'rgba(239, 68, 68, 0.28)' : 'rgba(6, 182, 212, 0.2)';

    const finalPoints = pointsData.map((p) => p.join(',')).join(' ');

    // Animated Kinetic Polygon
    g.append('polygon')
      .attr('points', finalPoints)
      .attr('fill', fillColor)
      .attr('stroke', strokeColor)
      .attr('stroke-width', isFullscreen ? 2.5 : 2)
      .attr('stroke-linejoin', 'round')
      .attr('filter', hasCriticalSpike ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' : 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.4))');

    // Vertex Target Indicators & Interactive Hit Areas
    data.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const r = rScale(d.val);
      const vx = r * Math.cos(angle);
      const vy = r * Math.sin(angle);
      const isCritical = d.val > 0.14;

      if (isCritical) {
        // Critical Ping Flare
        g.append('circle')
          .attr('cx', vx)
          .attr('cy', vy)
          .attr('r', isFullscreen ? 12 : 9)
          .attr('fill', 'none')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('class', 'animate-ping opacity-80');
      }

      // Vertex Core Dot
      const vertex = g.append('circle')
        .attr('cx', vx)
        .attr('cy', vy)
        .attr('r', isCritical ? (isFullscreen ? 5.5 : 4.5) : (isFullscreen ? 4 : 3))
        .attr('fill', isCritical ? '#ef4444' : '#22d3ee')
        .attr('stroke', '#07090e')
        .attr('stroke-width', 1.5)
        .attr('class', 'cursor-pointer transition-transform hover:scale-150');

      vertex.on('mouseenter', () => setHoveredTech(d));
      vertex.on('mouseleave', () => setHoveredTech(null));
    });
  }, [data, hasCriticalSpike, isFullscreen]);

  useEffect(() => {
    drawRadar();
    const handleResize = () => drawRadar();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (svgRef.current) {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          drawRadar();
        });
      });
      ro.observe(svgRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [drawRadar, isFullscreen]);

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
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasCriticalSpike ? 'bg-rose-500 animate-ping' : 'bg-cyan-400 animate-live-blip'}`} />
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-widest text-slate-100 flex items-center gap-1.5`}>
              15-Vector Bayesian Distribution
            </h3>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                EXPANDED RISK TELEMETRY
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[280px]">
            Target: <span className="text-slate-200 font-bold">{activeName}</span> ({activeIp})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[10px] rounded font-mono font-bold border ${
            hasCriticalSpike 
              ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 animate-pulse' 
              : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
          }`}>
            {hasCriticalSpike ? 'ALERT: ANOMALY SPIKE' : 'NOMINAL BALANCE'}
          </span>

          {/* Fullscreen Expand / Minimize Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
              isFullscreen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/60'
            }`}
            title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand Radar to Full Screen'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand Radar to Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex min-h-0 overflow-hidden my-2 gap-4 ${isFullscreen ? 'flex-col lg:flex-row' : 'flex-col'}`}>
        {/* Radar SVG Canvas */}
        <div className={`relative flex-1 flex items-center justify-center min-h-0 overflow-hidden ${isFullscreen ? 'lg:flex-[3]' : 'w-full'}`}>
          <svg ref={svgRef} className="w-full h-full max-w-[580px] max-h-[500px]" />

          {/* Hover / Tooltip HUD Readout */}
          {hoveredTech && (
            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/95 border border-cyan-500/40 rounded-lg p-2.5 shadow-2xl backdrop-blur-md flex items-center justify-between text-xs font-mono animate-needle-settle z-20">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-bold text-[10px]">
                  {hoveredTech.code}
                </span>
                <div>
                  <span className="font-bold text-slate-100 block text-[11px]">{hoveredTech.name}</span>
                  <span className="text-[10px] text-slate-400">{hoveredTech.stage}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Bayesian Density</span>
                <span className={`text-xs font-bold ${(hoveredTech.val * 100) > 14 ? 'text-rose-400' : 'text-cyan-300'}`}>
                  {(hoveredTech.val * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* In Fullscreen Mode: Detailed 15-Vector MITRE Table & Stage Breakdown */}
        {isFullscreen && (
          <div className="lg:flex-[2] bg-slate-950/80 border border-white/[0.08] rounded-lg p-3.5 flex flex-col justify-between overflow-hidden text-xs font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                MITRE ATT&CK Surface Breakdown
              </span>
              <span className="text-[10px] text-slate-400">15 Total Attack Vectors</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 my-2 pr-1 min-h-0 text-[11px]">
              {[...data].sort((a, b) => b.val - a.val).map((tech) => {
                const pct = (tech.val * 100);
                const isCrit = pct > 14;
                return (
                  <div
                    key={tech.key}
                    onMouseEnter={() => setHoveredTech(tech)}
                    onMouseLeave={() => setHoveredTech(null)}
                    className={`p-2 rounded border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isCrit
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        : 'bg-slate-900/60 border-white/[0.05] hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate max-w-[200px]">
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                        isCrit ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {tech.code}
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-slate-200 truncate">{tech.name}</div>
                        <div className="text-[9px] text-slate-400">{tech.stage}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${isCrit ? 'bg-rose-500' : 'bg-cyan-400'}`}
                          style={{ width: `${Math.min(100, (pct / 25) * 100)}%` }}
                        />
                      </div>
                      <span className={`font-bold text-[11px] w-12 text-right ${isCrit ? 'text-rose-400' : 'text-cyan-300'}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[10px] text-slate-400 pt-1 border-t border-white/[0.05] flex justify-between">
              <span>Updated via recursive Bayesian updates</span>
              <span className="text-cyan-300">Sum: 100.0%</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Instrument Status Strip */}
      <div className="border-t border-white/[0.08] pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Standard Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Spike (&gt;14%)
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-300">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Top Vector: <strong className="text-amber-300">{maxTech?.code}</strong> ({(maxTech?.val * 100).toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );

  return panelContent;
};

export default RadarChart;
