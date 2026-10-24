import { describe, it, expect } from 'vitest';
import { fastify } from '../src/index.js';

describe('GET /health', () => {
  it('returns ok status and memoryMB', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(typeof body.memoryMB).toBe('number');
    expect(body.memoryMB).toBeGreaterThan(0);
    expect(typeof body.uptime).toBe('number');
    expect(body.timestamp).toBeDefined();
  });

  it('returns welcome payload on GET /', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('running');
    expect(body.name).toBe('webchat-socket-server');
  });
});
