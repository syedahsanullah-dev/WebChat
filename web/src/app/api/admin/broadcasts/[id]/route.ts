import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const SOCKET_SERVER_URL =
  process.env.INTERNAL_SOCKET_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/^ws/, 'http') ||
  'http://localhost:4000';

/**
 * DELETE /api/admin/broadcasts/:id
 * Deactivates an active broadcast and dispatches dismiss event over WebSockets
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const existing = await prisma.systemBroadcast.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    const updated = await prisma.systemBroadcast.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.auditLog
      .create({
        data: {
          userId: auth.user.id,
          action: 'GLOBAL_BROADCAST_DEACTIVATED',
          resource: 'SYSTEM_BROADCAST',
          entityId: id,
          metadata: JSON.stringify({
            message: existing.message,
            severity: existing.severity,
          }),
        },
      })
      .catch(() => {});

    // Notify socket server to dismiss active banner across connected clients
    try {
      await fetch(`${SOCKET_SERVER_URL}/internal/broadcast/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      broadcast: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to deactivate broadcast', details: (error as Error).message },
      { status: 500 }
    );
  }
}
