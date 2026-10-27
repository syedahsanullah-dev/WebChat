import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';

const SOCKET_SERVER_URL =
  process.env.INTERNAL_SOCKET_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/^ws/, 'http') ||
  'http://localhost:4000';

/**
 * POST /api/admin/maintenance/toggle
 * Enables or disables maintenance mode platform-wide
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { isEnabled, estimatedEnd, reason } = body;

    const maintenanceData = {
      enabled: Boolean(isEnabled),
      reason: reason || (isEnabled ? 'Scheduled infrastructure maintenance in progress' : null),
      estimatedEnd: estimatedEnd || null,
      updatedBy: auth.user.username,
      updatedAt: new Date().toISOString(),
    };

    // 1. Upsert into system_settings table
    const setting = await prisma.systemSetting.upsert({
      where: { key: 'maintenance_mode' },
      update: {
        value: JSON.stringify(maintenanceData),
        description: 'System Maintenance Mode status flag',
      },
      create: {
        key: 'maintenance_mode',
        value: JSON.stringify(maintenanceData),
        description: 'System Maintenance Mode status flag',
      },
    });

    // 2. Record immutable audit log
    await prisma.auditLog
      .create({
        data: {
          userId: auth.user.id,
          action: 'MAINTENANCE_TOGGLED',
          resource: 'SYSTEM',
          metadata: JSON.stringify({
            enabled: maintenanceData.enabled,
            reason: maintenanceData.reason,
            estimatedEnd: maintenanceData.estimatedEnd,
          }),
        },
      })
      .catch(() => {});

    // 3. Notify Fastify Socket Server #2 in real time
    try {
      await fetch(`${SOCKET_SERVER_URL}/internal/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData),
      });
    } catch (wsErr) {
      console.warn('[MaintenanceToggle] Could not notify socket server:', (wsErr as Error).message);
    }

    const response = NextResponse.json({
      success: true,
      maintenance: maintenanceData,
    });

    // 4. Set/clear cookie for ultra-fast middleware inspection
    if (maintenanceData.enabled) {
      response.cookies.set({
        name: 'maintenance_active',
        value: 'true',
        path: '/',
        httpOnly: false,
        maxAge: 7 * 24 * 3600,
      });
    } else {
      response.cookies.set({
        name: 'maintenance_active',
        value: '',
        path: '/',
        maxAge: 0,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to toggle maintenance mode', details: (error as Error).message },
      { status: 500 }
    );
  }
}
