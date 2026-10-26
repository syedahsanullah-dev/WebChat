import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Phase 14: Server #1 Health Check Endpoint (GET /api/health)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns HTTP 200 with ok status and database connected when probe succeeds', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ 1: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('webchat-nextjs-server');
    expect(data.database).toBe('connected');
    expect(typeof data.databaseLatencyMs).toBe('number');
    expect(data.memoryMB).toBeDefined();
    expect(typeof data.uptimeSeconds).toBe('number');
    expect(data.timestamp).toBeDefined();

    // Verify cache prevention headers for UptimeRobot
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('returns HTTP 503 with degraded status when database probe fails', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection pool timeout'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.database).toBe('disconnected');
    expect(data.service).toBe('webchat-nextjs-server');
  });
});
