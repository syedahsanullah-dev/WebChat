import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createZipArchive, FileToArchive } from '@/lib/zipPacker';
import { recordAuditLog } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query full user data package
    const [profile, contacts, chats, messages, sessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          about: true,
          systemRole: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.contact.findMany({
        where: { userId: user.id },
        include: {
          contactUser: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.chatParticipant.findMany({
        where: { userId: user.id },
        include: {
          chat: {
            select: {
              id: true,
              isGroup: true,
              groupTitle: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.message.findMany({
        where: { senderId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10000,
        select: {
          id: true,
          chatId: true,
          content: true,
          messageType: true,
          mediaUrl: true,
          createdAt: true,
        },
      }),
      prisma.userSession.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          deviceType: true,
          browser: true,
          os: true,
          lastActiveAt: true,
          createdAt: true,
        },
      }),
    ]);

    const exportManifest = {
      compliance: 'GDPR Article 15 (Right of Access) & Article 20 (Data Portability)',
      exportedAt: new Date().toISOString(),
      account: profile,
      contactsCount: contacts.length,
      chatsCount: chats.length,
      messagesSentCount: messages.length,
      activeSessionsCount: sessions.length,
    };

    const filesToArchive: FileToArchive[] = [
      {
        name: 'manifest.json',
        content: JSON.stringify(exportManifest, null, 2),
      },
      {
        name: 'profile.json',
        content: JSON.stringify(profile, null, 2),
      },
      {
        name: 'contacts.json',
        content: JSON.stringify(contacts, null, 2),
      },
      {
        name: 'conversations.json',
        content: JSON.stringify(chats, null, 2),
      },
      {
        name: 'messages_sent.json',
        content: JSON.stringify(messages, null, 2),
      },
      {
        name: 'sessions.json',
        content: JSON.stringify(sessions, null, 2),
      },
    ];

    // Record audit event
    await recordAuditLog({
      userId: user.id,
      action: 'USER_DATA_EXPORT_DOWNLOADED',
      resource: 'USER_DATA',
      entityId: user.id,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent'),
      metadata: {
        username: user.username,
        recordsExported: messages.length,
      },
    });

    const zipStream = createZipArchive(filesToArchive);

    const readable = new ReadableStream({
      start(controller) {
        zipStream.on('data', (chunk) => controller.enqueue(chunk));
        zipStream.on('end', () => controller.close());
        zipStream.on('error', (err) => controller.error(err));
      },
    });

    const filename = `gdpr_data_export_${user.username}_${Date.now()}.zip`;

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
