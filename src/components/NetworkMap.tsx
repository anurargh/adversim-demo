import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { SimNode, NetworkEdge, NodeType } from '../types';
import { ARCHITECTURE_PRESETS, generateInitialWeights } from '../data/initialState';
import {
  Shield,
  Zap,
  Radio,
  X,
  Plus,
  Trash2,
  Link as LinkIcon,
  Layers,
  Settings2,
  Move,
  Server,
  Globe,
  Target,
  Cpu,
  Monitor,
  Activity,
  Sliders,
  Flame,
  AlertTriangle,
  RefreshCw,
  Crosshair,
  Maximize2,
  Minimize2,
  RotateCcw,
  Check
} from 'lucide-react';

export interface NetworkMapProps {
  nodes: SimNode[];
  edges: NetworkEdge[];
  selectedNodeId: string | null;
  selectedPresetId?: string;
  onSelectNode: (nodeId: string) => void;
  onAddNode?: (newNode: SimNode) => void;
  onDeleteNode?: (nodeId: string) => void;
  onUpdateNode?: (updatedNode: SimNode) => void;
  onAddEdge?: (sourceId: string, targetId: string) => void;
  onDeleteEdge?: (sourceId: string, targetId: string) => void;
  onMoveNode?: (nodeId: string, x: number, y: number) => void;
  onLoadPreset?: (presetId: string) => void;
  onInjectAttack?: (type: 'apt29' | 'pth' | 'exfil' | 'decoy_probe') => void;
  honeypotBroadcastActive?: boolean;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  nodes,
  edges,
  selectedNodeId,
  selectedPresetId = 'default-enterprise',
  onSelectNode,
  onAddNode,
  onDeleteNode,
  onUpdateNode,
  onAddEdge,
  onDeleteEdge,
  onMoveNode,
  onLoadPreset,
  onInjectAttack,
  honeypotBroadcastActive = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);

  // Modal for adding custom node
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('User');
  const [newNodeIp, setNewNodeIp] = useState('');
  const [newNodeFpr, setNewNodeFpr] = useState(0.015);
  const [newNodeFidelity, setNewNodeFidelity] = useState<'Medium' | 'High'>('Medium');

  // Node edit state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIp, setEditIp] = useState('');
  const [editFpr, setEditFpr] = useState(0.015);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;

  const isHoneypotTriggered =
    honeypotBroadcastActive ||
    nodes.some((n) => n.isHoneypot && n.status === 'under_attack');

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

  const getNodePos = useCallback(
    (node: SimNode, index: number, total: number, width: number, height: number) => {
      if (node.x !== undefined && node.y !== undefined) {
        // If node has saved position, scale properly if fullscreen
        if (isFullscreen) {
          const scaledX = (node.x / 650) * width;
          const scaledY = (node.y / 370) * height;
          return {
            x: Math.max(50, Math.min(width - 50, scaledX)),
            y: Math.max(50, Math.min(height - 50, scaledY)),
          };
        }
        return { x: node.x, y: node.y };
      }
      const angle = (2 * Math.PI * index) / Math.max(1, total);
      const radius = Math.min(width, height) * (isFullscreen ? 0.38 : 0.35);
      return {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      };
    },
    [isFullscreen]
  );

  const renderD3 = useCallback(() => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || svgRef.current.clientWidth || (isFullscreen ? window.innerWidth - 60 : 650);
    const height = rect.height || svgRef.current.clientHeight || (isFullscreen ? window.innerHeight - 200 : 370);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Define SVG Gradients & Glow Filters
    const defs = svg.append('defs');

    // Glow Filter
    const filter = defs.append('filter').attr('id', 'cyan-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const redFilter = defs.append('filter').attr('id', 'red-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    redFilter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'coloredBlur');
    const redMerge = redFilter.append('feMerge');
    redMerge.append('feMergeNode').attr('in', 'coloredBlur');
    redMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Radar gradient
    const radarGrad = defs.append('radialGradient')
      .attr('id', 'radar-sweep-grad')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    radarGrad.append('stop').attr('offset', '0%').attr('stop-color', '#00f0ff').attr('stop-opacity', '0.08');
    radarGrad.append('stop').attr('offset', '80%').attr('stop-color', '#00f0ff').attr('stop-opacity', '0.02');
    radarGrad.append('stop').attr('offset', '100%').attr('stop-color', '#00f0ff').attr('stop-opacity', '0');

    const positionsMap: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n, idx) => {
      positionsMap[n.id] = getNodePos(n, idx, nodes.length, width, height);
    });

    const g = svg.append('g');

    // 1. Radar Concentric Rings & Azimuth Crosshairs
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(cx, cy) * 0.85;

    // Outer range disc
    g.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', maxRadius)
      .attr('fill', 'url(#radar-sweep-grad)');

    [0.33, 0.66, 1.0].forEach((fraction) => {
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', maxRadius * fraction)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(0, 240, 255, 0.12)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    });

    // Azimuth axes
    g.append('line')
      .attr('x1', cx - maxRadius * 1.1)
      .attr('y1', cy)
      .attr('x2', cx + maxRadius * 1.1)
      .attr('y2', cy)
      .attr('stroke', 'rgba(0, 240, 255, 0.08)')
      .attr('stroke-width', 1);

    g.append('line')
      .attr('x1', cx)
      .attr('y1', cy - maxRadius * 1.1)
      .attr('x2', cx)
      .attr('y2', cy + maxRadius * 1.1)
      .attr('stroke', 'rgba(0, 240, 255, 0.08)')
      .attr('stroke-width', 1);

    // Rotating Radar Sweep Vector
    const sweepGroup = g.append('g')
      .attr('transform', `translate(${cx}, ${cy})`)
      .attr('class', 'animate-radar-sweep pointer-events-none');

    sweepGroup.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', -maxRadius)
      .attr('stroke', '#00f0ff')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4);

    // 2. Draw Edges / Links with Traveling Packet Pulses
    edges.forEach((edge, edgeIdx) => {
      const sourcePos = positionsMap[edge.source];
      const targetPos = positionsMap[edge.target];
      if (!sourcePos || !targetPos) return;

      const isConnectedToSelected =
        selectedNodeId === edge.source || selectedNodeId === edge.target;

      const edgeColor = isHoneypotTriggered
        ? '#00ffaa'
        : isConnectedToSelected
        ? '#00f0ff'
        : 'rgba(51, 65, 85, 0.7)';

      const edgeWidth = isHoneypotTriggered ? 2.5 : isConnectedToSelected ? 2 : 1.2;

      // Base Edge Line
      g.append('line')
        .attr('x1', sourcePos.x)
        .attr('y1', sourcePos.y)
        .attr('x2', targetPos.x)
        .attr('y2', targetPos.y)
        .attr('stroke', edgeColor)
        .attr('stroke-width', edgeWidth)
        .attr('stroke-dasharray', isConnectedToSelected ? '6,4' : 'none')
        .attr('class', isConnectedToSelected ? 'animate-packet-flow' : '');

      // Moving animated packet dot along the link
      const packetDot = g.append('circle')
        .attr('r', isConnectedToSelected ? 3.5 : 2.5)
        .attr('fill', isHoneypotTriggered ? '#00ffaa' : isConnectedToSelected ? '#00f0ff' : '#38bdf8')
        .attr('filter', 'url(#cyan-glow)');

      // Animate packet back and forth
      const animatePacket = () => {
        packetDot
          .attr('cx', sourcePos.x)
          .attr('cy', sourcePos.y)
          .transition()
          .duration(1800 + (edgeIdx % 3) * 400)
          .ease(d3.easeLinear)
          .attr('cx', targetPos.x)
          .attr('cy', targetPos.y)
          .transition()
          .duration(1800 + (edgeIdx % 3) * 400)
          .ease(d3.easeLinear)
          .attr('cx', sourcePos.x)
          .attr('cy', sourcePos.y)
          .on('end', animatePacket);
      };
      animatePacket();

      // Clickable Disconnect Badge on Link Midpoint
      const midX = (sourcePos.x + targetPos.x) / 2;
      const midY = (sourcePos.y + targetPos.y) / 2;

      const edgeBadge = g.append('g')
        .attr('transform', `translate(${midX}, ${midY})`)
        .style('cursor', 'pointer')
        .on('click', (e) => {
          e.stopPropagation();
          if (onDeleteEdge) {
            onDeleteEdge(edge.source, edge.target);
          }
        });

      edgeBadge.append('circle')
        .attr('r', isFullscreen ? 8 : 6)
        .attr('fill', '#05070b')
        .attr('stroke', edgeColor)
        .attr('stroke-width', 1);

      edgeBadge.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', edgeColor)
        .attr('font-size', isFullscreen ? '9px' : '7px')
        .attr('font-family', 'monospace')
        .text('×');
    });

    // 3. Render Defender Nodes
    nodes.forEach((node) => {
      const pos = positionsMap[node.id];
      if (!pos) return;

      const isSelected = node.id === selectedNodeId;
      const isUnderAttack = node.status === 'under_attack';
      const isHoneypot = node.isHoneypot;
      const nodeRadius = isFullscreen ? 20 : 16;

      // Drag Behavior
      const drag = d3.drag<SVGGElement, unknown>()
        .on('drag', (event) => {
          const newX = Math.max(30, Math.min(width - 30, event.x));
          const newY = Math.max(30, Math.min(height - 30, event.y));
          if (onMoveNode) {
            // Unscale if fullscreen to keep consistent baseline
            const baseNodeX = isFullscreen ? (newX / width) * 650 : newX;
            const baseNodeY = isFullscreen ? (newY / height) * 370 : newY;
            onMoveNode(node.id, baseNodeX, baseNodeY);
          }
        });

      const nodeGroup = g.append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('cursor', isLinking ? 'crosshair' : 'grab')
        .call(drag as any)
        .on('click', (event) => {
          event.stopPropagation();
          if (isLinking) {
            if (!linkSourceId) {
              setLinkSourceId(node.id);
            } else if (linkSourceId !== node.id) {
              if (onAddEdge) {
                onAddEdge(linkSourceId, node.id);
              }
              setLinkSourceId(null);
              setIsLinking(false);
            }
          } else {
            onSelectNode(node.id);
          }
        });

      // Attack Shockwave Red Halo
      if (isUnderAttack) {
        nodeGroup.append('circle')
          .attr('r', nodeRadius + 10)
          .attr('fill', 'none')
          .attr('stroke', '#ff0055')
          .attr('stroke-width', 2)
          .attr('class', 'animate-ping opacity-90')
          .attr('filter', 'url(#red-glow)');

        nodeGroup.append('circle')
          .attr('r', nodeRadius + 16)
          .attr('fill', 'rgba(255, 0, 85, 0.15)')
          .attr('stroke', '#ff0055')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
      }

      // Selection Halo
      if (isSelected) {
        nodeGroup.append('circle')
          .attr('r', nodeRadius + 6)
          .attr('fill', 'none')
          .attr('stroke', '#00f0ff')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2')
          .attr('filter', 'url(#cyan-glow)');
      }

      // Node Fill & Stroke Styling
      let nodeFill = '#0a0e17';
      let nodeStroke = '#334155';

      if (isUnderAttack) {
        nodeFill = '#3b0716';
        nodeStroke = '#ff0055';
      } else if (isHoneypot) {
        nodeFill = '#022c22';
        nodeStroke = '#00ffaa';
      } else if (node.type === 'Admin') {
        nodeFill = '#1e1b4b';
        nodeStroke = '#818cf8';
      } else if (node.type === 'Server') {
        nodeFill = '#082f49';
        nodeStroke = '#38bdf8';
      } else if (node.type === 'SOC') {
        nodeFill = '#2e1065';
        nodeStroke = '#c084fc';
      }

      // Node Base Cylinder
      nodeGroup.append('circle')
        .attr('r', nodeRadius)
        .attr('fill', nodeFill)
        .attr('stroke', nodeStroke)
        .attr('stroke-width', isSelected ? 2.5 : 1.5)
        .attr('filter', isSelected || isUnderAttack ? (isUnderAttack ? 'url(#red-glow)' : 'url(#cyan-glow)') : 'none');

      // Node Archetype Label
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', isUnderAttack ? '#fecdd3' : isHoneypot ? '#6ee7b7' : '#e2e8f0')
        .attr('font-size', isFullscreen ? '10px' : '9px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', 'bold')
        .text(node.type.slice(0, 3).toUpperCase());

      // IP / Name Tag underneath
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', nodeRadius + 12)
        .attr('fill', isSelected ? '#00f0ff' : '#94a3b8')
        .attr('font-size', isFullscreen ? '9.5px' : '8.5px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', isSelected ? 'bold' : 'normal')
        .text(node.name.length > (isFullscreen ? 20 : 14) ? node.name.slice(0, isFullscreen ? 18 : 12) + '..' : node.name);

      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', nodeRadius + 22)
        .attr('fill', '#475569')
        .attr('font-size', isFullscreen ? '8.5px' : '7.5px')
        .attr('font-family', 'ui-monospace, monospace')
        .text(node.ip);

      // Quick Delete Badge on Selected Node
      if (isSelected && onDeleteNode) {
        const deleteBadge = nodeGroup
          .append('g')
          .attr('transform', `translate(${nodeRadius - 2}, ${-nodeRadius + 2})`)
          .style('cursor', 'pointer')
          .on('click', (event) => {
            event.stopPropagation();
            onDeleteNode(node.id);
          });

        deleteBadge.append('circle')
          .attr('r', isFullscreen ? 9 : 8)
          .attr('fill', '#ef4444')
          .attr('stroke', '#05070b')
          .attr('stroke-width', 1.5);

        deleteBadge.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#ffffff')
          .attr('font-size', isFullscreen ? '9px' : '8px')
          .attr('font-weight', 'bold')
          .text('✕');
      }
    });

  }, [nodes, edges, selectedNodeId, linkSourceId, isLinking, isHoneypotTriggered, isFullscreen, onSelectNode, onMoveNode, onDeleteEdge, onDeleteNode, onAddEdge, getNodePos]);

  useEffect(() => {
    renderD3();
    const handleResize = () => renderD3();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (svgRef.current) {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          renderD3();
        });
      });
      ro.observe(svgRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [renderD3, isFullscreen]);

  const handleOpenAddModal = (defaultType: NodeType) => {
    setNewNodeType(defaultType);
    setNewNodeName(`Defender ${defaultType}`);
    setNewNodeIp(`10.0.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 200) + 10}`);
    setNewNodeFpr(defaultType === 'Honeypot' ? 0.001 : 0.015);
    setNewNodeFidelity(defaultType === 'Honeypot' ? 'High' : 'Medium');
    setShowAddModal(true);
  };

  const handleSaveAddNode = () => {
    if (!onAddNode) return;
    const isHp = newNodeType === 'Honeypot';
    const newNode: SimNode = {
      id: `node-${newNodeType.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      name: newNodeName.trim() || `Defended ${newNodeType}`,
      type: newNodeType,
      ip: newNodeIp.trim() || '10.0.9.99',
      isHoneypot: isHp,
      fidelity: isHp ? newNodeFidelity : undefined,
      status: 'normal',
      fpr: Number(newNodeFpr.toFixed(4)),
      bayesianWeights: generateInitialWeights(),
      x: 320 + (Math.random() - 0.5) * 100,
      y: 180 + (Math.random() - 0.5) * 80,
    };

    onAddNode(newNode);
    setShowAddModal(false);
  };

  const handleStartEditNode = () => {
    if (!selectedNode) return;
    setEditingNodeId(selectedNode.id);
    setEditName(selectedNode.name);
    setEditIp(selectedNode.ip);
    setEditFpr(selectedNode.fpr);
  };

  const handleSaveEditNode = () => {
    if (!selectedNode || !onUpdateNode) return;
    onUpdateNode({
      ...selectedNode,
      name: editName.trim() || selectedNode.name,
      ip: editIp.trim() || selectedNode.ip,
      fpr: editFpr,
    });
    setEditingNodeId(null);
  };

  const panelContent = (
    <div
      ref={containerRef}
      className={`cockpit-panel rounded-xl p-4 flex flex-col justify-between relative transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] bg-[#07090e] p-4 sm:p-6 overflow-hidden shadow-2xl w-screen h-screen'
          : 'h-[450px]'
      }`}
    >
      {/* Top Header & Tactical Presets */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-live-blip" />
            <h3 className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-widest text-slate-100 flex items-center gap-1.5`}>
              Defensive Network Topology Map
            </h3>
            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {nodes.length} NODES // {edges.length} LINKS
            </span>
            {isFullscreen && (
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                FULLSCREEN TOPOLOGY STUDIO [ESC to exit]
              </span>
            )}
          </div>

          {/* Quick Preset Dial Strip & Fullscreen Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono">
              {ARCHITECTURE_PRESETS.map((preset) => {
                const isCurrent = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onLoadPreset && onLoadPreset(preset.id)}
                    className={`px-2 py-1 rounded border transition-colors whitespace-nowrap font-medium ${
                      isCurrent
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border-white/[0.08] hover:text-slate-200'
                    }`}
                    title={preset.description}
                  >
                    {preset.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Expand / Minimize Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/60'
              }`}
              title={isFullscreen ? 'Exit Full Screen (ESC)' : 'Expand to Full Screen Topology Studio'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Tactical Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 mr-1 hidden sm:inline">DEPLOY:</span>
            <button
              onClick={() => handleOpenAddModal('User')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/[0.08] rounded flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3 text-cyan-400" /> User
            </button>
            <button
              onClick={() => handleOpenAddModal('Server')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/[0.08] rounded flex items-center gap-1 transition-colors"
            >
              <Server className="w-3 h-3 text-sky-400" /> Server
            </button>
            <button
              onClick={() => handleOpenAddModal('Honeypot')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded flex items-center gap-1 transition-colors"
            >
              <Target className="w-3 h-3 text-teal-400" /> Decoy
            </button>
            <button
              onClick={() => handleOpenAddModal('Admin')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 rounded flex items-center gap-1 transition-colors"
            >
              <Shield className="w-3 h-3 text-indigo-400" /> Admin
            </button>
          </div>

          {/* Tactical Attack Simulation Injectors & Inspector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {onInjectAttack && (
              <>
                <button
                  onClick={() => onInjectAttack('apt29')}
                  className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded flex items-center gap-1 transition-colors font-bold"
                  title="Simulate Lateral Movement Probe"
                >
                  <Flame className="w-3 h-3 text-rose-400" /> APT29 Wave
                </button>
                <button
                  onClick={() => onInjectAttack('decoy_probe')}
                  className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded flex items-center gap-1 transition-colors font-bold"
                  title="Force Attacker Into Decoy Trap"
                >
                  <Crosshair className="w-3 h-3 text-emerald-400" /> Bait Trap
                </button>
              </>
            )}

            <button
              onClick={() => {
                setIsLinking(!isLinking);
                setLinkSourceId(null);
              }}
              className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors ${
                isLinking
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/[0.08]'
              }`}
            >
              <LinkIcon className="w-3 h-3" />
              {isLinking ? (linkSourceId ? 'Target Link...' : 'Pick Origin') : 'Wire Link'}
            </button>

            <button
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors ${
                sidePanelOpen ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 text-slate-400 border-white/[0.08]'
              }`}
            >
              <Sliders className="w-3 h-3" />
              Inspector
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 w-full relative min-h-0 overflow-hidden my-2">
        <svg ref={svgRef} className="w-full h-full radar-grid rounded-lg border border-white/[0.06]" />

        {/* Link Wiring Instruction Banner */}
        {isLinking && (
          <div className="absolute top-3 left-3 right-3 bg-amber-500/95 text-slate-950 px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center justify-between shadow-2xl animate-needle-settle z-30">
            <span>{linkSourceId ? `Click destination node to wire sharing telemetry link from [${linkSourceId}]` : 'Step 1: Select origin node to establish mesh link'}</span>
            <button onClick={() => { setIsLinking(false); setLinkSourceId(null); }} className="hover:underline bg-slate-950 text-white px-2 py-0.5 rounded text-[10px]">Cancel</button>
          </div>
        )}

        {/* Selected Node Quick Inspector Drawer */}
        {sidePanelOpen && selectedNode && (
          <div className={`absolute top-3 right-3 ${isFullscreen ? 'w-72' : 'w-60'} bg-slate-950/95 border border-cyan-500/40 rounded-lg p-3.5 text-xs font-mono backdrop-blur-md shadow-2xl space-y-2.5 animate-needle-settle z-30`}>
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Node Telemetry
              </span>
              <button onClick={() => setSidePanelOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {editingNodeId === selectedNode.id ? (
              /* Inline Edit Mode */
              <div className="space-y-2 text-[11px]">
                <div>
                  <label className="text-slate-400 block text-[9px] uppercase">Node Label</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-900 border border-cyan-500/40 rounded px-2 py-1 text-slate-100 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[9px] uppercase">IP Address</label>
                  <input
                    type="text"
                    value={editIp}
                    onChange={(e) => setEditIp(e.target.value)}
                    className="w-full bg-slate-900 border border-cyan-500/40 rounded px-2 py-1 text-slate-100 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[9px] uppercase">
                    False Positive Rate: {(editFpr * 100).toFixed(2)}%
                  </label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.05"
                    step="0.001"
                    value={editFpr}
                    onChange={(e) => setEditFpr(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 mt-1"
                  />
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={handleSaveEditNode}
                    className="flex-1 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded flex items-center justify-center gap-1 text-[10px]"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button
                    onClick={() => setEditingNodeId(null)}
                    className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="font-bold text-slate-200 truncate max-w-[130px]">{selectedNode.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className={`font-bold ${selectedNode.isHoneypot ? 'text-teal-300' : 'text-cyan-300'}`}>
                    {selectedNode.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP:</span>
                  <span className="text-slate-300">{selectedNode.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`font-bold ${
                    selectedNode.status === 'under_attack' ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                  }`}>
                    {selectedNode.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">False Pos. Rate:</span>
                  <span className="text-amber-300">{(selectedNode.fpr * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Connected Peers:</span>
                  <span className="text-slate-300 font-bold">
                    {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length}
                  </span>
                </div>

                <div className="pt-2 flex flex-col gap-1.5">
                  {onUpdateNode && (
                    <button
                      onClick={handleStartEditNode}
                      className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded flex items-center justify-center gap-1 text-[10px] font-bold transition-colors"
                    >
                      <Sliders className="w-3 h-3" /> Edit Node Parameters
                    </button>
                  )}

                  {onDeleteNode && (
                    <button
                      onClick={() => onDeleteNode(selectedNode.id)}
                      className="w-full py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded flex items-center justify-center gap-1 text-[10px] font-bold transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Decommission Node
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instrument Status Strip */}
      <div className="border-t border-white/[0.08] pt-2 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Standard
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
            Decoy Trap
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
            Admin
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Engaged
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>• Drag nodes to reposition topology</span>
          <span>• Click red × to remove links</span>
          {isFullscreen && <span className="text-cyan-400 font-bold">Press ESC to exit Fullscreen</span>}
        </div>
      </div>

      {/* Add Custom Node Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cockpit-panel rounded-xl max-w-md w-full p-5 flex flex-col gap-4 text-xs font-mono animate-needle-settle shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Deploy New Defender Node
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1 text-[10px] uppercase">Node Label / Hostname</label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.1] rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 text-[10px] uppercase">Role Archetype</label>
                  <select
                    value={newNodeType}
                    onChange={(e) => setNewNodeType(e.target.value as NodeType)}
                    className="w-full bg-slate-950 border border-white/[0.1] rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="User">User Workstation</option>
                    <option value="Server">Server / Database</option>
                    <option value="Admin">Admin Controller</option>
                    <option value="DMZ">DMZ Gateway</option>
                    <option value="Honeypot">Decoy Honeypot</option>
                    <option value="SOC">SOC Relay Hub</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 text-[10px] uppercase">IP Address</label>
                  <input
                    type="text"
                    value={newNodeIp}
                    onChange={(e) => setNewNodeIp(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.1] rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[10px] uppercase">
                  Sensor False Positive Rate: {(newNodeFpr * 100).toFixed(2)}%
                </label>
                <input
                  type="range"
                  min="0.001"
                  max="0.05"
                  step="0.001"
                  value={newNodeFpr}
                  onChange={(e) => setNewNodeFpr(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] pt-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddNode}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded transition-colors text-xs"
              >
                Deploy Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return panelContent;
};

export default NetworkMap;
