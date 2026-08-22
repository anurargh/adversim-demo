import React, { useState, useEffect, useRef } from 'react';
import { SimulationEngine } from './lib/simulationEngine';
import {
  INITIAL_NODES,
  INITIAL_EDGES,
  ABLATION_CONDITIONS,
  INITIAL_METRICS,
  INITIAL_UCB_STATS,
  ARCHITECTURE_PRESETS,
} from './data/initialState';
import { NetworkMap } from './components/NetworkMap';
import { RadarChart } from './components/RadarChart';
import { AlertFeed } from './components/AlertFeed';
import { MTTDChart } from './components/MTTDChart';
import { PredictionPanel } from './components/PredictionPanel';
import { BanditHeatmap } from './components/BanditHeatmap';
import { ExperimentTable } from './components/ExperimentTable';
import { ArchitectureBenchmark } from './components/ArchitectureBenchmark';
import { ConditionId, SimNode } from './types';
import { soundFx } from './utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Radio,
  Layers,
  Activity,
  Zap,
  Cpu,
  Share2,
  Target,
  FastForward,
  Clock,
  ShieldAlert,
  Volume2,
  VolumeX,
  Radar,
  BrainCircuit,
  BarChart3,
  FileCheck2,
  Sliders,
  Flame,
  Crosshair
} from 'lucide-react';

type ActiveTab = 'soc' | 'forecasting' | 'ablation' | 'audit';

export default function App() {
  const [engine] = useState(
    () =>
      new SimulationEngine({
        isRunning: true,
        currentRound: 0,
        speedMs: 1000,
        activeCondition: 'F',
        nodes: INITIAL_NODES,
        edges: INITIAL_EDGES,
        alerts: [],
        predictions: [],
        ucbStats: INITIAL_UCB_STATS,
        metrics: INITIAL_METRICS,
        mttdHistory: [
          {
            round: 0,
            ConditionA: 145,
            ConditionB: 95,
            ConditionC: 80,
            ConditionD: 70,
            ConditionE: 35,
            ConditionF: 36,
          },
        ],
        logs: ['[SYSTEM] AdverSim Kinetic Cyber-Defense Telemetry Suite Online.'],
        attackStartRound: null,
        rollingMttdBuffer: [],
        simMttdValues: { A: 140, B: 90, C: 75, D: 65, E: 30 },
        totalAlertCount: 0,
      })
  );

  const [simState, setSimState] = useState(engine.getState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('soc');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-user-1');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default-enterprise');
  const [wsConnected, setWsConnected] = useState(false);
  const [wsStatusMessage, setWsStatusMessage] = useState('Synchronizing Telemetry Channel...');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const toggleSound = () => {
    const isNowOn = soundFx.toggle();
    setSoundEnabled(isNowOn);
  };

  // WebSocket Connection Effect
  useEffect(() => {
    let ws: WebSocket | null = null;

    function connectWs() {
      const isHttps = window.location.protocol === 'https:';
      const protocol = isHttps ? 'wss:' : 'ws:';
      const primaryUrl = `${protocol}//${window.location.host}/ws`;
      
      setWsStatusMessage(`Connecting: ${primaryUrl}`);

      try {
        ws = new WebSocket(primaryUrl);

        ws.onopen = () => {
          setWsConnected(true);
          setWsStatusMessage(`ONLINE: ${primaryUrl}`);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ROUND_TICK') {
              const nextState = engine.stepRound();
              setSimState({ ...nextState });
              soundFx.playTick();
            } else if (data.type === 'STATUS') {
              engine.setState({ isRunning: data.running });
              setSimState({ ...engine.getState() });
            } else if (data.type === 'RESET') {
              engine.setState({ isRunning: true, currentRound: 0, alerts: [] });
              setSimState({ ...engine.getState() });
            }
          } catch (e) {}
        };

        ws.onerror = () => {
          if (!isHttps) {
            connectLocal8000Ws();
          } else {
            setWsConnected(false);
            setWsStatusMessage('LOCAL TELEMETRY ENGINE (ACTIVE)');
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
        };

        wsRef.current = ws;
      } catch (err) {
        if (!isHttps) connectLocal8000Ws();
      }
    }

    function connectLocal8000Ws() {
      try {
        const altWs = new WebSocket('ws://localhost:8000/ws');
        altWs.onopen = () => {
          setWsConnected(true);
          setWsStatusMessage('ONLINE: ws://localhost:8000/ws');
        };
        altWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ROUND_TICK') {
              const nextState = engine.stepRound();
              setSimState({ ...nextState });
              soundFx.playTick();
            }
          } catch (e) {}
        };
        altWs.onerror = () => {
          setWsConnected(false);
          setWsStatusMessage('LOCAL TELEMETRY ENGINE (ACTIVE)');
        };
        wsRef.current = altWs;
      } catch (e) {
        setWsConnected(false);
        setWsStatusMessage('LOCAL TELEMETRY ENGINE (ACTIVE)');
      }
    }

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [engine]);

  // Client Simulation Ticker when running and WebSocket is disconnected (fallback)
  useEffect(() => {
    let interval: any = null;
    if (simState.isRunning && !wsConnected) {
      interval = setInterval(() => {
        const nextState = engine.stepRound();
        setSimState({ ...nextState });
        soundFx.playTick();
      }, simState.speedMs);
    }
    return () => clearInterval(interval);
  }, [simState.isRunning, simState.speedMs, engine, wsConnected]);

  // Step 1 round manually
  const handleStepOnce = () => {
    const nextState = engine.stepRound();
    setSimState({ ...nextState });
    soundFx.playTick();
  };

  // Speed adjustments
  const handleSpeedChange = (ms: number) => {
    engine.setState({ speedMs: ms });
    setSimState({ ...engine.getState() });
  };

  // REST API Handlers for Start / Stop / Reset
  const handleStart = async () => {
    try {
      await fetch('/api/start', { method: 'POST' }).catch(() =>
        fetch('http://localhost:8000/api/start', { method: 'POST' })
      );
    } catch (e) {}

    engine.setState({ isRunning: true });
    setSimState({ ...engine.getState() });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'start' }));
    }
  };

  const handleStop = async () => {
    try {
      await fetch('/api/stop', { method: 'POST' }).catch(() =>
        fetch('http://localhost:8000/api/stop', { method: 'POST' })
      );
    } catch (e) {}

    engine.setState({ isRunning: false });
    setSimState({ ...engine.getState() });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }));
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' }).catch(() =>
        fetch('http://localhost:8000/api/reset', { method: 'POST' })
      );
    } catch (e) {}

    engine.setState({
      isRunning: false,
      currentRound: 0,
      nodes: INITIAL_NODES,
      alerts: [],
      predictions: [],
      logs: ['[SYSTEM] Telemetry buffers reset to baseline T+000.'],
      attackStartRound: null,
      rollingMttdBuffer: [],
      simMttdValues: { A: 140, B: 90, C: 75, D: 65, E: 30 },
      totalAlertCount: 0,
    });
    setSimState({ ...engine.getState() });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'reset' }));
    }
  };

  const handleConditionChange = (condId: ConditionId) => {
    engine.setState({ activeCondition: condId });
    setSimState({ ...engine.getState() });
  };

  // Attack Injection Trigger
  const handleInjectAttack = (type: 'apt29' | 'pth' | 'exfil' | 'decoy_probe') => {
    const nextState = engine.injectAttackScenario(type);
    setSimState({ ...nextState });
    if (type === 'decoy_probe') {
      soundFx.playHoneypotTrap();
    } else {
      soundFx.playAlert();
    }
  };

  // Cyber Architecture Customization Handlers
  const handleAddNode = (newNode: SimNode) => {
    const currentNodes = engine.getState().nodes;
    engine.setState({ nodes: [...currentNodes, newNode] });
    setSimState({ ...engine.getState() });
    setSelectedNodeId(newNode.id);
    setSelectedPresetId('custom');
  };

  const handleDeleteNode = (nodeId: string) => {
    const currentNodes = engine.getState().nodes.filter((n) => n.id !== nodeId);
    const currentEdges = engine.getState().edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    engine.setState({ nodes: currentNodes, edges: currentEdges });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(currentNodes[0]?.id || null);
    }
    setSimState({ ...engine.getState() });
    setSelectedPresetId('custom');
  };

  const handleUpdateNode = (updatedNode: SimNode) => {
    const currentNodes = engine.getState().nodes.map((n) =>
      n.id === updatedNode.id ? updatedNode : n
    );
    engine.setState({ nodes: currentNodes });
    setSimState({ ...engine.getState() });
  };

  const handleAddEdge = (sourceId: string, targetId: string) => {
    const currentEdges = engine.getState().edges;
    const exists = currentEdges.some(
      (e) =>
        (e.source === sourceId && e.target === targetId) ||
        (e.source === targetId && e.target === sourceId)
    );
    if (!exists) {
      const newEdge = { source: sourceId, target: targetId, bandwidth: '10 Gbps' };
      engine.setState({ edges: [...currentEdges, newEdge] });
      setSimState({ ...engine.getState() });
      setSelectedPresetId('custom');
    }
  };

  const handleDeleteEdge = (sourceId: string, targetId: string) => {
    const currentEdges = engine.getState().edges.filter(
      (e) =>
        !(e.source === sourceId && e.target === targetId) &&
        !(e.source === targetId && e.target === sourceId)
    );
    engine.setState({ edges: currentEdges });
    setSimState({ ...engine.getState() });
    setSelectedPresetId('custom');
  };

  const handleMoveNode = (nodeId: string, x: number, y: number) => {
    const currentNodes = engine.getState().nodes.map((n) =>
      n.id === nodeId ? { ...n, x, y } : n
    );
    engine.setState({ nodes: currentNodes });
    setSimState({ ...engine.getState() });
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = ARCHITECTURE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      engine.setState({
        nodes: preset.nodes,
        edges: preset.edges,
      });
      setSelectedNodeId(preset.nodes[0]?.id || null);
      setSelectedPresetId(presetId);
      setSimState({ ...engine.getState() });
    }
  };

  const selectedNode: SimNode | null =
    simState.nodes.find((n) => n.id === selectedNodeId) || simState.nodes[0] || null;

  const activeCondObj = ABLATION_CONDITIONS.find((c) => c.id === simState.activeCondition);

  // Compute Fleet Defcon Status
  const nodesUnderAttack = simState.nodes.filter((n) => n.status === 'under_attack').length;
  let defconLabel = 'DEFCON-4 // NOMINAL PATROL';
  let defconColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
  if (nodesUnderAttack > 0) {
    defconLabel = `DEFCON-1 // ${nodesUnderAttack} NODES ENGAGED`;
    defconColor = 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse';
  } else if (simState.alerts.length > 0 && simState.currentRound - (simState.alerts[0]?.round || 0) < 3) {
    defconLabel = 'DEFCON-2 // ADVERSARY PROBING';
    defconColor = 'bg-amber-950/70 text-amber-300 border-amber-500/40';
  }

  // Active MTTD
  const latestMttd = simState.mttdHistory[simState.mttdHistory.length - 1];
  const mttdF = latestMttd?.ConditionF || 36;
  const mttdA = latestMttd?.ConditionA || 140;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-mono p-3 md:p-5 space-y-4 telemetry-grid">
      {/* 1. MASTER COCKPIT HEADER & FLIGHT RECORDER */}
      <header className="cockpit-panel rounded-xl p-3 md:p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left System Identity */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold tracking-widest text-slate-100 uppercase">
                ADVERSIM // MK-IV TELEMETRY
              </h1>
              <span className="px-2 py-0.5 rounded font-bold text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LIVE CYBER-DEFENSE DECK
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kinetic Multi-Agent Simulation Engine & Collaborative Threat Orchestrator
            </p>
          </div>
        </div>

        {/* Center Telemetry Flight Status Strip */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* WebSocket Channel */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
              wsConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-900 text-slate-400 border-white/[0.08]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{wsStatusMessage}</span>
          </div>

          {/* Round / Tick Clock */}
          <div className="flex items-center bg-slate-950 border border-white/[0.08] rounded-lg px-2.5 py-1 gap-1.5 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">TICK:</span>
            <span className="text-cyan-300 font-bold tracking-wider">
              T+{String(simState.currentRound).padStart(4, '0')}
            </span>
          </div>

          {/* Defcon Fleet Lamp */}
          <div className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] flex items-center gap-1.5 ${defconColor}`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{defconLabel}</span>
          </div>
        </div>

        {/* Right Tactical Controls & Speed Dial */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-900 text-slate-500 border-white/[0.08] hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Audio Telemetry ON' : 'Audio Telemetry MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Simulation Speed Toggles */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-white/[0.08] text-[10px]">
            <button
              onClick={() => handleSpeedChange(250)}
              className={`px-1.5 py-1 rounded transition-colors ${simState.speedMs === 250 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              title="Fast 250ms cadence"
            >
              4×
            </button>
            <button
              onClick={() => handleSpeedChange(500)}
              className={`px-1.5 py-1 rounded transition-colors ${simState.speedMs === 500 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              title="2x cadence"
            >
              2×
            </button>
            <button
              onClick={() => handleSpeedChange(1000)}
              className={`px-1.5 py-1 rounded transition-colors ${simState.speedMs === 1000 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              title="Standard 1000ms cadence"
            >
              1×
            </button>
            <button
              onClick={() => handleSpeedChange(2000)}
              className={`px-1.5 py-1 rounded transition-colors ${simState.speedMs === 2000 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              title="Slow 2000ms cadence"
            >
              0.5×
            </button>
          </div>

          {/* Step +1 */}
          <button
            onClick={handleStepOnce}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/[0.08] rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            title="Step forward by 1 round"
          >
            <FastForward className="w-3 h-3" /> STEP
          </button>

          {/* Run / Halt */}
          <button
            onClick={simState.isRunning ? handleStop : handleStart}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              simState.isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
            }`}
          >
            {simState.isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {simState.isRunning ? 'HALT' : 'ENGAGE'}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/[0.08] rounded-lg transition-colors"
            title="Reset telemetry buffers"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. REAL-TIME KPI HUD AVIONICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="cockpit-panel rounded-xl p-2.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            MTTD Containment Needle
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-cyan-300">{mttdF.toFixed(1)}s</span>
            <span className="text-[10px] text-emerald-400 font-bold">
              ▲ -{(((mttdA - mttdF) / mttdA) * 100).toFixed(0)}% vs Baseline
            </span>
          </div>
        </div>

        <div className="cockpit-panel rounded-xl p-2.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
            <Cpu className="w-3 h-3 text-amber-400" />
            Bandit Max Regret
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-amber-300">
              {Math.max(...simState.ucbStats.map((s) => s.ucbScore)).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">15 Surface Arms</span>
          </div>
        </div>

        <div className="cockpit-panel rounded-xl p-2.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
            <Share2 className="w-3 h-3 text-sky-400" />
            Mesh Sharing Ratio
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-sky-300">{simState.edges.length} Links</span>
            <span className="text-[10px] text-cyan-400 font-bold">P2P Telemetry Active</span>
          </div>
        </div>

        <div className="cockpit-panel rounded-xl p-2.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
            <Target className="w-3 h-3 text-teal-400" />
            Decoy Honeypots
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-teal-300">
              {simState.nodes.filter((n) => n.isHoneypot).length} Active
            </span>
            <span className="text-[10px] text-teal-400 font-bold">Poisoning Filter ON</span>
          </div>
        </div>

        <div className="cockpit-panel rounded-xl p-2.5 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
            <Radio className="w-3 h-3 text-purple-400" />
            Total Threat Detections
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-purple-300">{simState.totalAlertCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">{simState.alerts.length} In Buffer</span>
          </div>
        </div>
      </div>

      {/* 3. TACTICAL MISSION TABS NAVIGATION BAR */}
      <div className="cockpit-panel rounded-xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('soc')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'soc'
                ? 'bg-cyan-500 text-slate-950 border border-cyan-400 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-white/[0.08]'
            }`}
          >
            <Radar className="w-4 h-4" />
            <span>Tactical SOC & Topology</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'soc' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-900 text-slate-400'
            }`}>
              {simState.nodes.length} Nodes
            </span>
          </button>

          <button
            onClick={() => setActiveTab('forecasting')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'forecasting'
                ? 'bg-cyan-500 text-slate-950 border border-cyan-400 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-white/[0.08]'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Markov & Bandit AI</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'forecasting' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-900 text-slate-400'
            }`}>
              15 Arms
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ablation')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'ablation'
                ? 'bg-cyan-500 text-slate-950 border border-cyan-400 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-white/[0.08]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Empirical MTTD & Matrix</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'ablation' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-950 text-cyan-400'
            }`}>
              Cond {simState.activeCondition}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-cyan-500 text-slate-950 border border-cyan-400 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-white/[0.08]'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Resilience Audit & Flight Stream</span>
          </button>
        </div>

        {/* Global Mission Condition Selector Mini-Dial */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono border-t sm:border-t-0 sm:border-l border-white/[0.08] pt-2 sm:pt-0 sm:pl-3">
          <span className="text-slate-400 uppercase hidden md:inline">Profile:</span>
          <div className="flex items-center gap-1">
            {ABLATION_CONDITIONS.map((cond) => {
              const isSelected = simState.activeCondition === cond.id;
              return (
                <button
                  key={cond.id}
                  onClick={() => handleConditionChange(cond.id)}
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold border border-cyan-400 scale-105'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/[0.08]'
                  }`}
                  title={cond.name}
                >
                  {cond.id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. TAB CONTENT PANELS */}
      <main className="space-y-4">
        {/* TAB 1: TACTICAL SOC & TOPOLOGY */}
        {activeTab === 'soc' && (
          <div className="space-y-4 animate-needle-settle">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Network Topology Map (5 cols) */}
              <div className="lg:col-span-5">
                <NetworkMap
                  nodes={simState.nodes}
                  edges={simState.edges}
                  selectedNodeId={selectedNodeId}
                  selectedPresetId={selectedPresetId}
                  onSelectNode={setSelectedNodeId}
                  onAddNode={handleAddNode}
                  onDeleteNode={handleDeleteNode}
                  onUpdateNode={handleUpdateNode}
                  onAddEdge={handleAddEdge}
                  onDeleteEdge={handleDeleteEdge}
                  onMoveNode={handleMoveNode}
                  onLoadPreset={handleLoadPreset}
                  onInjectAttack={handleInjectAttack}
                  honeypotBroadcastActive={simState.nodes.some(n => n.isHoneypot && n.status === 'under_attack')}
                />
              </div>

              {/* Bayesian Risk Radar (4 cols) */}
              <div className="lg:col-span-4">
                <RadarChart selectedNode={selectedNode} />
              </div>

              {/* Alert Feed (3 cols) */}
              <div className="lg:col-span-3">
                <AlertFeed alerts={simState.alerts} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MARKOV & BANDIT AI */}
        {activeTab === 'forecasting' && (
          <div className="space-y-4 animate-needle-settle">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PredictionPanel predictions={simState.predictions} />
              <BanditHeatmap ucbStats={simState.ucbStats} />
            </div>

            {/* Quick Context Summary Strip */}
            <div className="cockpit-panel rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
                <span>
                  Markov transitions predict next MITRE stages; Multi-Armed Bandit (UCB1) maps attacker surface exploration regret.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('soc')}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 rounded text-[11px] font-bold"
              >
                Inspect Live Topology →
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: EMPIRICAL MTTD & MATRIX */}
        {activeTab === 'ablation' && (
          <div className="space-y-4 animate-needle-settle">
            {/* Longitudinal MTTD Trajectory Chart */}
            <MTTDChart history={simState.mttdHistory} />

            {/* Experimental Ablation Matrix */}
            <ExperimentTable
              metrics={simState.metrics}
              activeCondition={simState.activeCondition}
              onSelectCondition={handleConditionChange}
            />
          </div>
        )}

        {/* TAB 4: RESILIENCE AUDIT & FLIGHT STREAM */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-needle-settle">
            {/* Topology Airworthiness & Efficacy Scorecard */}
            <ArchitectureBenchmark
              nodes={simState.nodes}
              edges={simState.edges}
              metrics={simState.metrics}
              currentRound={simState.currentRound}
            />

            {/* Live Telemetry Flight Stream Logs */}
            <div className="cockpit-panel rounded-xl p-4 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>High-Cadence Verification Flight Stream</span>
                </div>
                <span className="text-[10px] text-slate-400">Continuous 10-Tick Telemetry Audits</span>
              </div>

              <div className="h-64 overflow-y-auto bg-slate-950/90 p-3 rounded-lg border border-white/[0.05] space-y-1.5 mt-3 text-[11px]">
                {simState.logs.map((log, i) => {
                  const isVerification = log.includes('VERIFICATION') || log.includes('MTTD');
                  const isAlert = log.includes('ALERT');
                  const isHoneypot = log.includes('HONEYPOT');
                  const isInject = log.includes('MANUAL INJECTION');
                  return (
                    <div
                      key={i}
                      className={
                        isVerification
                          ? 'text-amber-300 font-bold'
                          : isInject
                          ? 'text-fuchsia-300 font-bold'
                          : isAlert
                          ? 'text-rose-300'
                          : isHoneypot
                          ? 'text-teal-300'
                          : 'text-slate-400'
                      }
                    >
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
