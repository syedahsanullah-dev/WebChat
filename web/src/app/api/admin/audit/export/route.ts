import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { formatAuditLogsCsv } from '@/lib/csvExporter';
import { recordAuditLog } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.systemRole !== 'SUPER_ADMIN' && user.systemRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const actorId = searchParams.get('actorId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (actorId) {
      where.userId = actorId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { action: { contains: q } },
        { resource: { contains: q } },
        { ipAddress: { contains: q } },
        { metadata: { contains: q } },
        { user: { username: { contains: q } } },
        { user: { displayName: { contains: q } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    const csvContent = formatAuditLogsCsv(logs);
    const dateStr = new Date().toISOString().slice(0, 10);

    // Record audit event that audit logs were exported
    await recordAuditLog({
      userId: user.id,
      action: 'CHAT_EXPORT_DOWNLOADED',
      resource: 'AUDIT_LOGS',
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent'),
      metadata: { recordCount: logs.length, exportedAt: new Date().toISOString() },
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="webchat_audit_logs_${dateStr}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
