import { describe, it, expect } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('Empirical Challenger: Live Runtime & RSS Memory Verification', () => {
  it('spawns node dist/index.js and validates live /health RSS memory', async () => {
    const serverDist = path.resolve(__dirname, '../dist/index.js');
    const testPort = '4098';

    let serverProcess: ChildProcess | null = null;

    try {
      // 1. Spawn node dist/index.js
      serverProcess = spawn('node', [serverDist], {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: testPort,
          HOST: '127.0.0.1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Wait for server to start listening
      let started = false;
      const timeoutMs = 20000;
      const startMs = Date.now();

      await new Promise<void>((resolve, reject) => {
        serverProcess?.stdout?.on('data', (chunk) => {
          const str = chunk.toString();
          if (str.includes('Fastify + Native WS daemon running') || str.includes('Health check available')) {
            started = true;
            resolve();
          }
        });

        serverProcess?.stderr?.on('data', (chunk) => {
          const errStr = chunk.toString();
          // Log any warnings or errors
          console.warn('[stderr]', errStr);
        });

        serverProcess?.on('error', (err) => {
          reject(err);
        });

        // Polling fallback
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`http://127.0.0.1:${testPort}/health`);
            if (res.ok) {
              clearInterval(interval);
              started = true;
              resolve();
            }
          } catch {
            if (Date.now() - startMs > timeoutMs) {
              clearInterval(interval);
              reject(new Error('Server failed to start within timeout'));
            }
          }
        }, 300);
      });

      expect(started).toBe(true);

      // 2. Query /health
      const res = await fetch(`http://127.0.0.1:${testPort}/health`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(typeof data.memoryMB).toBe('number');
      // Verify RSS memory target (~25–70 MB)
      expect(data.memoryMB).toBeGreaterThan(15);
      expect(data.memoryMB).toBeLessThan(75);
      expect(data.onlineUsers).toBe(0);
      expect(data.activeRooms).toBe(0);
      expect(typeof data.uptime).toBe('number');

      // 3. Query root endpoint /
      const rootRes = await fetch(`http://127.0.0.1:${testPort}/`);
      expect(rootRes.status).toBe(200);
      const rootData = await rootRes.json();
      expect(rootData.name).toBe('webchat-socket-server');
      expect(rootData.status).toBe('running');
    } finally {
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
      }
    }
  }, 25000);
});
