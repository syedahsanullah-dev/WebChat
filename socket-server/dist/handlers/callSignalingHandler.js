"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallInvite = handleCallInvite;
exports.handleCallRing = handleCallRing;
exports.handleCallAccept = handleCallAccept;
exports.handleCallReject = handleCallReject;
exports.handleCallIceCandidate = handleCallIceCandidate;
exports.handleCallEnd = handleCallEnd;
const roomManager_js_1 = require("../lib/roomManager.js");
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
// In-memory active call sessions
const activeSessions = new Map();
/**
 * Helper: format seconds to "Xm Ys" or "Xs"
 */
function formatCallDuration(seconds) {
    if (seconds <= 0)
        return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0)
        return `${secs}s`;
    return `${mins}m ${secs}s`;
}
/**
 * Helper: Persist CallLog to MySQL and insert in-chat call summary message
 */
async function recordCallOutcome(callId, chatId, callerId, receiverId, status, durationSeconds, startedAt) {
    try {
        // 1. Create CallLog entry
        await prisma_js_1.prisma.callLog.create({
            data: {
                id: callId,
                chatId,
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
        }
        else if (status === 'missed') {
            badgeText = '📞 Missed voice call';
        }
        else if (status === 'rejected') {
            badgeText = '📞 Declined voice call';
        }
        else if (status === 'busy') {
            badgeText = '📞 Busy voice call';
        }
        const message = await prisma_js_1.prisma.message.create({
            data: {
                chatId,
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
        roomManager_js_1.roomManager.broadcastToRoom(`chat:${chatId}`, {
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
    }
    catch (err) {
        logger_js_1.logger.error(`[CallSignaling] Error recording call outcome: ${err.message}`);
    }
}
/**
 * 1. audio-call:invite
 * Initiated by caller. Forwards SDP offer to recipient.
 */
async function handleCallInvite(socket, payload) {
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
            const user = await prisma_js_1.prisma.user.findFirst({
                where: { username: cleanUsername },
                select: { id: true },
            });
            if (user) {
                targetReceiverId = user.id;
            }
        }
        catch (err) {
            logger_js_1.logger.debug(`Could not resolve receiverId by username: ${err.message}`);
        }
    }
    if ((!targetReceiverId || targetReceiverId === chatId || !roomManager_js_1.roomManager.isUserOnline(targetReceiverId)) && chatId) {
        try {
            const participant = await prisma_js_1.prisma.chatParticipant.findFirst({
                where: {
                    chatId,
                    userId: { not: callerId },
                },
                select: { userId: true },
            });
            if (participant) {
                targetReceiverId = participant.userId;
            }
        }
        catch (err) {
            logger_js_1.logger.debug(`Could not resolve receiverId from chat participants: ${err.message}`);
        }
    }
    // Check if receiver is online
    const isReceiverOnline = roomManager_js_1.roomManager.isUserOnline(targetReceiverId);
    if (!isReceiverOnline) {
        logger_js_1.logger.info(`[CallSignaling] Call ${callId}: Receiver ${targetReceiverId} is offline`);
        const rejectEnvelope = {
            type: 'audio-call:reject',
            payload: {
                callId,
                chatId,
                callerId,
                receiverId: targetReceiverId,
                reason: 'offline',
            },
        };
        socket.send(JSON.stringify(rejectEnvelope));
        // Record as missed call
        await recordCallOutcome(callId, chatId, callerId, targetReceiverId, 'missed', 0, new Date());
        return;
    }
    // Check if receiver is currently in another active call
    for (const session of activeSessions.values()) {
        if (session.receiverId === targetReceiverId || session.callerId === targetReceiverId) {
            if (session.status !== 'ended') {
                logger_js_1.logger.info(`[CallSignaling] Call ${callId}: Receiver ${targetReceiverId} is busy in call ${session.callId}`);
                const busyEnvelope = {
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
    const session = {
        callId,
        chatId: chatId || '',
        callerId,
        callerName: callerName || socket.username,
        callerAvatar: callerAvatar || null,
        receiverId: targetReceiverId,
        status: 'ringing',
        startedAt: new Date(),
    };
    activeSessions.set(callId, session);
    // Dispatch audio-call:incoming to receiver
    const incomingEnvelope = {
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
    roomManager_js_1.roomManager.sendToUser(targetReceiverId, incomingEnvelope);
    logger_js_1.logger.info(`[CallSignaling] Dispatched audio-call:incoming for call ${callId} to ${targetReceiverId}`);
}
/**
 * 2. audio-call:ring
 * Dispatched by receiver when ringing UI starts.
 */
function handleCallRing(socket, payload) {
    const { callId, receiverId } = payload;
    const session = activeSessions.get(callId);
    const targetCallerId = session?.callerId || payload.callerId;
    if (targetCallerId) {
        const ringEnvelope = {
            type: 'audio-call:ring',
            payload: {
                callId,
                chatId: session?.chatId || payload.chatId,
                callerId: targetCallerId,
                receiverId: receiverId || socket.userId,
            },
        };
        roomManager_js_1.roomManager.sendToUser(targetCallerId, ringEnvelope);
    }
}
/**
 * 3. audio-call:accept
 * Dispatched by receiver upon clicking Accept with answer SDP.
 */
function handleCallAccept(socket, payload) {
    const { callId, sdpAnswer, answerSdp } = payload;
    const session = activeSessions.get(callId);
    const targetCallerId = session?.callerId || payload.callerId;
    if (session) {
        session.status = 'connected';
        session.connectedAt = new Date();
    }
    if (targetCallerId) {
        const acceptedEnvelope = {
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
        roomManager_js_1.roomManager.sendToUser(targetCallerId, acceptedEnvelope);
        logger_js_1.logger.info(`[CallSignaling] Forwarded audio-call:accepted for call ${callId} to ${targetCallerId}`);
    }
}
/**
 * 4. audio-call:reject
 * Dispatched when receiver declines call.
 */
async function handleCallReject(socket, payload) {
    const { callId, reason = 'declined' } = payload;
    const session = activeSessions.get(callId);
    const targetCallerId = session?.callerId || payload.callerId;
    const chatId = session?.chatId || payload.chatId || '';
    const startedAt = session?.startedAt || new Date();
    if (session) {
        activeSessions.delete(callId);
    }
    if (targetCallerId) {
        const rejectEnvelope = {
            type: 'audio-call:reject',
            payload: {
                callId,
                chatId,
                callerId: targetCallerId,
                receiverId: socket.userId,
                reason,
            },
        };
        roomManager_js_1.roomManager.sendToUser(targetCallerId, rejectEnvelope);
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
function handleCallIceCandidate(socket, payload) {
    const { callId, candidate, receiverId } = payload;
    const session = activeSessions.get(callId);
    // Determine recipient of candidate
    let targetUserId = receiverId;
    if (!targetUserId && session) {
        targetUserId = socket.userId === session.callerId ? session.receiverId : session.callerId;
    }
    if (targetUserId && candidate) {
        const candidateEnvelope = {
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
        roomManager_js_1.roomManager.sendToUser(targetUserId, candidateEnvelope);
    }
}
/**
 * 6. audio-call:end
 * Dispatched when either participant hangs up.
 */
async function handleCallEnd(socket, payload) {
    const { callId, reason } = payload;
    const session = activeSessions.get(callId);
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
        const endedEnvelope = {
            type: 'audio-call:ended',
            payload: {
                callId,
                chatId,
                duration,
                status: duration > 0 ? 'completed' : 'missed',
                reason,
            },
        };
        roomManager_js_1.roomManager.sendToUser(remotePeerId, endedEnvelope);
    }
    // Record outcome in DB
    const outcomeStatus = duration > 0 ? 'completed' : 'missed';
    if (callerId && receiverId && chatId) {
        await recordCallOutcome(callId, chatId, callerId, receiverId, outcomeStatus, duration, startedAt);
    }
}
