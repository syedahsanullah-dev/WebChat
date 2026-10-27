import { prisma } from './prisma';
import { ResolveReportPayload, ModerationAction } from '@shared/types';

const SOCKET_SERVER_URL = process.env.SOCKET_INTERNAL_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/**
 * Dispatches an internal moderation command to Fastify Socket Server
 */
async function dispatchToSocketServer(endpoint: string, body: any): Promise<boolean> {
  try {
    const httpUrl = SOCKET_SERVER_URL.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
    const res = await fetch(`${httpUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[ModerationService] Failed to notify socket server at ${endpoint}:`, err);
    return false;
  }
}

/**
 * Resolves an Abuse Report and executes the corresponding moderation action
 */
export async function resolveAbuseReport(
  adminUserId: string,
  reportId: string,
  payload: ResolveReportPayload
) {
  const report = await prisma.abuseReport.findUnique({
    where: { id: reportId },
    include: {
      reportedUser: true,
      message: true,
    },
  });

  if (!report) {
    throw new Error('Abuse report not found');
  }

  const { action, notes, muteDurationHours = 24, suspensionDuration = '24h' } = payload;
  const isDismissal = action === 'DISMISSED';

  // 1. Execute action
  switch (action) {
    case 'DELETE_MESSAGE': {
      if (report.messageId) {
        // Soft delete message
        await prisma.message.update({
          where: { id: report.messageId },
          data: {
            isDeleted: true,
            content: 'This message was deleted by a moderator',
          },
        });

        // Broadcast deletion over WebSockets
        await dispatchToSocketServer('/internal/delete-message', {
          messageId: report.messageId,
          chatId: report.chatId,
          deletedBy: 'Moderator',
        });
      }
      break;
    }

    case 'WARN_USER': {
      await dispatchToSocketServer('/internal/warn', {
        userId: report.reportedUserId,
        reason: notes || `Moderation Warning: Violation under category ${report.category}`,
        reportId: report.id,
      });
      break;
    }

    case 'MUTE_USER': {
      const hours = Math.max(1, Math.min(muteDurationHours, 720)); // 1 hour to 30 days
      const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: report.reportedUserId },
        data: { mutedUntil },
      });

      await dispatchToSocketServer('/internal/mute', {
        userId: report.reportedUserId,
        mutedUntil: mutedUntil.toISOString(),
        reason: notes || `Muted for ${hours} hours due to ${report.category}`,
      });
      break;
    }

    case 'SUSPEND_USER': {
      let suspendedUntil: Date | null = null;
      if (suspensionDuration === '24h') {
        suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (suspensionDuration === '7d') {
        suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (suspensionDuration === '30d') {
        suspendedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } // null = permanent

      await prisma.user.update({
        where: { id: report.reportedUserId },
        data: {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedUntil,
          suspensionReason: notes || `Suspended following abuse report (${report.category})`,
          suspendedById: adminUserId,
        },
      });

      // Invalidate all active sessions in MySQL
      await prisma.userSession.deleteMany({
        where: { userId: report.reportedUserId },
      });

      // Force terminate active WebSockets with code 4002
      await dispatchToSocketServer('/internal/kick', {
        userId: report.reportedUserId,
        reason: notes || `Account suspended: ${report.category}`,
      });
      break;
    }

    case 'DISMISSED':
    default:
      // No punitive action taken on reported entity
      break;
  }

  // 2. Update report status
  const updatedReport = await prisma.abuseReport.update({
    where: { id: reportId },
    data: {
      status: isDismissal ? 'DISMISSED' : 'RESOLVED',
      resolvedById: adminUserId,
      resolutionAction: action,
      resolutionNotes: notes || null,
      resolvedAt: new Date(),
    },
    include: {
      reporter: { select: { id: true, username: true, displayName: true } },
      reportedUser: { select: { id: true, username: true, displayName: true, avatarUrl: true, isSuspended: true } },
      resolvedBy: { select: { id: true, username: true, displayName: true } },
    },
  });

  // 3. Record Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'ABUSE_REPORT_RESOLVED',
      targetType: 'ABUSE_REPORT',
      targetId: reportId,
      metadata: {
        reportId,
        reportedUserId: report.reportedUserId,
        action,
        notes,
        category: report.category,
      },
    },
  });

  return updatedReport;
}
