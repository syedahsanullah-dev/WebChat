import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    const whereClause: any = {
      userId: user.id,
      isTriggered: false,
    };

    if (chatId) {
      whereClause.chatId = chatId;
    }

    const reminders = await prisma.scheduledReminder.findMany({
      where: whereClause,
      orderBy: { remindAt: 'asc' },
      take: 20,
    });

    return NextResponse.json({ reminders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get('id');

    if (!reminderId) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    const reminder = await prisma.scheduledReminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder || (reminder.userId !== user.id && user.systemRole !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Reminder not found or unauthorized' }, { status: 404 });
    }

    await prisma.scheduledReminder.delete({
      where: { id: reminderId },
    });

    return NextResponse.json({ success: true, message: 'Reminder cancelled successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
