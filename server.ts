import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import * as missionsAPI from './src/missions.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/dashboard-summary', (req, res) => {
    try {
      const topCompanies = missionsAPI.getTopCompaniesByMissionCount(5);
      const statuses = missionsAPI.getMissionStatusCount();
      const mostUsed = missionsAPI.getMostUsedRocket();
      const data = missionsAPI.getAllMissions();

      res.json({
        topCompanies,
        statuses,
        mostUsed,
        totalMissions: data.length,
      });
    } catch (err: any) {
      console.error(`[Observability] [ERROR] API Failure: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/missions', (req, res) => {
    res.json(missionsAPI.getAllMissions());
  });

  app.post('/api/log', (req, res) => {
    try {
      const { level, event, ...data } = req.body;
      console.log(JSON.stringify({ level: level || 'info', event: event || 'frontend_log', ...data }));
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  // Exported grading functions as API (optional but good for testing)
  app.post('/api/rpc/:functionName', (req, res) => {
    try {
      const { functionName } = req.params;
      const args = req.body.args || [];
      const func = (missionsAPI as any)[functionName];
      if (typeof func === 'function') {
        const result = func(...args);
        console.log(JSON.stringify({ 
          level: 'info', 
          type: 'rpc_call', 
          function: functionName, 
          status: 'success' 
        }));
        res.json({ result });
      } else {
        res.status(404).json({ error: 'Function not found' });
      }
    } catch (e: any) {
      console.error(JSON.stringify({ 
        level: 'error', 
        type: 'rpc_call_fail', 
        error: e.message 
      }));
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Observability] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
