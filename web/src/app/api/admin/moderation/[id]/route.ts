import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, 'MODERATOR');
  if ('response' in auth) return auth.response;

  try {
    const { id } = await params;

    const report = await prisma.abuseReport.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            isSuspended: true,
            suspendedUntil: true,
            suspensionReason: true,
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
            senderId: true,
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Abuse report not found' }, { status: 404 });
    }

    // Fetch surrounding conversational context (2 before and 2 after)
    let contextMessages: Array<{
      id: string;
      senderId: string;
      senderName: string;
      content: string;
      createdAt: string;
      isTarget: boolean;
      isDeleted: boolean;
    }> = [];

    if (report.message && report.chatId) {
      const [preceding, succeeding] = await Promise.all([
        prisma.message.findMany({
          where: {
            chatId: report.chatId,
            createdAt: { lt: report.message.createdAt },
          },
          take: 2,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, username: true, displayName: true } },
          },
        }),
        prisma.message.findMany({
          where: {
            chatId: report.chatId,
            createdAt: { gt: report.message.createdAt },
          },
          take: 2,
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, username: true, displayName: true } },
          },
        }),
      ]);

      const formattedPreceding = preceding.reverse().map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender.displayName || m.sender.username,
        content: m.isDeleted ? '[Deleted message]' : m.content || '',
        createdAt: m.createdAt.toISOString(),
        isTarget: false,
        isDeleted: m.isDeleted,
      }));

      const targetFormatted = {
        id: report.message.id,
        senderId: report.message.sender?.id || report.reportedUserId,
        senderName:
          report.message.sender?.displayName ||
          report.message.sender?.username ||
          report.reportedUser.displayName ||
          report.reportedUser.username,
        content: report.message.isDeleted ? '[Deleted message]' : report.message.content || '',
        createdAt: report.message.createdAt.toISOString(),
        isTarget: true,
        isDeleted: report.message.isDeleted,
      };

      const formattedSucceeding = succeeding.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender.displayName || m.sender.username,
        content: m.isDeleted ? '[Deleted message]' : m.content || '',
        createdAt: m.createdAt.toISOString(),
        isTarget: false,
        isDeleted: m.isDeleted,
      }));

      contextMessages = [...formattedPreceding, targetFormatted, ...formattedSucceeding];
    }

    // Count prior reports against this reported user
    const priorViolationsCount = await prisma.abuseReport.count({
      where: {
        reportedUserId: report.reportedUserId,
        id: { not: report.id },
      },
    });

    return NextResponse.json({
      report: {
        id: report.id,
        reporterId: report.reporterId,
        reporterName: report.reporter.displayName || report.reporter.username,
        reporterUsername: report.reporter.username,
        reportedUserId: report.reportedUserId,
        reportedUserName: report.reportedUser.displayName || report.reportedUser.username,
        reportedUserUsername: report.reportedUser.username,
        reportedUserAvatar: report.reportedUser.avatarUrl,
        reportedUserSuspended: report.reportedUser.isSuspended,
        reportedUserSuspendedUntil: report.reportedUser.suspendedUntil?.toISOString() || null,
        reportedUserMuted: report.reportedUser.mutedUntil ? new Date(report.reportedUser.mutedUntil) > new Date() : false,
        reportedUserMutedUntil: report.reportedUser.mutedUntil?.toISOString() || null,
        reportedUserJoinedAt: report.reportedUser.createdAt.toISOString(),
        chatId: report.chatId,
        messageId: report.messageId,
        messageContent: report.message?.isDeleted ? '[Message was deleted]' : report.message?.content || null,
        messageDeleted: report.message?.isDeleted ?? false,
        category: report.category,
        reason: report.reason,
        status: report.status,
        resolutionAction: report.resolutionAction,
        resolutionNotes: report.resolutionNotes,
        resolvedById: report.resolvedById,
        resolvedByName: report.resolvedBy?.displayName || report.resolvedBy?.username || null,
        createdAt: report.createdAt.toISOString(),
        resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
      },
      contextMessages,
      priorViolationsCount,
    });
  } catch (error: any) {
    console.error('Failed to get report detail:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error getting report detail' },
      { status: 500 }
    );
  }
}
