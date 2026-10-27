import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MaintenanceState } from '@shared/types';

/**
 * GET /api/maintenance/status
 * Public endpoint to query if maintenance mode is active
 */
export async function GET(_request: NextRequest) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'maintenance_mode' },
    });

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      const state: MaintenanceState = {
        enabled: Boolean(parsed.enabled),
        reason: parsed.reason || null,
        estimatedEnd: parsed.estimatedEnd || null,
        updatedAt: setting.updatedAt.toISOString(),
      };
      return NextResponse.json({ success: true, maintenance: state });
    }

    return NextResponse.json({
      success: true,
      maintenance: {
        enabled: false,
        reason: null,
        estimatedEnd: null,
        updatedAt: null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch maintenance status', details: (error as Error).message },
      { status: 500 }
    );
  }
}
