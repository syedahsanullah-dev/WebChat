import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

const VALID_CATEGORIES = ['SPAM', 'HARASSMENT', 'PHISHING', 'INAPPROPRIATE', 'OTHER'];

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.reportedUserId || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: reportedUserId and category are required' },
        { status: 400 }
      );
    }

    const { chatId, reportedUserId, messageId = null, category, reason = '', blockUser = false } = body;

    const trimmedReason = String(reason || '').trim();
    const finalReason = trimmedReason.length >= 5 ? trimmedReason.slice(0, 500) : `Reported under category: ${category}`;

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent reporting oneself
    if (reportedUserId === authUser.userId) {
      return NextResponse.json(
        { error: 'You cannot report your own account' },
        { status: 400 }
      );
    }

    // Ensure reported user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: reportedUserId },
      select: { id: true, username: true },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: 'The reported user does not exist' },
        { status: 404 }
      );
    }

    // Resolve or find chatId if not provided
    let finalChatId = chatId;
    if (!finalChatId) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: authUser.userId } } },
            { participants: { some: { userId: reportedUserId } } },
          ],
        },
        select: { id: true },
      });

      if (existingChat) {
        finalChatId = existingChat.id;
      } else {
        const newChat = await prisma.chat.create({
          data: {
            isGroup: false,
            participants: {
              create: [
                { userId: authUser.userId, role: 'member' },
                { userId: reportedUserId, role: 'member' },
              ],
            },
          },
          select: { id: true },
        });
        finalChatId = newChat.id;
      }
    }

    // Rate limiting: max 5 reports per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentReportCount = await prisma.abuseReport.count({
      where: {
        reporterId: authUser.userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentReportCount >= 5) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: You can submit at most 5 reports per hour. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify messageId belongs to this chat if provided
    let finalMessageId: string | null = null;
    if (messageId) {
      const msg = await prisma.message.findUnique({
        where: { id: messageId },
        select: { id: true, chatId: true },
      });
      if (msg && msg.chatId === finalChatId) {
        finalMessageId = msg.id;
      }
    }

    // Create the AbuseReport
    const report = await prisma.abuseReport.create({
      data: {
        reporterId: authUser.userId,
        reportedUserId,
        chatId: finalChatId,
        messageId: finalMessageId,
        category,
        reason: finalReason,
        status: 'PENDING',
      },
    });

    // If user requested to block, optionally delete contact relation
    if (blockUser) {
      await prisma.contact.deleteMany({
        where: {
          userId: authUser.userId,
          contactUserId: reportedUserId,
        },
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        reportId: report.id,
        message: 'Report submitted successfully. Our moderation team will review this shortly.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to submit abuse report:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error submitting abuse report' },
      { status: 500 }
    );
  }
}
