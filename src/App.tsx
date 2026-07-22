import React, { useState, useEffect, useRef } from 'react';
import { SimulationEngine } from './lib/simulationEngine';
import {
  INITIAL_NODES,
  INITIAL_EDGES,
  ABLATION_CONDITIONS,
  INITIAL_METRICS,
  INITIAL_UCB_STATS,
} from './data/initialState';
import { NetworkMap } from './components/NetworkMap';
import { RadarChart } from './components/RadarChart';
import { AlertFeed } from './components/AlertFeed';
import { MTTDChart } from './components/MTTDChart';
import { PredictionPanel } from './components/PredictionPanel';
import { BanditHeatmap } from './components/BanditHeatmap';
import { ExperimentTable } from './components/ExperimentTable';
import { ConditionId, SimNode } from './types';
import {
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Radio,
  Layers,
  Wifi,
  WifiOff,
} from 'lucide-react';

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
        logs: ['[SYSTEM] AdverSim Research Engine Initialized & Running.'],
      })
  );

  const [simState, setSimState] = useState(engine.getState());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-user-1');
  const [wsConnected, setWsConnected] = useState(false);
  const [wsStatusMessage, setWsStatusMessage] = useState('Connecting WebSocket...');

  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket Connection Effect
  useEffect(() => {
    let ws: WebSocket | null = null;

    function connectWs() {
      const isHttps = window.location.protocol === 'https:';
      const protocol = isHttps ? 'wss:' : 'ws:';
      const primaryUrl = `${protocol}//${window.location.host}/ws`;
      
      setWsStatusMessage(`Connecting to ${primaryUrl}...`);

      try {
        ws = new WebSocket(primaryUrl);

        ws.onopen = () => {
          setWsConnected(true);
          setWsStatusMessage(`Connected: ${primaryUrl}`);
          console.log(`[WS] Connected to ${primaryUrl}`);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ROUND_TICK') {
              const nextState = engine.stepRound();
              setSimState({ ...nextState });
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
            setWsStatusMessage('Client Engine Active (Live Auto-Sim)');
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
          setWsStatusMessage('Connected: ws://localhost:8000/ws');
        };
        altWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ROUND_TICK') {
              const nextState = engine.stepRound();
              setSimState({ ...nextState });
            }
          } catch (e) {}
        };
        altWs.onerror = () => {
          setWsConnected(false);
          setWsStatusMessage('Client Engine Active (Live Auto-Sim)');
        };
        wsRef.current = altWs;
      } catch (e) {
        setWsConnected(false);
        setWsStatusMessage('Client Engine Active (Live Auto-Sim)');
      }
    }

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [engine]);

  // Client Simulation Ticker when running
  useEffect(() => {
    let interval: any = null;
    if (simState.isRunning) {
      interval = setInterval(() => {
        const nextState = engine.stepRound();
        setSimState({ ...nextState });
      }, simState.speedMs);
    }
    return () => clearInterval(interval);
  }, [simState.isRunning, simState.speedMs, engine]);

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
      logs: ['[SYSTEM] Simulation state reset via REST endpoint.'],
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

  const selectedNode: SimNode | null =
    simState.nodes.find((n) => n.id === selectedNodeId) || simState.nodes[0] || null;

  const activeCondObj = ABLATION_CONDITIONS.find((c) => c.id === simState.activeCondition);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-6 space-y-6">
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-6 h-6 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wide text-slate-100">AdverSim</h1>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Major Cyber Defense Research Dashboard
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-Modal Cyber Defense Simulation Framework & Ablation Orchestrator
            </p>
          </div>
        </div>

        {/* WebSocket Status Badge & REST Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono ${
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="truncate max-w-[220px]">{wsStatusMessage}</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 gap-2 text-xs font-mono">
            <span className="text-slate-400">Round:</span>
            <span className="text-cyan-400 font-bold text-sm">{simState.currentRound}</span>
          </div>

          <button
            onClick={simState.isRunning ? handleStop : handleStart}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              simState.isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {simState.isRunning ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {simState.isRunning ? 'Stop Simulation' : 'Start Simulation'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      {/* Active Condition Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
              Active Experimental Condition:
            </span>
            <h2 className="text-sm font-bold text-slate-200">{activeCondObj?.name}</h2>
            <p className="text-xs text-slate-400">{activeCondObj?.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span
            className={`px-2.5 py-1 rounded border ${
              activeCondObj?.collaborativeActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            Collab: {activeCondObj?.collaborativeActive ? 'ON' : 'OFF'}
          </span>
          <span
            className={`px-2.5 py-1 rounded border ${
              activeCondObj?.honeypotActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            Honeypot: {activeCondObj?.honeypotActive ? 'ON' : 'OFF'}
          </span>
          <span
            className={`px-2.5 py-1 rounded border ${
              activeCondObj?.predictorActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            Predictor: {activeCondObj?.predictorActive ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Primary 3-Column Layout: NetworkMap Left, RadarChart Center, AlertFeed Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* NetworkMap Left */}
        <div className="lg:col-span-5">
          <NetworkMap
            nodes={simState.nodes}
            edges={simState.edges}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>

        {/* RadarChart Center */}
        <div className="lg:col-span-4">
          <RadarChart selectedNode={selectedNode} />
        </div>

        {/* AlertFeed Right */}
        <div className="lg:col-span-3">
          <AlertFeed alerts={simState.alerts} />
        </div>
      </div>

      {/* Secondary Row: Prediction Panel & Bandit Heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PredictionPanel predictions={simState.predictions} />
        <BanditHeatmap ucbStats={simState.ucbStats} />
      </div>

      {/* Bottom Layout: MTTD Chart */}
      <div className="w-full">
        <MTTDChart history={simState.mttdHistory} />
      </div>

      {/* Experimental Ablation Matrix */}
      <ExperimentTable
        metrics={simState.metrics}
        activeCondition={simState.activeCondition}
        onSelectCondition={handleConditionChange}
      />

      {/* Live System Logs Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg font-mono text-xs">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800 text-slate-300 font-semibold">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Engine Console & Verification Logs (Printed every 10 rounds)
        </div>
        <div className="h-28 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-slate-400">
          {simState.logs.map((log, i) => (
            <div key={i} className={log.includes('VERIFICATION') ? 'text-amber-300 font-bold' : ''}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
