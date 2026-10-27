import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'MODERATOR');
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const category = searchParams.get('category') || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);

    const whereClause: any = {};
    if (status !== 'ALL') {
      whereClause.status = status;
    }
    if (category) {
      whereClause.category = category;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [reports, totalPending, resolvedToday, totalReports] = await Promise.all([
      prisma.abuseReport.findMany({
        where: whereClause,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isSuspended: true,
              mutedUntil: true,
              createdAt: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          message: {
            select: {
              id: true,
              content: true,
              messageType: true,
              createdAt: true,
              isDeleted: true,
              mediaUrl: true,
            },
          },
        },
      }),
      prisma.abuseReport.count({ where: { status: 'PENDING' } }),
      prisma.abuseReport.count({
        where: {
          status: 'RESOLVED',
          resolvedAt: { gte: todayStart },
        },
      }),
      prisma.abuseReport.count(),
    ]);

    const formattedReports = reports.map((r) => ({
      id: r.id,
      reporterId: r.reporterId,
      reporterName: r.reporter.displayName || r.reporter.username,
      reporterUsername: r.reporter.username,
      reportedUserId: r.reportedUserId,
      reportedUserName: r.reportedUser.displayName || r.reportedUser.username,
      reportedUserUsername: r.reportedUser.username,
      reportedUserAvatar: r.reportedUser.avatarUrl,
      reportedUserSuspended: r.reportedUser.isSuspended,
      reportedUserMuted: r.reportedUser.mutedUntil ? new Date(r.reportedUser.mutedUntil) > new Date() : false,
      reportedUserJoinedAt: r.reportedUser.createdAt.toISOString(),
      chatId: r.chatId,
      messageId: r.messageId,
      messageContent: r.message?.isDeleted ? '[Message was deleted]' : r.message?.content || null,
      messageDeleted: r.message?.isDeleted ?? false,
      category: r.category,
      reason: r.reason,
      status: r.status,
      resolutionAction: r.resolutionAction,
      resolutionNotes: r.resolutionNotes,
      resolvedById: r.resolvedById,
      resolvedByName: r.resolvedBy?.displayName || r.resolvedBy?.username || null,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    }));

    return NextResponse.json({
      reports: formattedReports,
      stats: {
        totalPending,
        resolvedToday,
        totalReports,
      },
    });
  } catch (error: any) {
    console.error('Failed to list abuse reports:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error listing abuse reports' },
      { status: 500 }
    );
  }
}
