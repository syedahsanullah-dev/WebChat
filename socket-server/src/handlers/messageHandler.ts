import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { dlpScanner } from '../middleware/dlpScanner.js';
import {
  WsEnvelope,
  MessageSendPayload,
  MessageAckPayload,
  MessageReadPayload,
  MessageStatusUpdatePayload,
} from '../types/index.js';

/**
 * Handles incoming message:send event:
 * 1. Persists message to MySQL
 * 2. Creates initial MessageStatus (sent or delivered depending on recipient presence)
 * 3. Updates Chat.lastMessageAt & Chat.lastMessageId
 * 4. Acks to sender with message:ack and confirmed ID/status
 * 5. Dispatches message:new to recipient and message:status (delivered) to sender
 */
export async function handleMessageSend(
  socket: AuthenticatedWebSocket,
  payload: MessageSendPayload
): Promise<void> {
  const mediaUrl = payload.mediaUrl || payload.fileUrl || null;
  const mediaSize = payload.mediaSize ?? payload.fileSize ?? null;
  const mediaDuration = payload.mediaDuration ?? payload.duration ?? null;
  const documentName = payload.documentName || payload.fileName || null;
  const documentSize = payload.documentSize ?? payload.fileSize ?? null;
  const documentMime = payload.documentMime || null;
  const isCodeBlock = Boolean(payload.isCodeBlock);
  const codeLanguage = payload.codeLanguage || null;
  const isLocation =
    (payload.messageType === 'location' || payload.type === 'location') ||
    (payload.latitude !== undefined && payload.latitude !== null);

  if (!payload?.chatId || (!payload.content && !mediaUrl && !isLocation && !documentName)) {
    return;
  }

  const messageType = isLocation
    ? 'location'
    : (payload.messageType || payload.type || (documentName ? 'document' : mediaUrl ? 'image' : 'text')).toLowerCase();
  const tempId = payload.tempId;
  const isE2EE = Boolean(payload.isE2EE);
  const e2eeIv = payload.e2eeIv || null;
  const latitude = payload.latitude !== undefined && payload.latitude !== null ? Number(payload.latitude) : null;
  const longitude = payload.longitude !== undefined && payload.longitude !== null ? Number(payload.longitude) : null;
  const locationAddress = payload.locationAddress || null;

  // 0. Preflight in-memory Data Loss Prevention (DLP) scan (< 1ms execution)
  if (payload.content && !isE2EE) {
    const dlpResult = await dlpScanner.evaluateMessage(payload.content);
    if (dlpResult.isBlocked) {
      await dlpScanner.handleViolation(socket, payload.content, dlpResult);
      return;
    }
  }

  try {
    // Check if user is suspended or muted
    const senderStatus = await prisma.user.findUnique({
      where: { id: socket.userId },
      select: { isSuspended: true, mutedUntil: true },
    }).catch(() => null);

    if (senderStatus?.isSuspended) {
      socket.send(
        JSON.stringify({
          type: 'error',
          payload: { message: 'Your account is suspended.', code: 'USER_SUSPENDED' },
        })
      );
      return;
    }

    if (senderStatus?.mutedUntil && new Date(senderStatus.mutedUntil) > new Date()) {
      socket.send(
        JSON.stringify({
          type: 'error',
          payload: {
            message: `You are temporarily muted until ${new Date(senderStatus.mutedUntil).toLocaleTimeString()}.`,
            code: 'USER_MUTED',
          },
        })
      );
      return;
    }

    // Check if chat is a broadcast channel and fetch ephemeral duration
    const chatRecord = await prisma.chat.findUnique({
      where: { id: payload.chatId },
      select: { isChannel: true, isGroup: true, groupAdminId: true, ephemeralDuration: true },
    }).catch(() => null);

    const isChannel = Boolean(chatRecord?.isChannel);
    let expiresAt: Date | null = null;
    if (chatRecord?.ephemeralDuration && chatRecord.ephemeralDuration > 0) {
      expiresAt = new Date(Date.now() + chatRecord.ephemeralDuration * 1000);
    }

    // 1. Identify all chat recipients (for both 1-on-1 and group chats)
    let otherParticipantIds: string[] = [];
    if (!isChannel) {
      try {
        const participants = await prisma.chatParticipant.findMany({
          where: {
            chatId: payload.chatId,
            userId: { not: socket.userId },
          },
          select: { userId: true },
        });
        otherParticipantIds = participants.map((p) => p.userId);
      } catch (err) {
        logger.debug(`Could not look up participants from DB: ${(err as Error).message}`);
      }

      // Fallback if DB participants lookup returned empty
      if (otherParticipantIds.length === 0 && payload.recipientId && payload.recipientId !== payload.chatId && !payload.recipientId.startsWith('chat-')) {
        otherParticipantIds.push(payload.recipientId);
      }
    }

    // Check if at least one recipient is online
    const hasOnlineRecipient = !isChannel && otherParticipantIds.some((uid) => roomManager.isUserOnline(uid));
    const initialStatus = isChannel ? 'sent' : (hasOnlineRecipient ? 'delivered' : 'sent');

    // 2. Persist message to DB
    let savedMessage: any = null;
    try {
      savedMessage = await prisma.message.create({
        data: {
          chatId: payload.chatId,
          senderId: socket.userId,
          messageType,
          content: payload.content || '',
          mediaUrl,
          mediaSize,
          mediaDuration,
          replyToMessageId: payload.replyToMessageId || payload.replyToId || null,
          latitude,
          longitude,
          locationAddress,
          documentName,
          documentSize,
          documentMime,
          isCodeBlock,
          codeLanguage,
          isE2EE,
          e2eeIv,
          expiresAt,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Create MessageStatus for each recipient
      if (otherParticipantIds.length > 0) {
        await Promise.all(
          otherParticipantIds.map((targetUid) =>
            prisma.messageStatus
              .create({
                data: {
                  messageId: savedMessage.id,
                  userId: targetUid,
                  status: roomManager.isUserOnline(targetUid) ? 'delivered' : 'sent',
                },
              })
              .catch((err) => logger.debug(`Failed to create MessageStatus for ${targetUid}: ${err.message}`))
          )
        );
      }

      // Update Chat record
      await prisma.chat
        .update({
          where: { id: payload.chatId },
          data: {
            lastMessageAt: savedMessage.createdAt,
            lastMessageId: savedMessage.id,
          },
        })
        .catch((err) => logger.debug(`Failed to update chat lastMessage: ${err.message}`));
    } catch (dbErr) {
      logger.debug(`DB persistence non-fatal fallback: ${(dbErr as Error).message}`);
      // Fallback mock savedMessage if DB is offline in test
      savedMessage = {
        id: `msg-${Date.now()}`,
        chatId: payload.chatId,
        senderId: socket.userId,
        messageType,
        content: payload.content,
        mediaUrl,
        mediaSize,
        mediaDuration,
        replyToMessageId: payload.replyToMessageId || null,
        isE2EE,
        e2eeIv,
        latitude,
        longitude,
        locationAddress,
        documentName,
        documentSize,
        documentMime,
        isCodeBlock,
        codeLanguage,
        expiresAt,
        createdAt: new Date(),
        sender: {
          id: socket.userId,
          username: socket.username,
          displayName: socket.username,
          avatarUrl: null,
        },
      };
    }

    const messageId = savedMessage.id;
    const createdAtIso =
      savedMessage.createdAt instanceof Date
        ? savedMessage.createdAt.toISOString()
        : new Date().toISOString();

    // 3. Acknowledge message receipt back to sender socket
    const ackEnvelope: WsEnvelope<MessageAckPayload> = {
      type: 'message:ack',
      payload: {
        tempId,
        messageId,
        chatId: payload.chatId,
        createdAt: createdAtIso,
        status: initialStatus,
        isE2EE,
        e2eeIv,
        latitude: savedMessage.latitude,
        longitude: savedMessage.longitude,
        locationAddress: savedMessage.locationAddress,
        documentName: savedMessage.documentName,
        documentSize: savedMessage.documentSize,
        documentMime: savedMessage.documentMime,
        isCodeBlock: savedMessage.isCodeBlock,
        codeLanguage: savedMessage.codeLanguage,
        expiresAt: savedMessage.expiresAt ? (savedMessage.expiresAt instanceof Date ? savedMessage.expiresAt.toISOString() : String(savedMessage.expiresAt)) : null,
      },
    };
    socket.send(JSON.stringify(ackEnvelope));

    // 4. Construct outgoing message:new envelope
    const newMsgEnvelope: WsEnvelope = {
      type: 'message:new',
      payload: {
        id: messageId,
        tempId,
        chatId: payload.chatId,
        senderId: socket.userId,
        content: savedMessage.content,
        type: savedMessage.messageType,
        messageType: savedMessage.messageType,
        mediaUrl: savedMessage.mediaUrl,
        mediaSize: savedMessage.mediaSize,
        mediaDuration: savedMessage.mediaDuration,
        replyToId: savedMessage.replyToMessageId,
        isE2EE,
        e2eeIv,
        latitude: savedMessage.latitude,
        longitude: savedMessage.longitude,
        locationAddress: savedMessage.locationAddress,
        documentName: savedMessage.documentName,
        documentSize: savedMessage.documentSize,
        documentMime: savedMessage.documentMime,
        isCodeBlock: savedMessage.isCodeBlock,
        codeLanguage: savedMessage.codeLanguage,
        expiresAt: savedMessage.expiresAt ? (savedMessage.expiresAt instanceof Date ? savedMessage.expiresAt.toISOString() : String(savedMessage.expiresAt)) : null,
        status: initialStatus,
        createdAt: createdAtIso,
        sender: savedMessage.sender,
      },
    };

    // Broadcast to chat room excluding sender
    roomManager.broadcastToRoom(`chat:${payload.chatId}`, newMsgEnvelope, socket);

    // Direct delivery to all online participants (ensures delivery even without room join)
    // And dispatch background Web Push to offline participants
    otherParticipantIds.forEach((targetUid) => {
      if (roomManager.isUserOnline(targetUid)) {
        roomManager.sendToUser(targetUid, newMsgEnvelope);
      } else {
        dispatchOfflinePush(targetUid, {
          title: savedMessage.sender?.displayName || savedMessage.sender?.username || 'WebChat',
          senderName: savedMessage.sender?.displayName || savedMessage.sender?.username || 'WebChat',
          body: isE2EE
            ? 'New encrypted message'
            : savedMessage.messageType === 'image'
            ? '📷 Photo'
            : savedMessage.messageType === 'voice'
            ? '🎤 Voice message'
            : savedMessage.messageType === 'document'
            ? `📄 ${savedMessage.documentName || 'Document'}`
            : savedMessage.messageType === 'location'
            ? '📍 Location'
            : savedMessage.content || 'New message',
          avatarUrl: savedMessage.sender?.avatarUrl || undefined,
          chatId: payload.chatId,
          url: `/chat/${payload.chatId}`,
        }).catch((err) => logger.debug(`Push dispatch failed for offline user ${targetUid}: ${err.message}`));
      }
    });

    // Notify sender that message has been delivered if any recipient is online (skip for broadcast channels to prevent socket flood)
    if (!isChannel && hasOnlineRecipient) {
      const deliveredEnvelope: WsEnvelope<MessageStatusUpdatePayload> = {
        type: 'message:status',
        payload: {
          chatId: payload.chatId,
          messageId,
          status: 'delivered',
          userId: otherParticipantIds[0],
        },
      };
      socket.send(JSON.stringify(deliveredEnvelope));
    }
  } catch (error) {
    logger.error('Error in handleMessageSend:', error);
  }
}

/**
 * Handles incoming message:read event:
 * Marks unread messages in the chat as read in DB and broadcasts status: 'read'
 */
export async function handleMessageRead(
  socket: AuthenticatedWebSocket,
  payload: MessageReadPayload
): Promise<void> {
  if (!payload?.chatId) return;

  try {
    // 1. Update MySQL MessageStatus records asynchronously
    prisma.messageStatus
      .updateMany({
        where: {
          message: { chatId: payload.chatId },
          userId: socket.userId,
          status: { not: 'read' },
        },
        data: {
          status: 'read',
        },
      })
      .catch((err) => logger.debug(`Failed to update messageStatus to read: ${err.message}`));

    // 2. Update participant lastReadAt
    prisma.chatParticipant
      .updateMany({
        where: {
          chatId: payload.chatId,
          userId: socket.userId,
        },
        data: {
          lastReadAt: new Date(),
        },
      })
      .catch((err) => logger.debug(`Failed to update lastReadAt: ${err.message}`));

    // 3. Broadcast read status to the chat room
    const statusEnvelope: WsEnvelope<MessageStatusUpdatePayload> = {
      type: 'message:status',
      payload: {
        chatId: payload.chatId,
        messageId: payload.messageId,
        status: 'read',
        userId: socket.userId,
      },
    };

    roomManager.broadcastToRoom(`chat:${payload.chatId}`, statusEnvelope, socket);

    // If specific sender exists, also deliver directly
    if (payload.userId) {
      roomManager.sendToUser(payload.userId, statusEnvelope);
    }
  } catch (error) {
    logger.error('Error in handleMessageRead:', error);
  }
}

/**
 * Dispatches a background Web Push notification to an offline recipient via Server #1 Next.js API
 */
export async function dispatchOfflinePush(recipientId: string, payload: any): Promise<void> {
  const nextApiUrl = process.env.NEXT_API_URL || 'https://chat.vusigma.com';
  const secret = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || '';

  try {
    const res = await fetch(`${nextApiUrl}/api/push/internal-trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ recipientId, payload }),
    });
    if (!res.ok) {
      logger.debug(`Internal push trigger returned status ${res.status}`);
    }
  } catch (err: any) {
    logger.debug(`Offline push dispatch network error: ${err.message}`);
  }
}

