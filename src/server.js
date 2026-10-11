import express from 'express';
import { config } from './config.js';
import { resultRoutes } from './routes/resultRoutes.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Basic request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api', resultRoutes);

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  return app;
}

export function startServer() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[Server] Education Board Result API listening on http://localhost:${config.port}`);
    console.log(`[Server] Health check: http://localhost:${config.port}/health`);
    console.log(`[Server] Query example: http://localhost:${config.port}/api/result?roll=100001&reg=1234567890&board=dhaka&year=2024&exam=ssc`);
  });
  return server;
}

// Auto-start if executed directly
if (process.argv[1]?.endsWith('server.js')) {
  startServer();
}
