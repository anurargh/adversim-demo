import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SimNode } from '../types';

export const TECH_KEYS_15 = [
  { key: 'network_scanning', label: 'Scan', alias: 'scanning', code: 'T1046' },
  { key: 'service_enumeration', label: 'Enum', alias: 'enum', code: 'T1057' },
  { key: 'os_fingerprinting', label: 'OS-FP', alias: 'os', code: 'T1082' },
  { key: 'credential_access', label: 'Creds', alias: 'credential', code: 'T1003' },
  { key: 'script_execution', label: 'Script', alias: 'script', code: 'T1059' },
  { key: 'scheduled_task', label: 'Task', alias: 'task', code: 'T1053' },
  { key: 'process_injection', label: 'Inject', alias: 'injection', code: 'T1055' },
  { key: 'registry_persistence', label: 'RegPersist', alias: 'registry', code: 'T1112' },
  { key: 'account_creation', label: 'AccCreate', alias: 'account', code: 'T1136' },
  { key: 'log_clearing', label: 'LogClear', alias: 'log', code: 'T1070' },
  { key: 'lateral_movement', label: 'LatMove', alias: 'lateral', code: 'T1021' },
  { key: 'pass_the_hash', label: 'PtH', alias: 'pth', code: 'T1550' },
  { key: 'outbound_transfer', label: 'Exfil', alias: 'exfil', code: 'T1041' },
  { key: 'data_compression', label: 'Compress', alias: 'compress', code: 'T1560' },
  { key: 'encrypted_channel', label: 'EncChan', alias: 'channel', code: 'T1573' },
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
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Extract weights dictionary with fallback support for alias keys
  const rawWeights = weightVector || weights || selectedNode?.bayesianWeights || {};
  const activeName = nodeName || selectedNode?.name || 'Node Risk Profile';
  const activeIp = ip || selectedNode?.ip || '10.0.0.x';

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 420;
    const height = 360;
    const cx = width / 2;
    const cy = height / 2 - 10;
    const radius = 125;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Map weights to 15 standard techniques
    const data = TECH_KEYS_15.map((tech) => {
      let val =
        rawWeights[tech.key] ??
        rawWeights[tech.alias] ??
        rawWeights[tech.label] ??
        0.05;
      return {
        key: tech.key,
        label: tech.label,
        code: tech.code,
        val: Math.max(0, Math.min(1.0, val)),
      };
    });

    const numAxes = data.length; // 15
    const angleSlice = (Math.PI * 2) / numAxes;

    // Scale range (assume 0 to max weight or 0.35 threshold)
    const maxVal = d3.max(data, (d) => d.val) || 0.2;
    const scaleMax = Math.max(0.25, maxVal * 1.1); // Dynamic scaling for high resolution
    const rScale = d3.scaleLinear().domain([0, scaleMax]).range([0, radius]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${cx}, ${cy})`);

    // 1. Draw concentric background grid 15-point polygons
    const levels = [0.25, 0.5, 0.75, 1.0];
    levels.forEach((level) => {
      const levelRadius = radius * level;
      const points: [number, number][] = data.map((_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return [levelRadius * Math.cos(angle), levelRadius * Math.sin(angle)];
      });

      g.append('polygon')
        .attr('points', points.map((p) => p.join(',')).join(' '))
        .attr('fill', 'none')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', level === 1.0 ? 'none' : '2,2');

      // Grid level percent label
      g.append('text')
        .attr('x', 4)
        .attr('y', -levelRadius + 3)
        .attr('fill', '#475569')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .text(`${Math.round(level * scaleMax * 100)}%`);
    });

    // 2. Draw 15 Radial Axis Lines and Labels
    data.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const lineX = radius * Math.cos(angle);
      const lineY = radius * Math.sin(angle);

      // Radial Line
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', lineX)
        .attr('y2', lineY)
        .attr('stroke', '#334155')
        .attr('stroke-width', 1);

      // Label Position
      const labelRadius = radius + 18;
      const labelX = labelRadius * Math.cos(angle);
      const labelY = labelRadius * Math.sin(angle);

      let anchor = 'middle';
      if (Math.abs(Math.cos(angle)) > 0.3) {
        anchor = Math.cos(angle) > 0 ? 'start' : 'end';
      }

      const isCritical = d.val > 0.14; // Critical threshold highlight

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY + 3)
        .attr('text-anchor', anchor)
        .attr('fill', isCritical ? '#f87171' : '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-weight', isCritical ? 'bold' : 'normal')
        .attr('font-family', 'monospace')
        .text(`${d.code}`);
    });

    // 3. Polygon Data Coordinates
    const pointsData: [number, number][] = data.map((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const r = rScale(d.val);
      return [r * Math.cos(angle), r * Math.sin(angle)];
    });

    // Determine color: blue for standard defender, shifting towards red when critical weights exist
    const hasCritical = data.some((d) => d.val > 0.15);
    const strokeColor = hasCritical ? '#ef4444' : '#3b82f6';
    const fillColor = hasCritical ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)';

    // Initial zero polygon for transition start
    const zeroPoints = data
      .map((_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return `0,0`;
      })
      .join(' ');

    const finalPoints = pointsData.map((p) => p.join(',')).join(' ');

    // 4. Draw Animated Polygon Path
    const polygon = g
      .append('polygon')
      .attr('points', zeroPoints)
      .attr('fill', fillColor)
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('class', 'transition-all duration-500');

    polygon
      .transition()
      .duration(450)
      .ease(d3.easeCubicOut)
      .attr('points', finalPoints);

    // 5. Draw Vertex Points & Glowing Indicators for Critical Weights
    data.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const r = rScale(d.val);
      const vx = r * Math.cos(angle);
      const vy = r * Math.sin(angle);
      const isCritical = d.val > 0.14;

      if (isCritical) {
        // Red Pulsing Ring
        g.append('circle')
          .attr('cx', vx)
          .attr('cy', vy)
          .attr('r', 7)
          .attr('fill', 'none')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.8)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '4;10;4')
          .attr('dur', '1.5s')
          .attr('repeatCount', 'indefinite');
      }

      // Vertex dot
      g.append('circle')
        .attr('cx', vx)
        .attr('cy', vy)
        .attr('r', isCritical ? 4 : 2.5)
        .attr('fill', isCritical ? '#ef4444' : '#60a5fa')
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1);
    });
  }, [rawWeights, activeName, activeIp]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col items-center justify-between">
      <div className="w-full flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            15-Point Bayesian Weight Vector
          </h3>
          <p className="text-xs text-slate-400">{activeName}</p>
        </div>
        <span className="px-2 py-0.5 text-[11px] rounded bg-slate-800 text-blue-400 border border-slate-700 font-mono">
          {activeIp}
        </span>
      </div>

      <div className="w-full h-[320px] relative flex items-center justify-center">
        <svg ref={svgRef} className="w-full h-full max-w-[420px] max-h-[340px]" />
      </div>

      <div className="w-full flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
          Defender Standard (Blue)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
          Critical Threat Spike (Red)
        </span>
        <span>15 MITRE Surfaces</span>
      </div>
    </div>
  );
};

export default RadarChart;
