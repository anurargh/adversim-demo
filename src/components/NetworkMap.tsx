import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SimNode, NetworkEdge } from '../types';
import { RadarChart } from './RadarChart';
import { Shield, Zap, Radio, X } from 'lucide-react';

export interface NetworkMapProps {
  nodes: SimNode[];
  edges: NetworkEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  honeypotBroadcastActive?: boolean;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  honeypotBroadcastActive = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;

  // Check if any honeypot is currently under attack to trigger simultaneous edge flashing
  const isHoneypotTriggered =
    honeypotBroadcastActive ||
    nodes.some((n) => n.isHoneypot && n.status === 'under_attack');

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || 600;
    const height = 380;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Node Positions Layout
    const nodePositions: Record<string, { x: number; y: number }> = {
      'node-dmz-1': { x: width * 0.15, y: height * 0.28 },
      'node-user-1': { x: width * 0.38, y: height * 0.22 },
      'node-user-2': { x: width * 0.38, y: height * 0.62 },
      'node-server-1': { x: width * 0.62, y: height * 0.42 },
      'node-admin-1': { x: width * 0.82, y: height * 0.22 },
      'node-honeypot-1': { x: width * 0.62, y: height * 0.78 },
      'node-honeypot-2': { x: width * 0.82, y: height * 0.68 },
    };

    const g = svg.append('g');

    // Filter glow definitions for detections and honeypot flashes
    const defs = svg.append('defs');
    
    // Green Glow Filter
    const greenFilter = defs.append('filter').attr('id', 'green-glow');
    greenFilter.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'coloredBlur');
    const greenMerge = greenFilter.append('feMerge');
    greenMerge.append('feMergeNode').attr('in', 'coloredBlur');
    greenMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Red Pulse Glow Filter
    const redFilter = defs.append('filter').attr('id', 'red-glow');
    redFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const redMerge = redFilter.append('feMerge');
    redMerge.append('feMergeNode').attr('in', 'coloredBlur');
    redMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // 1. Draw Network Edges (Lines)
    edges.forEach((edge) => {
      const sourcePos = nodePositions[edge.source];
      const targetPos = nodePositions[edge.target];
      if (!sourcePos || !targetPos) return;

      const line = g
        .append('line')
        .attr('x1', sourcePos.x)
        .attr('y1', sourcePos.y)
        .attr('x2', targetPos.x)
        .attr('y2', targetPos.y);

      if (isHoneypotTriggered) {
        // ALL lines flash simultaneously on honeypot broadcast!
        line
          .attr('stroke', '#06b6d4')
          .attr('stroke-width', 3)
          .attr('filter', 'url(#green-glow)')
          .append('animate')
          .attr('attributeName', 'stroke')
          .attr('values', '#06b6d4;#f59e0b;#06b6d4')
          .attr('dur', '0.6s')
          .attr('repeatCount', 'indefinite');
      } else if (edge.activeTraffic) {
        // Line lights up during intelligence sharing
        line
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '5,5')
          .append('animate')
          .attr('attributeName', 'stroke-dashoffset')
          .attr('from', '20')
          .attr('to', '0')
          .attr('dur', '1s')
          .attr('repeatCount', 'indefinite');
      } else {
        line.attr('stroke', '#334155').attr('stroke-width', 1.8);
      }
    });

    // 2. Draw Nodes (Circles for Regular, Hexagons for Honeypots)
    nodes.forEach((node) => {
      const pos = nodePositions[node.id] || { x: width / 2, y: height / 2 };
      const isSelected = selectedNodeId === node.id;
      const isUnderAttack = node.status === 'under_attack';
      const isDetected = node.status === 'normal' && node.lastDetectedRound !== undefined;

      const nodeGroup = g
        .append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          onSelectNode(node.id);
          setSidePanelOpen(true);
        });

      // Selection Highlight Ring
      if (isSelected) {
        nodeGroup
          .append('circle')
          .attr('r', 28)
          .attr('fill', 'none')
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3');
      }

      // Red Pulse Animation when Attack Hits Node
      if (isUnderAttack) {
        nodeGroup
          .append('circle')
          .attr('r', 22)
          .attr('fill', 'none')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 2)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '22;36;22')
          .attr('dur', '1.2s')
          .attr('repeatCount', 'indefinite');

        nodeGroup
          .append('circle')
          .attr('r', 22)
          .attr('fill', 'none')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1)
          .append('animate')
          .attr('attributeName', 'opacity')
          .attr('values', '1;0;1')
          .attr('dur', '1.2s')
          .attr('repeatCount', 'indefinite');
      }

      // Green Glow Ring when Detection Fires
      if (isDetected && !isUnderAttack) {
        nodeGroup
          .append('circle')
          .attr('r', 25)
          .attr('fill', 'none')
          .attr('stroke', '#10b981')
          .attr('stroke-width', 2)
          .attr('filter', 'url(#green-glow)');
      }

      if (node.isHoneypot) {
        // Hexagon shape for Honeypots
        const r = 22;
        const hexPoints = d3.range(0, 6).map((i) => {
          const angle = (Math.PI / 3) * i;
          return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
        }).join(' ');

        nodeGroup
          .append('polygon')
          .attr('points', hexPoints)
          .attr('fill', isUnderAttack ? '#dc2626' : '#0d9488')
          .attr('stroke', isSelected ? '#38bdf8' : '#14b8a6')
          .attr('stroke-width', 2)
          .attr('filter', isUnderAttack ? 'url(#red-glow)' : 'none');

        nodeGroup
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#ffffff')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'sans-serif')
          .text('HONEY');
      } else {
        // Circle shape for Regular Nodes
        const colorMap: Record<string, string> = {
          User: '#2563eb',
          Server: '#7c3aed',
          Admin: '#d97706',
          DMZ: '#db2777',
        };

        nodeGroup
          .append('circle')
          .attr('r', 20)
          .attr('fill', isUnderAttack ? '#ef4444' : colorMap[node.type] || '#475569')
          .attr('stroke', isSelected ? '#38bdf8' : '#1e293b')
          .attr('stroke-width', 2)
          .attr('filter', isUnderAttack ? 'url(#red-glow)' : 'none');

        nodeGroup
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text(node.type.substring(0, 3).toUpperCase());
      }

      // Node Name Label
      nodeGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 33)
        .attr('fill', '#e2e8f0')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text(node.name);

      // Node IP Sublabel
      nodeGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 45)
        .attr('fill', '#64748b')
        .attr('font-size', '8.5px')
        .attr('font-family', 'monospace')
        .text(node.ip);
    });
  }, [nodes, edges, selectedNodeId, isHoneypotTriggered, onSelectNode]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            Emulated Subnet Topology (Network Map)
          </h3>
          <p className="text-xs text-slate-400">
            Click any node to inspect risk profile in side panel
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> Circle = Regular
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-teal-500 rotate-45 inline-block"></span> Hexagon = Honeypot
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full h-[360px] relative rounded-lg bg-slate-950/80 border border-slate-800 overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />

        {/* Honeypot Flash Alert Overlay */}
        {isHoneypotTriggered && (
          <div className="absolute top-3 left-3 bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-md animate-pulse font-mono">
            <Zap className="w-4 h-4 text-amber-400" />
            [HONEYPOT BROADCAST] All network lines flashing simultaneously!
          </div>
        )}
      </div>

      {/* Slide-Over Side Panel on Node Click */}
      {selectedNode && sidePanelOpen && (
        <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-xl p-4 relative flex flex-col gap-3 shadow-2xl">
          <button
            onClick={() => setSidePanelOpen(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedNode.isHoneypot ? 'bg-teal-500/20 text-teal-300' : 'bg-blue-500/20 text-blue-300'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">{selectedNode.name}</h4>
              <p className="text-xs text-slate-400 font-mono">
                Type: {selectedNode.type} | IP: {selectedNode.ip} | FPR: {(selectedNode.fpr * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="w-full">
            <RadarChart selectedNode={selectedNode} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkMap;
