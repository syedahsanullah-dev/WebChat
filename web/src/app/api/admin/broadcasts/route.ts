import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';

const SOCKET_SERVER_URL =
  process.env.INTERNAL_SOCKET_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/^ws/, 'http') ||
  'http://localhost:4000';

/**
 * GET /api/admin/broadcasts
 * Returns history of system broadcasts for administration
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const broadcasts = await prisma.systemBroadcast.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      broadcasts: broadcasts.map((b) => ({
        id: b.id,
        message: b.message,
        severity: b.severity,
        isActive: b.isActive,
        expiresAt: b.expiresAt ? b.expiresAt.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
        creator: b.creator,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts history', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/broadcasts
 * Creates a new system broadcast and dispatches it in real time via Server #2
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { message, severity = 'INFO', durationHours } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Broadcast message is required' }, { status: 400 });
    }

    const validSeverities = ['INFO', 'WARNING', 'CRITICAL'];
    const chosenSeverity = validSeverities.includes(severity.toUpperCase())
      ? severity.toUpperCase()
      : 'INFO';

    // 1. Deactivate any previously active broadcasts (one active broadcast at a time)
    await prisma.systemBroadcast.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // 2. Calculate expiration
    const expiresAt =
      durationHours && Number(durationHours) > 0
        ? new Date(Date.now() + Number(durationHours) * 3600 * 1000)
        : null;

    // 3. Persist SystemBroadcast to MySQL
    const broadcast = await prisma.systemBroadcast.create({
      data: {
        creatorId: auth.user.id,
        message: message.trim(),
        severity: chosenSeverity,
        isActive: true,
        expiresAt,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // 4. Audit Log
    await prisma.auditLog
      .create({
        data: {
          userId: auth.user.id,
          action: 'GLOBAL_BROADCAST_CREATED',
          resource: 'SYSTEM_BROADCAST',
          entityId: broadcast.id,
          metadata: JSON.stringify({
            severity: broadcast.severity,
            message: broadcast.message,
            expiresAt: broadcast.expiresAt,
          }),
        },
      })
      .catch(() => {});

    // 5. Dispatch real-time WebSocket envelope to Server #2 (< 50ms)
    try {
      await fetch(`${SOCKET_SERVER_URL}/internal/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: broadcast.id,
          message: broadcast.message,
          severity: broadcast.severity,
          createdAt: broadcast.createdAt.toISOString(),
          expiresAt: broadcast.expiresAt ? broadcast.expiresAt.toISOString() : null,
          creatorName: broadcast.creator.displayName || `@${broadcast.creator.username}`,
        }),
      });
    } catch (wsErr) {
      // Non-fatal if socket server is offline during dev/test
      console.warn('[Admin Broadcasts] Could not notify socket server:', (wsErr as Error).message);
    }

    return NextResponse.json({
      success: true,
      broadcast: {
        id: broadcast.id,
        message: broadcast.message,
        severity: broadcast.severity,
        isActive: broadcast.isActive,
        expiresAt: broadcast.expiresAt ? broadcast.expiresAt.toISOString() : null,
        createdAt: broadcast.createdAt.toISOString(),
        creator: broadcast.creator,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create system broadcast', details: (error as Error).message },
      { status: 500 }
    );
  }
}
