import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { WsEnvelope, MessageDeletePayload } from '../types/index.js';

/**
 * Handles incoming message:delete event:
 * - "Delete for everyone": Updates MySQL isDeleted = true and broadcasts to room
 * - "Delete for me": Acknowledges to the sender socket only
 */
export async function handleMessageDelete(
  socket: AuthenticatedWebSocket,
  payload: MessageDeletePayload
): Promise<void> {
  if (!payload?.chatId || !payload?.messageId) {
    return;
  }

  const { chatId, messageId, deleteType = 'everyone' } = payload;

  // Phase 28: Legal Hold Guard - Block deletion if chat is under legal hold
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { isLegalHold: true },
    });

    if (chat?.isLegalHold) {
      logger.warn(`Rejected message delete: Chat ${chatId} is under active Legal Hold.`);
      socket.send(
        JSON.stringify({
          type: 'error',
          payload: {
            code: 'LEGAL_HOLD_ACTIVE',
            message: 'Cannot delete messages: This conversation is under active Legal Hold.',
          },
        })
      );
      return;
    }
  } catch (err: any) {
    logger.error('Error verifying legal hold in deleteHandler:', err);
  }

  if (deleteType === 'everyone') {
    try {
      // Update in MySQL
      await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          content: '🚫 This message was deleted',
          mediaUrl: null,
        },
      });
    } catch (err) {
      logger.debug(`Could not update isDeleted in DB (non-fatal): ${(err as Error).message}`);
    }

    const envelope: WsEnvelope<MessageDeletePayload> = {
      type: 'message:delete',
      payload: {
        chatId,
        messageId,
        deleteType: 'everyone',
        userId: socket.userId,
      },
    };

    // Broadcast to room so all clients update the message bubble
    roomManager.broadcastToRoom(`chat:${chatId}`, envelope);
    logger.info(`Message ${messageId} deleted for everyone by ${socket.username}`);
  } else {
    // Delete for me only
    const envelope: WsEnvelope<MessageDeletePayload> = {
      type: 'message:delete',
      payload: {
        chatId,
        messageId,
        deleteType: 'forMe',
        userId: socket.userId,
      },
    };
    socket.send(JSON.stringify(envelope));
    logger.debug(`Message ${messageId} deleted for me by ${socket.username}`);
  }
}
