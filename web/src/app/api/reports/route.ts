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
    if (!body || !body.chatId || !body.reportedUserId || !body.category || !body.reason) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, reportedUserId, category, and reason are required' },
        { status: 400 }
      );
    }

    const { chatId, reportedUserId, messageId = null, category, reason, blockUser = false } = body;

    const trimmedReason = String(reason).trim();
    if (trimmedReason.length < 5) {
      return NextResponse.json(
        { error: 'Reason must be at least 5 characters long' },
        { status: 400 }
      );
    }

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

    // Create the AbuseReport
    const report = await prisma.abuseReport.create({
      data: {
        reporterId: authUser.userId,
        reportedUserId,
        chatId,
        messageId,
        category,
        reason: trimmedReason.slice(0, 500),
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
