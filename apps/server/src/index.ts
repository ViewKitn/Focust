import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config as loadEnv } from 'dotenv';
loadEnv();

import { env } from './config';
import { authRoutes } from './auth/routes';
import { authMiddleware } from './auth/middleware';
import { historyHandler, reflectionHandler } from './sessions/history';
import { Runtime } from './runtime';
import { pool } from './db';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '16kb' }));

app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', async (_, res) => { try { await pool.query('SELECT 1'); res.json({ ok:true }); } catch { res.status(503).json({ok:false}); } });

// History API (authenticated)
app.get('/api/sessions/history', authMiddleware, historyHandler);
app.put('/api/sessions/:sessionId/reflection', authMiddleware, async (req: any, res) => {
  try { await runtime.run(async () => { await runtime.reflect(req.user.userId,{...req.body,sessionId:req.params.sessionId}); await runtime.broadcast(); }); res.json({ok:true}); }
  catch (e) { res.status(400).json({error:(e as Error).message}); }
});

const io = new Server(httpServer, {
  cors: { origin: env.CLIENT_URL, credentials: true }
});

const runtime = new Runtime(io);
runtime.init().then(() => httpServer.listen(env.PORT, '127.0.0.1', () => console.log(`Server running on http://localhost:${env.PORT}`))).catch(e => { console.error(e); process.exitCode=1; });
const shutdown = async () => { await runtime.stop(); io.close(); httpServer.close(); await pool.end(); process.exit(0); };
process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
