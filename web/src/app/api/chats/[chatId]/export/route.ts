import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { generateHtmlTranscript } from '@/lib/htmlTranscriptGenerator';
import { createZipArchive, FileToArchive } from '@/lib/zipPacker';
import { recordAuditLog } from '@/lib/auditLogger';
import path from 'path';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await context.params;

    // Verify user is participant or admin
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: {
            user: {
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

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const isParticipant = chat.participants.some((p) => p.userId === user.id);
    const isPlatformAdmin = user.systemRole === 'SUPER_ADMIN' || user.systemRole === 'ADMIN';

    if (!isParticipant && !isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeMedia = searchParams.get('includeMedia') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const messageWhere: any = { chatId };
    if (startDate || endDate) {
      messageWhere.createdAt = {};
      if (startDate) messageWhere.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        messageWhere.createdAt.lte = end;
      }
    }

    // Query messages in chronological order
    const rawMessages = await prisma.message.findMany({
      where: messageWhere,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    const participantNames = chat.participants.map(
      (p) => `${p.user.displayName} (@${p.user.username})`
    );

    const chatTitle = chat.isGroup
      ? chat.groupTitle || 'Group Chat'
      : participantNames.find((n) => !n.includes(`@${user.username}`)) || 'Direct Chat';

    const transcriptMessages = rawMessages.map((m) => ({
      id: m.id,
      senderName: m.sender.displayName,
      senderUsername: m.sender.username,
      content: m.content || '',
      messageType: m.messageType,
      mediaUrl: m.mediaUrl,
      createdAt: m.createdAt.toISOString(),
      isDeleted: m.isDeleted,
    }));

    // 1. Generate HTML transcript
    const htmlContent = generateHtmlTranscript(
      {
        id: chat.id,
        title: chatTitle,
        isGroup: chat.isGroup,
        participants: participantNames,
        exportedAt: new Date().toISOString(),
        totalMessages: transcriptMessages.length,
        isLegalHold: chat.isLegalHold,
      },
      transcriptMessages
    );

    // 2. Generate JSON dump
    const jsonContent = JSON.stringify(
      {
        chat: {
          id: chat.id,
          title: chatTitle,
          isGroup: chat.isGroup,
          participants: chat.participants.map((p) => ({
            userId: p.userId,
            username: p.user.username,
            displayName: p.user.displayName,
            role: p.role,
          })),
          isLegalHold: chat.isLegalHold,
          exportedAt: new Date().toISOString(),
          exportedBy: `@${user.username}`,
        },
        messagesCount: transcriptMessages.length,
        messages: rawMessages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderUsername: m.sender.username,
          senderDisplayName: m.sender.displayName,
          messageType: m.messageType,
          content: m.content,
          mediaUrl: m.mediaUrl,
          mediaSize: m.mediaSize,
          mediaDuration: m.mediaDuration,
          replyToMessageId: m.replyToMessageId,
          isDeleted: m.isDeleted,
          isE2EE: m.isE2EE,
          latitude: m.latitude,
          longitude: m.longitude,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      null,
      2
    );

    const filesToArchive: FileToArchive[] = [
      { name: 'transcript.html', content: htmlContent },
      { name: 'transcript.json', content: jsonContent },
    ];

    // 3. If requested, bundle physical media attachments
    if (includeMedia) {
      const publicUploadsDir = path.join(process.cwd(), 'public');
      for (const m of rawMessages) {
        if (m.mediaUrl && !m.isDeleted && m.mediaUrl.startsWith('/uploads/')) {
          const diskPath = path.join(publicUploadsDir, m.mediaUrl);
          const filename = path.basename(m.mediaUrl);
          filesToArchive.push({
            name: `media/${filename}`,
            diskPath,
          });
        }
      }
    }

    // Record audit event
    await recordAuditLog({
      userId: user.id,
      action: 'CHAT_EXPORT_DOWNLOADED',
      resource: 'CHAT',
      entityId: chatId,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent'),
      metadata: {
        chatId,
        includeMedia,
        messageCount: transcriptMessages.length,
      },
    });

    const zipStream = createZipArchive(filesToArchive);

    // Convert PassThrough stream to Web ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        zipStream.on('data', (chunk) => controller.enqueue(chunk));
        zipStream.on('end', () => controller.close());
        zipStream.on('error', (err) => controller.error(err));
      },
    });

    const filename = `webchat_export_${chatId.slice(0, 8)}_${Date.now()}.zip`;

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
