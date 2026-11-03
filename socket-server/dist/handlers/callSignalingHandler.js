"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeSessions = void 0;
exports.handleCallInvite = handleCallInvite;
exports.handleCallRing = handleCallRing;
exports.handleCallAccept = handleCallAccept;
exports.handleCallReject = handleCallReject;
exports.handleCallIceCandidate = handleCallIceCandidate;
exports.handleCallEnd = handleCallEnd;
exports.handleCallMute = handleCallMute;
exports.handleCallIceRestart = handleCallIceRestart;
exports.handleCallIceRestartAnswer = handleCallIceRestartAnswer;
exports.handleSocketDisconnectForCalls = handleSocketDisconnectForCalls;
exports.checkPendingCallsForUser = checkPendingCallsForUser;
exports.handleInternalCallReject = handleInternalCallReject;
const roomManager_js_1 = require("../lib/roomManager.js");
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
// In-memory active call sessions
exports.activeSessions = new Map();
// Phase 40: Map of pending offline push wake timers (20s grace period)
const offlineWakeTimers = new Map();
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
        let resolvedChatId = chatId;
        // Hardening: Resolve or auto-create direct chat if chatId is empty to prevent foreign key violations
        if (!resolvedChatId || resolvedChatId.trim() === '') {
            try {
                const participant = await prisma_js_1.prisma.chatParticipant.findFirst({
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
                }
                else {
                    const directChat = await prisma_js_1.prisma.chat.create({
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
            }
            catch (err) {
                logger_js_1.logger.warn(`[CallSignaling] Could not auto-resolve/create direct chat for call outcome: ${err.message}`);
            }
        }
        if (!resolvedChatId) {
            logger_js_1.logger.error(`[CallSignaling] Cannot record call outcome: missing chatId for call ${callId}`);
            return;
        }
        // In-memory retry loop for Hostinger MySQL connection_limit=10 pool exhaustion resilience
        let attempts = 0;
        while (attempts < 3) {
            try {
                // 1. Create CallLog entry
                await prisma_js_1.prisma.callLog.create({
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
                }
                else if (status === 'missed') {
                    badgeText = '📞 Missed voice call';
                }
                else if (status === 'rejected') {
                    badgeText = '📞 Declined voice call';
                }
                else if (status === 'busy') {
                    badgeText = '📞 Contact busy';
                }
                const message = await prisma_js_1.prisma.message.create({
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
                roomManager_js_1.roomManager.broadcastToRoom(`chat:${resolvedChatId}`, {
                    type: 'message:new',
                    payload: {
                        id: message.id,
                        chatId: message.chatId,
                        senderId: message.senderId,
                        content: message.content,
                        messageType: message.messageType,
                        type: message.messageType,
                        status: 'sent',
                        createdAt: message.createdAt instanceof Date
                            ? message.createdAt.toISOString()
                            : message.createdAt
                                ? String(message.createdAt)
                                : new Date().toISOString(),
                        sender: message.sender || null,
                    },
                });
                break;
            }
            catch (err) {
                attempts++;
                if (attempts >= 3) {
                    throw err;
                }
                await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempts)));
            }
        }
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
        logger_js_1.logger.info(`[CallSignaling] Call ${callId}: Receiver ${targetReceiverId} is offline, attempting high-priority push`);
        // Register session in activeSessions in 'ringing' status with sdpOffer
        const offlineSession = {
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
        exports.activeSessions.set(callId, offlineSession);
        // Send audio-call:ring to caller so their outgoing call screen transitions to ringing
        const ringEnvelope = {
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
            logger_js_1.logger.warn(`[CallSignaling] Offline call push dispatch failed: ${err.message}`);
        });
        // 20-second grace window for the callee device to wake up and connect
        const wakeTimer = setTimeout(async () => {
            offlineWakeTimers.delete(callId);
            const currentSession = exports.activeSessions.get(callId);
            if (currentSession && currentSession.status === 'ringing') {
                logger_js_1.logger.info(`[CallSignaling] Call ${callId}: 20s offline wake window expired for ${targetReceiverId}`);
                exports.activeSessions.delete(callId);
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
                roomManager_js_1.roomManager.sendToUser(callerId, rejectEnvelope);
                await recordCallOutcome(callId, chatId, callerId, targetReceiverId, 'missed', 0, currentSession.startedAt);
            }
        }, 20000);
        offlineWakeTimers.set(callId, wakeTimer);
        return;
    }
    // Check if receiver is currently in another active call
    for (const session of exports.activeSessions.values()) {
        if (session.status !== 'ended') {
            // 1. Detect simultaneous dialing (Glare condition) between caller and targetReceiver
            if (session.callerId === targetReceiverId && session.receiverId === callerId && session.status === 'ringing') {
                logger_js_1.logger.info(`[CallSignaling] Glare detected between ${callerId} and ${targetReceiverId}`);
                // RFC 8829 tie-breaker: compare callerId and targetReceiverId lexicographically
                // Smaller ID is polite and yields; larger ID wins and proceeds
                const isCurrentCallerPolite = callerId < targetReceiverId;
                if (isCurrentCallerPolite) {
                    logger_js_1.logger.info(`[CallSignaling] Caller ${callerId} is polite and yields to ${targetReceiverId}`);
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
                    return;
                }
                else {
                    logger_js_1.logger.info(`[CallSignaling] Caller ${callerId} wins tie-breaker over ${targetReceiverId}`);
                    exports.activeSessions.delete(session.callId);
                    roomManager_js_1.roomManager.sendToUser(targetReceiverId, {
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
        sdpOffer: sdp,
    };
    exports.activeSessions.set(callId, session);
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
    const session = exports.activeSessions.get(callId);
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
    const session = exports.activeSessions.get(callId);
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
    roomManager_js_1.roomManager.sendToUser(socket.userId, {
        type: 'audio-call:answered_elsewhere',
        payload: {
            callId,
            chatId: session?.chatId || payload.chatId,
        },
    }, socket);
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
/**
 * 4. audio-call:reject
 * Dispatched when receiver declines call.
 */
async function handleCallReject(socket, payload) {
    const { callId, reason = 'declined' } = payload;
    let session = exports.activeSessions.get(callId);
    if (!session) {
        for (const s of exports.activeSessions.values()) {
            if (s.callerId === socket.userId || s.receiverId === socket.userId) {
                session = s;
                break;
            }
        }
    }
    const effectiveCallId = session?.callId || callId;
    // Clear any pending offline wake timer
    const wakeTimer = offlineWakeTimers.get(effectiveCallId);
    if (wakeTimer) {
        clearTimeout(wakeTimer);
        offlineWakeTimers.delete(effectiveCallId);
    }
    // If call is already connected, ignore late rejection envelopes from secondary tabs
    if (session && session.status === 'connected') {
        logger_js_1.logger.warn(`[CallSignaling] Ignoring reject envelope for already connected call ${effectiveCallId}`);
        return;
    }
    let targetCallerId = session?.callerId || payload.callerId;
    const chatId = session?.chatId || payload.chatId || '';
    const startedAt = session?.startedAt || new Date();
    // Resolve targetCallerId if username
    if (targetCallerId && (targetCallerId.startsWith('@') || targetCallerId.length < 15 || !roomManager_js_1.roomManager.isUserOnline(targetCallerId))) {
        try {
            const cleanUsername = targetCallerId.replace(/^@/, '');
            const user = await prisma_js_1.prisma.user?.findFirst({
                where: { username: cleanUsername },
                select: { id: true },
            });
            if (user) {
                targetCallerId = user.id;
            }
        }
        catch (err) {
            logger_js_1.logger.debug(`Could not resolve targetCallerId by username: ${err.message}`);
        }
    }
    if (session) {
        exports.activeSessions.delete(session.callId);
    }
    if (callId) {
        exports.activeSessions.delete(callId);
    }
    if (targetCallerId) {
        const rejectEnvelope = {
            type: 'audio-call:reject',
            payload: {
                callId: effectiveCallId,
                chatId,
                callerId: targetCallerId,
                receiverId: socket.userId,
                reason,
            },
        };
        roomManager_js_1.roomManager.sendToUser(targetCallerId, rejectEnvelope);
        logger_js_1.logger.info(`[CallSignaling] Dispatched audio-call:reject immediately to caller ${targetCallerId} for call ${effectiveCallId}`);
    }
    const status = reason === 'busy' ? 'busy' : reason === 'timeout' ? 'missed' : 'rejected';
    if (targetCallerId && chatId) {
        await recordCallOutcome(effectiveCallId, chatId, targetCallerId, socket.userId, status, 0, startedAt);
    }
}
/**
 * 5. audio-call:ice-candidate
 * Relays ICE candidate between caller and receiver.
 */
function handleCallIceCandidate(socket, payload) {
    const { callId, candidate, receiverId } = payload;
    const session = exports.activeSessions.get(callId);
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
    let session = exports.activeSessions.get(callId);
    // If session not found by callId, fallback to searching for active session involving this socket
    if (!session) {
        for (const s of exports.activeSessions.values()) {
            if (s.callerId === socket.userId || s.receiverId === socket.userId) {
                session = s;
                break;
            }
        }
    }
    const effectiveCallId = session?.callId || callId;
    // Clear any pending offline wake timer
    const wakeTimer = offlineWakeTimers.get(effectiveCallId);
    if (wakeTimer) {
        clearTimeout(wakeTimer);
        offlineWakeTimers.delete(effectiveCallId);
    }
    let callerId = session?.callerId || payload.callerId || socket.userId;
    let receiverId = session?.receiverId || payload.receiverId || '';
    const chatId = session?.chatId || payload.chatId || '';
    const startedAt = session?.startedAt || new Date();
    // Resolve callerId if it's a username or starts with @
    if (callerId && (callerId.startsWith('@') || callerId.length < 15 || !roomManager_js_1.roomManager.isUserOnline(callerId))) {
        try {
            const cleanUsername = callerId.replace(/^@/, '');
            const user = await prisma_js_1.prisma.user?.findFirst({
                where: { username: cleanUsername },
                select: { id: true },
            });
            if (user) {
                callerId = user.id;
            }
        }
        catch (err) {
            logger_js_1.logger.debug(`Could not resolve callerId by username in handleCallEnd: ${err.message}`);
        }
    }
    // Resolve receiverId if it's a username or starts with @
    if (receiverId && (receiverId.startsWith('@') || receiverId.length < 15 || !roomManager_js_1.roomManager.isUserOnline(receiverId))) {
        try {
            const cleanUsername = receiverId.replace(/^@/, '');
            const user = await prisma_js_1.prisma.user?.findFirst({
                where: { username: cleanUsername },
                select: { id: true },
            });
            if (user) {
                receiverId = user.id;
            }
        }
        catch (err) {
            logger_js_1.logger.debug(`Could not resolve receiverId by username in handleCallEnd: ${err.message}`);
        }
    }
    // Fallback to chat participant if receiverId is missing/offline
    if ((!receiverId || !roomManager_js_1.roomManager.isUserOnline(receiverId)) && chatId) {
        try {
            const participant = await prisma_js_1.prisma.chatParticipant.findFirst({
                where: {
                    chatId,
                    userId: { not: callerId },
                },
                select: { userId: true },
            });
            if (participant) {
                receiverId = participant.userId;
            }
        }
        catch (err) {
            logger_js_1.logger.debug(`Could not resolve receiverId from chat participants in handleCallEnd: ${err.message}`);
        }
    }
    // Calculate duration
    let duration = payload.duration || 0;
    if (!duration && session?.connectedAt) {
        duration = Math.max(1, Math.floor((Date.now() - session.connectedAt.getTime()) / 1000));
    }
    // Identify remote peer to notify
    const remotePeerId = socket.userId === callerId ? receiverId : callerId;
    if (session) {
        exports.activeSessions.delete(session.callId);
    }
    if (callId) {
        exports.activeSessions.delete(callId);
    }
    // Notify remote peer immediately
    if (remotePeerId) {
        const endedEnvelope = {
            type: 'audio-call:ended',
            payload: {
                callId: effectiveCallId,
                chatId,
                duration,
                status: duration > 0 ? 'completed' : 'missed',
                reason,
            },
        };
        roomManager_js_1.roomManager.sendToUser(remotePeerId, endedEnvelope);
        logger_js_1.logger.info(`[CallSignaling] Dispatched audio-call:ended immediately to peer ${remotePeerId} for call ${effectiveCallId}`);
    }
    // Record outcome in DB
    const outcomeStatus = duration > 0 ? 'completed' : 'missed';
    if (callerId && receiverId && chatId) {
        await recordCallOutcome(effectiveCallId, chatId, callerId, receiverId, outcomeStatus, duration, startedAt);
    }
}
/**
 * 7. audio-call:mute / audio-call:unmute
 * Relays peer microphone mute state
 */
function handleCallMute(socket, payload) {
    const { callId, isMuted } = payload;
    const session = exports.activeSessions.get(callId);
    if (!session)
        return;
    const targetPeerId = socket.userId === session.callerId ? session.receiverId : session.callerId;
    if (targetPeerId) {
        const muteEnvelope = {
            type: 'audio-call:mute',
            payload: {
                callId,
                chatId: session.chatId,
                userId: socket.userId,
                isMuted: Boolean(isMuted),
            },
        };
        roomManager_js_1.roomManager.sendToUser(targetPeerId, muteEnvelope);
    }
}
/**
 * 8. audio-call:ice-restart (Phase 41)
 * Relays renegotiation offer with ICE restart flag to remote peer during network handover
 */
function handleCallIceRestart(socket, payload) {
    const { callId, offerSdp, sdpOffer } = payload;
    const session = exports.activeSessions.get(callId);
    if (!session)
        return;
    const targetPeerId = socket.userId === session.callerId ? session.receiverId : session.callerId;
    if (targetPeerId) {
        const envelope = {
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
        roomManager_js_1.roomManager.sendToUser(targetPeerId, envelope);
        logger_js_1.logger.info(`[CallSignaling] Forwarded audio-call:ice-restart for call ${callId} to ${targetPeerId}`);
    }
}
/**
 * 9. audio-call:ice-restart-answer (Phase 41)
 * Relays renegotiation answer back to offerer to complete ICE restart
 */
function handleCallIceRestartAnswer(socket, payload) {
    const { callId, answerSdp, sdpAnswer } = payload;
    const session = exports.activeSessions.get(callId);
    if (!session)
        return;
    const targetPeerId = socket.userId === session.callerId ? session.receiverId : session.callerId;
    if (targetPeerId) {
        const envelope = {
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
        roomManager_js_1.roomManager.sendToUser(targetPeerId, envelope);
        logger_js_1.logger.info(`[CallSignaling] Forwarded audio-call:ice-restart-answer for call ${callId} to ${targetPeerId}`);
    }
}
/**
 * 8. Socket Disconnect Hook for Active Voice Calls (Phase 39)
 * Cleans up active call sessions on socket disconnection preventing memory leaks and zombie ringing
 */
async function handleSocketDisconnectForCalls(socket) {
    const userId = socket.userId;
    if (!userId)
        return;
    for (const [callId, session] of exports.activeSessions.entries()) {
        if (session.callerId === userId || session.receiverId === userId) {
            if (session.status !== 'ended') {
                logger_js_1.logger.info(`[CallSignaling] Disconnect cleanup for call ${callId} (user ${userId} disconnected)`);
                const wakeTimer = offlineWakeTimers.get(callId);
                if (wakeTimer) {
                    clearTimeout(wakeTimer);
                    offlineWakeTimers.delete(callId);
                }
                exports.activeSessions.delete(callId);
                const peerId = session.callerId === userId ? session.receiverId : session.callerId;
                const duration = session.connectedAt
                    ? Math.max(1, Math.floor((Date.now() - session.connectedAt.getTime()) / 1000))
                    : 0;
                const status = session.status === 'connected' ? 'completed' : 'missed';
                roomManager_js_1.roomManager.sendToUser(peerId, {
                    type: 'audio-call:ended',
                    payload: {
                        callId,
                        chatId: session.chatId,
                        duration,
                        status,
                        reason: 'peer_disconnected',
                    },
                });
                await recordCallOutcome(callId, session.chatId, session.callerId, session.receiverId, status, duration, session.startedAt);
            }
        }
    }
}
/**
 * 9. Deliver Pending Ringing Calls on Connect (Phase 40)
 * Forwards any pending incoming call invites to a user when their socket establishes connection
 */
function checkPendingCallsForUser(socket) {
    const userId = socket.userId;
    if (!userId)
        return;
    for (const session of exports.activeSessions.values()) {
        if (session.receiverId === userId && session.status === 'ringing') {
            logger_js_1.logger.info(`[CallSignaling] Delivering pending call ${session.callId} to waking receiver ${userId}`);
            const incomingEnvelope = {
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
async function handleInternalCallReject(callId, reason = 'declined') {
    const timer = offlineWakeTimers.get(callId);
    if (timer) {
        clearTimeout(timer);
        offlineWakeTimers.delete(callId);
    }
    const session = exports.activeSessions.get(callId);
    if (!session) {
        return false;
    }
    exports.activeSessions.delete(callId);
    const rejectEnvelope = {
        type: 'audio-call:reject',
        payload: {
            callId,
            chatId: session.chatId,
            callerId: session.callerId,
            receiverId: session.receiverId,
            reason,
        },
    };
    roomManager_js_1.roomManager.sendToUser(session.callerId, rejectEnvelope);
    await recordCallOutcome(callId, session.chatId, session.callerId, session.receiverId, 'rejected', 0, session.startedAt);
    return true;
}
