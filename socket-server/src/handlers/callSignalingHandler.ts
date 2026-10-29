import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import {
  WsEnvelope,
  AudioCallInvitePayload,
  AudioCallIncomingPayload,
  AudioCallRingPayload,
  AudioCallAcceptPayload,
  AudioCallAcceptedPayload,
  AudioCallRejectPayload,
  AudioCallBusyPayload,
  AudioCallIceCandidatePayload,
  AudioCallEndPayload,
  AudioCallEndedPayload,
  AudioCallAnsweredElsewherePayload,
  AudioCallMutePayload,
  AudioCallIceRestartPayload,
  AudioCallIceRestartAnswerPayload,
} from '../types/index.js';

interface ActiveCallSession {
  callId: string;
  chatId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  receiverId: string;
  status: 'ringing' | 'connected' | 'ended';
  startedAt: Date;
  connectedAt?: Date;
  sdpOffer?: any;
}

// In-memory active call sessions
export const activeSessions = new Map<string, ActiveCallSession>();

// Phase 40: Map of pending offline push wake timers (20s grace period)
const offlineWakeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Helper: format seconds to "Xm Ys" or "Xs"
 */
function formatCallDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

/**
 * Helper: Persist CallLog to MySQL and insert in-chat call summary message
 */
async function recordCallOutcome(
  callId: string,
  chatId: string,
  callerId: string,
  receiverId: string,
  status: 'completed' | 'missed' | 'rejected' | 'busy',
  durationSeconds: number,
  startedAt: Date
) {
  try {
    let resolvedChatId = chatId;

    // Hardening: Resolve or auto-create direct chat if chatId is empty to prevent foreign key violations
    if (!resolvedChatId || resolvedChatId.trim() === '') {
      try {
        const participant = await prisma.chatParticipant.findFirst({
          where: {
            userId: callerId,
            chat: {
              isGroup: false,
              participants: {
                some: { userId: receiverId },
              },
            },
          },
          select: { chatId: true },
        });

        if (participant) {
          resolvedChatId = participant.chatId;
        } else {
          const directChat = await prisma.chat.create({
            data: {
              isGroup: false,
              participants: {
                create: [
                  { userId: callerId, role: 'member' },
                  { userId: receiverId, role: 'member' },
                ],
              },
            },
            select: { id: true },
          });
          resolvedChatId = directChat.id;
        }
      } catch (err) {
        logger.warn(`[CallSignaling] Could not auto-resolve/create direct chat for call outcome: ${(err as Error).message}`);
      }
    }

    if (!resolvedChatId) {
      logger.error(`[CallSignaling] Cannot record call outcome: missing chatId for call ${callId}`);
      return;
    }

    // In-memory retry loop for Hostinger MySQL connection_limit=10 pool exhaustion resilience
    let attempts = 0;
    while (attempts < 3) {
      try {
        // 1. Create CallLog entry
        await prisma.callLog.create({
          data: {
            id: callId,
            chatId: resolvedChatId,
            callerId,
            receiverId,
            callType: 'audio',
            status,
            duration: durationSeconds,
            startedAt,
            endedAt: new Date(),
          },
        });

        // 2. Generate in-feed call summary badge message
        let badgeText = '';
        if (status === 'completed') {
          badgeText = `📞 Voice call - ${formatCallDuration(durationSeconds)}`;
        } else if (status === 'missed') {
          badgeText = '📞 Missed voice call';
        } else if (status === 'rejected') {
          badgeText = '📞 Declined voice call';
        } else if (status === 'busy') {
          badgeText = '📞 Contact busy';
        }

        const message = await prisma.message.create({
          data: {
            chatId: resolvedChatId,
            senderId: callerId,
            messageType: 'call',
            content: badgeText,
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

        // Broadcast new message to room
        roomManager.broadcastToRoom(`chat:${resolvedChatId}`, {
          type: 'message:new',
          payload: {
            id: message.id,
            chatId: message.chatId,
            senderId: message.senderId,
            content: message.content,
            messageType: message.messageType,
            type: message.messageType,
            status: 'sent',
            createdAt: message.createdAt.toISOString(),
            sender: message.sender,
          },
        });

        break;
      } catch (err) {
        attempts++;
        if (attempts >= 3) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempts)));
      }
    }
  } catch (err) {
    logger.error(`[CallSignaling] Error recording call outcome: ${(err as Error).message}`);
  }
}

/**
 * 1. audio-call:invite
 * Initiated by caller. Forwards SDP offer to recipient.
 */
export async function handleCallInvite(
  socket: AuthenticatedWebSocket,
  payload: AudioCallInvitePayload
): Promise<void> {
  const { callId, chatId, receiverId, callerName, callerAvatar, sdpOffer, offerSdp } = payload;
  const callerId = socket.userId;
  const sdp = sdpOffer || offerSdp;

  if (!callId || !receiverId) {
    return;
  }

  // Resolve targetReceiverId if receiverId is a username or if receiverId is a chatId
  let targetReceiverId = receiverId;
  if (targetReceiverId.startsWith('@') || targetReceiverId.length < 15) {
    try {
      const cleanUsername = targetReceiverId.replace(/^@/, '');
      const user = await prisma.user.findFirst({
        where: { username: cleanUsername },
        select: { id: true },
      });
      if (user) {
        targetReceiverId = user.id;
      }
    } catch (err) {
      logger.debug(`Could not resolve receiverId by username: ${(err as Error).message}`);
    }
  }

  if ((!targetReceiverId || targetReceiverId === chatId || !roomManager.isUserOnline(targetReceiverId)) && chatId) {
    try {
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: { not: callerId },
        },
        select: { userId: true },
      });
      if (participant) {
        targetReceiverId = participant.userId;
      }
    } catch (err) {
      logger.debug(`Could not resolve receiverId from chat participants: ${(err as Error).message}`);
    }
  }

  // Check if receiver is online
  const isReceiverOnline = roomManager.isUserOnline(targetReceiverId);
  if (!isReceiverOnline) {
    logger.info(`[CallSignaling] Call ${callId}: Receiver ${targetReceiverId} is offline, attempting high-priority push`);

    // Register session in activeSessions in 'ringing' status with sdpOffer
    const offlineSession: ActiveCallSession = {
      callId,
      chatId: chatId || '',
      callerId,
      callerName: callerName || socket.username,
      callerAvatar: callerAvatar || null,
      receiverId: targetReceiverId,
      status: 'ringing',
      startedAt: new Date(),
      sdpOffer: sdp,
    };
    activeSessions.set(callId, offlineSession);

    // Send audio-call:ring to caller so their outgoing call screen transitions to ringing
    const ringEnvelope: WsEnvelope<AudioCallRingPayload> = {
      type: 'audio-call:ring',
      payload: {
        callId,
        chatId: chatId || '',
        callerId,
        receiverId: targetReceiverId,
      },
    };
    socket.send(JSON.stringify(ringEnvelope));

    // Asynchronously dispatch high-priority Web Push via Server #1
    const nextApiUrl = process.env.NEXT_API_URL || 'https://chat.vusigma.com';
    const secret = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || '';
    fetch(`${nextApiUrl}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        recipientId: targetReceiverId,
        type: 'call_invite',
        callId,
        chatId,
        callerName: offlineSession.callerName,
        callerAvatar: offlineSession.callerAvatar,
        sdpOffer: sdp,
      }),
    }).catch((err) => {
      logger.warn(`[CallSignaling] Offline call push dispatch failed: ${(err as Error).message}`);
    });

    // 20-second grace window for the callee device to wake up and connect
    const wakeTimer = setTimeout(async () => {
      offlineWakeTimers.delete(callId);
      const currentSession = activeSessions.get(callId);
      if (currentSession && currentSession.status === 'ringing') {
        logger.info(`[CallSignaling] Call ${callId}: 20s offline wake window expired for ${targetReceiverId}`);
        activeSessions.delete(callId);
        const rejectEnvelope: WsEnvelope<AudioCallRejectPayload> = {
          type: 'audio-call:reject',
          payload: {
            callId,
            chatId,
            callerId,
            receiverId: targetReceiverId,
            reason: 'offline',
          },
        };
        roomManager.sendToUser(callerId, rejectEnvelope);
        await recordCallOutcome(callId, chatId, callerId, targetReceiverId, 'missed', 0, currentSession.startedAt);
      }
    }, 20000);
    offlineWakeTimers.set(callId, wakeTimer);
    return;
  }

  // Check if receiver is currently in another active call
  for (const session of activeSessions.values()) {
    if (session.status !== 'ended') {
      // 1. Detect simultaneous dialing (Glare condition) between caller and targetReceiver
      if (session.callerId === targetReceiverId && session.receiverId === callerId && session.status === 'ringing') {
        logger.info(`[CallSignaling] Glare detected between ${callerId} and ${targetReceiverId}`);
        // RFC 8829 tie-breaker: compare callerId and targetReceiverId lexicographically
        // Smaller ID is polite and yields; larger ID wins and proceeds
        const isCurrentCallerPolite = callerId < targetReceiverId;
        if (isCurrentCallerPolite) {
          logger.info(`[CallSignaling] Caller ${callerId} is polite and yields to ${targetReceiverId}`);
          const busyEnvelope: WsEnvelope<AudioCallBusyPayload> = {
            type: 'audio-call:busy',
            payload: {
              callId,
              chatId,
              callerId,
              receiverId: targetReceiverId,
            },
          };
          socket.send(JSON.stringify(busyEnvelope));
          return;
        } else {
          logger.info(`[CallSignaling] Caller ${callerId} wins tie-breaker over ${targetReceiverId}`);
          activeSessions.delete(session.callId);
          roomManager.sendToUser(targetReceiverId, {
            type: 'audio-call:ended',
            payload: {
              callId: session.callId,
              chatId: session.chatId,
              status: 'missed',
              reason: 'glare_collision',
            },
          });
          break;
        }
      }

      if (session.receiverId === targetReceiverId || session.callerId === targetReceiverId) {
        logger.info(`[CallSignaling] Call ${callId}: Receiver ${targetReceiverId} is busy in call ${session.callId}`);
        const busyEnvelope: WsEnvelope<AudioCallBusyPayload> = {
          type: 'audio-call:busy',
          payload: {
            callId,
            chatId,
            callerId,
            receiverId: targetReceiverId,
          },
        };
        socket.send(JSON.stringify(busyEnvelope));

        // Record as busy call
        await recordCallOutcome(callId, chatId, callerId, targetReceiverId, 'busy', 0, new Date());
        return;
      }
    }
  }

  // Register session
  const session: ActiveCallSession = {
    callId,
    chatId: chatId || '',
    callerId,
    callerName: callerName || socket.username,
    callerAvatar: callerAvatar || null,
    receiverId: targetReceiverId,
    status: 'ringing',
    startedAt: new Date(),
    sdpOffer: sdp,
  };
  activeSessions.set(callId, session);

  // Dispatch audio-call:incoming to receiver
  const incomingEnvelope: WsEnvelope<AudioCallIncomingPayload> = {
    type: 'audio-call:incoming',
    payload: {
      callId,
      chatId,
      callerId,
      callerName: session.callerName,
      callerAvatar: session.callerAvatar,
      receiverId: targetReceiverId,
      sdpOffer: sdp,
      offerSdp: sdp,
    },
  };

  roomManager.sendToUser(targetReceiverId, incomingEnvelope);
  logger.info(`[CallSignaling] Dispatched audio-call:incoming for call ${callId} to ${targetReceiverId}`);
}

/**
 * 2. audio-call:ring
 * Dispatched by receiver when ringing UI starts.
 */
export function handleCallRing(
  socket: AuthenticatedWebSocket,
  payload: AudioCallRingPayload
): void {
  const { callId, receiverId } = payload;
  const session = activeSessions.get(callId);
  const targetCallerId = session?.callerId || payload.callerId;

  if (targetCallerId) {
    const ringEnvelope: WsEnvelope<AudioCallRingPayload> = {
      type: 'audio-call:ring',
      payload: {
        callId,
        chatId: session?.chatId || payload.chatId,
        callerId: targetCallerId,
        receiverId: receiverId || socket.userId,
      },
    };
    roomManager.sendToUser(targetCallerId, ringEnvelope);
  }
}

/**
 * 3. audio-call:accept
 * Dispatched by receiver upon clicking Accept with answer SDP.
 */
export function handleCallAccept(
  socket: AuthenticatedWebSocket,
  payload: AudioCallAcceptPayload
): void {
  const { callId, sdpAnswer, answerSdp } = payload;
  const session = activeSessions.get(callId);
  const targetCallerId = session?.callerId || payload.callerId;

  // Clear any pending offline wake timer
  const wakeTimer = offlineWakeTimers.get(callId);
  if (wakeTimer) {
    clearTimeout(wakeTimer);
    offlineWakeTimers.delete(callId);
  }

  if (session) {
    session.status = 'connected';
    session.connectedAt = new Date();
  }

  // Multi-Device Answering Synchronization (Phase 39):
  // Notify all OTHER open sockets/tabs of the callee to stop ringing immediately!
  roomManager.sendToUser(
    socket.userId,
    {
      type: 'audio-call:answered_elsewhere',
      payload: {
        callId,
        chatId: session?.chatId || payload.chatId,
      },
    },
    socket
  );

  if (targetCallerId) {
    const acceptedEnvelope: WsEnvelope<AudioCallAcceptedPayload> = {
      type: 'audio-call:accepted',
      payload: {
        callId,
        chatId: session?.chatId || payload.chatId,
        callerId: targetCallerId,
        receiverId: socket.userId,
        sdpAnswer: sdpAnswer || answerSdp,
        answerSdp: sdpAnswer || answerSdp,
      },
    };
    roomManager.sendToUser(targetCallerId, acceptedEnvelope);
    logger.info(`[CallSignaling] Forwarded audio-call:accepted for call ${callId} to ${targetCallerId}`);
  }
}

/**
 * 4. audio-call:reject
 * Dispatched when receiver declines call.
 */
export async function handleCallReject(
  socket: AuthenticatedWebSocket,
  payload: AudioCallRejectPayload
): Promise<void> {
  const { callId, reason = 'declined' } = payload;
  const session = activeSessions.get(callId);

  // Clear any pending offline wake timer
  const wakeTimer = offlineWakeTimers.get(callId);
  if (wakeTimer) {
    clearTimeout(wakeTimer);
    offlineWakeTimers.delete(callId);
  }

  // If call is already connected, ignore late rejection envelopes from secondary tabs
  if (session && session.status === 'connected') {
    logger.warn(`[CallSignaling] Ignoring reject envelope for already connected call ${callId}`);
    return;
  }

  const targetCallerId = session?.callerId || payload.callerId;
  const chatId = session?.chatId || payload.chatId || '';
  const startedAt = session?.startedAt || new Date();

  if (session) {
    activeSessions.delete(callId);
  }

  if (targetCallerId) {
    const rejectEnvelope: WsEnvelope<AudioCallRejectPayload> = {
      type: 'audio-call:reject',
      payload: {
        callId,
        chatId,
        callerId: targetCallerId,
        receiverId: socket.userId,
        reason,
      },
    };
    roomManager.sendToUser(targetCallerId, rejectEnvelope);
  }

  const status = reason === 'busy' ? 'busy' : reason === 'timeout' ? 'missed' : 'rejected';
  if (targetCallerId && chatId) {
    await recordCallOutcome(callId, chatId, targetCallerId, socket.userId, status, 0, startedAt);
  }
}

/**
 * 5. audio-call:ice-candidate
 * Relays ICE candidate between caller and receiver.
 */
export function handleCallIceCandidate(
  socket: AuthenticatedWebSocket,
  payload: AudioCallIceCandidatePayload
): void {
  const { callId, candidate, receiverId } = payload;
  const session = activeSessions.get(callId);

  // Determine recipient of candidate
  let targetUserId = receiverId;
  if (!targetUserId && session) {
    targetUserId = socket.userId === session.callerId ? session.receiverId : session.callerId;
  }

  if (targetUserId && candidate) {
    const candidateEnvelope: WsEnvelope<AudioCallIceCandidatePayload> = {
      type: 'audio-call:ice-candidate',
      payload: {
        callId,
        chatId: session?.chatId || payload.chatId,
        callerId: session?.callerId,
        senderId: socket.userId,
        receiverId: targetUserId,
        candidate,
      },
    };
    roomManager.sendToUser(targetUserId, candidateEnvelope);
  }
}

/**
 * 6. audio-call:end
 * Dispatched when either participant hangs up.
 */
export async function handleCallEnd(
  socket: AuthenticatedWebSocket,
  payload: AudioCallEndPayload
): Promise<void> {
  const { callId, reason } = payload;
  const session = activeSessions.get(callId);

  // Clear any pending offline wake timer
  const wakeTimer = offlineWakeTimers.get(callId);
  if (wakeTimer) {
    clearTimeout(wakeTimer);
    offlineWakeTimers.delete(callId);
  }

  const callerId = session?.callerId || payload.callerId || socket.userId;
  const receiverId = session?.receiverId || payload.receiverId || '';
  const chatId = session?.chatId || payload.chatId || '';
  const startedAt = session?.startedAt || new Date();

  // Calculate duration
  let duration = payload.duration || 0;
  if (!duration && session?.connectedAt) {
    duration = Math.max(1, Math.floor((Date.now() - session.connectedAt.getTime()) / 1000));
  }

  // Identify remote peer to notify
  const remotePeerId = socket.userId === callerId ? receiverId : callerId;

  if (session) {
    activeSessions.delete(callId);
  }

  // Notify remote peer
  if (remotePeerId) {
    const endedEnvelope: WsEnvelope<AudioCallEndedPayload> = {
      type: 'audio-call:ended',
      payload: {
        callId,
        chatId,
        duration,
        status: duration > 0 ? 'completed' : 'missed',
        reason,
      },
    };
    roomManager.sendToUser(remotePeerId, endedEnvelope);
  }

  // Record outcome in DB
  const outcomeStatus = duration > 0 ? 'completed' : 'missed';
  if (callerId && receiverId && chatId) {
    await recordCallOutcome(callId, chatId, callerId, receiverId, outcomeStatus, duration, startedAt);
  }
}

/**
 * 7. audio-call:mute / audio-call:unmute
 * Relays peer microphone mute state
 */
export function handleCallMute(
  socket: AuthenticatedWebSocket,
  payload: AudioCallMutePayload
): void {
  const { callId, isMuted } = payload;
  const session = activeSessions.get(callId);
  if (!session) return;

  const targetPeerId = socket.userId === session.callerId ? session.receiverId : session.callerId;
  if (targetPeerId) {
    const muteEnvelope: WsEnvelope<AudioCallMutePayload> = {
      type: 'audio-call:mute',
      payload: {
        callId,
        chatId: session.chatId,
        userId: socket.userId,
        isMuted: Boolean(isMuted),
      },
    };
    roomManager.sendToUser(targetPeerId, muteEnvelope);
  }
}

/**
 * 8. audio-call:ice-restart (Phase 41)
 * Relays renegotiation offer with ICE restart flag to remote peer during network handover
 */
export function handleCallIceRestart(
  socket: AuthenticatedWebSocket,
  payload: AudioCallIceRestartPayload
): void {
  const { callId, offerSdp, sdpOffer } = payload;
  const session = activeSessions.get(callId);
  if (!session) return;

  const targetPeerId = socket.userId === session.callerId ? session.receiverId : session.callerId;
  if (targetPeerId) {
    const envelope: WsEnvelope<AudioCallIceRestartPayload> = {
      type: 'audio-call:ice-restart',
      payload: {
        callId,
        chatId: session.chatId,
        callerId: session.callerId,
        receiverId: targetPeerId,
        offerSdp: offerSdp || sdpOffer,
        sdpOffer: offerSdp || sdpOffer,
      },
    };
    roomManager.sendToUser(targetPeerId, envelope);
    logger.info(`[CallSignaling] Forwarded audio-call:ice-restart for call ${callId} to ${targetPeerId}`);
  }
}

/**
 * 9. audio-call:ice-restart-answer (Phase 41)
 * Relays renegotiation answer back to offerer to complete ICE restart
 */
export function handleCallIceRestartAnswer(
  socket: AuthenticatedWebSocket,
  payload: AudioCallIceRestartAnswerPayload
): void {
  const { callId, answerSdp, sdpAnswer } = payload;
  const session = activeSessions.get(callId);
  if (!session) return;

  const targetPeerId = socket.userId === session.callerId ? session.receiverId : session.callerId;
  if (targetPeerId) {
    const envelope: WsEnvelope<AudioCallIceRestartAnswerPayload> = {
      type: 'audio-call:ice-restart-answer',
      payload: {
        callId,
        chatId: session.chatId,
        callerId: session.callerId,
        receiverId: targetPeerId,
        answerSdp: answerSdp || sdpAnswer,
        sdpAnswer: answerSdp || sdpAnswer,
      },
    };
    roomManager.sendToUser(targetPeerId, envelope);
    logger.info(`[CallSignaling] Forwarded audio-call:ice-restart-answer for call ${callId} to ${targetPeerId}`);
  }
}

/**
 * 8. Socket Disconnect Hook for Active Voice Calls (Phase 39)
 * Cleans up active call sessions on socket disconnection preventing memory leaks and zombie ringing
 */
export async function handleSocketDisconnectForCalls(
  socket: AuthenticatedWebSocket
): Promise<void> {
  const userId = socket.userId;
  if (!userId) return;

  for (const [callId, session] of activeSessions.entries()) {
    if (session.callerId === userId || session.receiverId === userId) {
      if (session.status !== 'ended') {
        logger.info(`[CallSignaling] Disconnect cleanup for call ${callId} (user ${userId} disconnected)`);

        const wakeTimer = offlineWakeTimers.get(callId);
        if (wakeTimer) {
          clearTimeout(wakeTimer);
          offlineWakeTimers.delete(callId);
        }

        activeSessions.delete(callId);

        const peerId = session.callerId === userId ? session.receiverId : session.callerId;
        const duration = session.connectedAt
          ? Math.max(1, Math.floor((Date.now() - session.connectedAt.getTime()) / 1000))
          : 0;
        const status = session.status === 'connected' ? 'completed' : 'missed';

        roomManager.sendToUser(peerId, {
          type: 'audio-call:ended',
          payload: {
            callId,
            chatId: session.chatId,
            duration,
            status,
            reason: 'peer_disconnected',
          },
        });

        await recordCallOutcome(
          callId,
          session.chatId,
          session.callerId,
          session.receiverId,
          status,
          duration,
          session.startedAt
        );
      }
    }
  }
}

/**
 * 9. Deliver Pending Ringing Calls on Connect (Phase 40)
 * Forwards any pending incoming call invites to a user when their socket establishes connection
 */
export function checkPendingCallsForUser(socket: AuthenticatedWebSocket): void {
  const userId = socket.userId;
  if (!userId) return;

  for (const session of activeSessions.values()) {
    if (session.receiverId === userId && session.status === 'ringing') {
      logger.info(`[CallSignaling] Delivering pending call ${session.callId} to waking receiver ${userId}`);
      const incomingEnvelope: WsEnvelope<AudioCallIncomingPayload> = {
        type: 'audio-call:incoming',
        payload: {
          callId: session.callId,
          chatId: session.chatId,
          callerId: session.callerId,
          callerName: session.callerName,
          callerAvatar: session.callerAvatar,
          receiverId: session.receiverId,
          sdpOffer: session.sdpOffer,
          offerSdp: session.sdpOffer,
        },
      };
      socket.send(JSON.stringify(incomingEnvelope));
    }
  }
}

/**
 * 10. Handle Internal Call Rejection (Phase 40)
 * Invoked by Server #1 /api/calls/reject when a callee taps "Decline" on a mobile push notification
 */
export async function handleInternalCallReject(
  callId: string,
  reason: string = 'declined'
): Promise<boolean> {
  const timer = offlineWakeTimers.get(callId);
  if (timer) {
    clearTimeout(timer);
    offlineWakeTimers.delete(callId);
  }

  const session = activeSessions.get(callId);
  if (!session) {
    return false;
  }

  activeSessions.delete(callId);
  const rejectEnvelope: WsEnvelope<AudioCallRejectPayload> = {
    type: 'audio-call:reject',
    payload: {
      callId,
      chatId: session.chatId,
      callerId: session.callerId,
      receiverId: session.receiverId,
      reason,
    },
  };
  roomManager.sendToUser(session.callerId, rejectEnvelope);
  await recordCallOutcome(
    callId,
    session.chatId,
    session.callerId,
    session.receiverId,
    'rejected',
    0,
    session.startedAt
  );
  return true;
}
