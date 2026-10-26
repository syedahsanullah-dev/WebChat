import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'connected';
  let dbLatencyMs = 0;

  try {
    const dbPingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbPingStart;
  } catch (err) {
    dbStatus = 'disconnected';
    logger.error('Health check database probe failed:', err);
  }

  const memoryUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
  };

  const isHealthy = dbStatus === 'connected';
  const responseData = {
    status: isHealthy ? 'ok' : 'degraded',
    service: 'webchat-nextjs-server',
    server: 'Server #1 (Next.js 15 App Router Standalone)',
    database: dbStatus,
    databaseLatencyMs: dbLatencyMs,
    memoryMB,
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };

  return NextResponse.json(responseData, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
