import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

let simIsRunning = true;
let currentRound = 0;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // REST API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AdverSim Cyber Defense Simulator',
      time: new Date().toISOString(),
    });
  });

  app.get('/api/sim/state', (req, res) => {
    res.json({
      status: simIsRunning ? 'running' : 'stopped',
      round: currentRound,
      condition: 'F',
      active_nodes: 7,
      cyborg_mode: 'emulated',
    });
  });

  // Start Endpoint
  const handleStart = (req: express.Request, res: express.Response) => {
    simIsRunning = true;
    broadcastWsMessage({ type: 'STATUS', running: true, message: 'Simulation Started' });
    res.json({ success: true, status: 'running', round: currentRound });
  };
  app.post('/api/start', handleStart);
  app.get('/api/start', handleStart);
  app.post('/api/sim/start', handleStart);
  app.get('/api/sim/start', handleStart);

  // Stop / Pause Endpoint
  const handleStop = (req: express.Request, res: express.Response) => {
    simIsRunning = false;
    broadcastWsMessage({ type: 'STATUS', running: false, message: 'Simulation Stopped' });
    res.json({ success: true, status: 'stopped', round: currentRound });
  };
  app.post('/api/stop', handleStop);
  app.get('/api/stop', handleStop);
  app.post('/api/sim/stop', handleStop);
  app.get('/api/sim/stop', handleStop);

  // Reset Endpoint
  const handleReset = (req: express.Request, res: express.Response) => {
    simIsRunning = false;
    currentRound = 0;
    broadcastWsMessage({ type: 'RESET', running: false, round: 0 });
    res.json({ success: true, status: 'reset', round: 0 });
  };
  app.post('/api/reset', handleReset);
  app.get('/api/reset', handleReset);
  app.post('/api/sim/reset', handleReset);
  app.get('/api/sim/reset', handleReset);

  // Create HTTP Server
  const server = http.createServer(app);

  // WebSocket Server setup on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client connected to AdverSim WebSocket on /ws');
    ws.send(JSON.stringify({ type: 'INIT', running: simIsRunning, round: currentRound }));

    ws.on('message', (msg: string) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.action === 'start') simIsRunning = true;
        if (parsed.action === 'stop') simIsRunning = false;
        if (parsed.action === 'reset') {
          simIsRunning = false;
          currentRound = 0;
        }
      } catch (err) {
        // ignore parse error
      }
    });
  });

  function broadcastWsMessage(data: any) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // Background round ticker emitting WebSocket updates
  setInterval(() => {
    if (simIsRunning) {
      currentRound++;
      broadcastWsMessage({
        type: 'ROUND_TICK',
        round: currentRound,
        timestamp: new Date().toISOString(),
      });
    }
  }, 1000);

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AdverSim Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
