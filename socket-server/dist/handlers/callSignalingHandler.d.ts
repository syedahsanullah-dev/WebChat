import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { AudioCallInvitePayload, AudioCallRingPayload, AudioCallAcceptPayload, AudioCallRejectPayload, AudioCallIceCandidatePayload, AudioCallEndPayload, AudioCallMutePayload, AudioCallIceRestartPayload, AudioCallIceRestartAnswerPayload } from '../types/index.js';
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
export declare const activeSessions: Map<string, ActiveCallSession>;
/**
 * 1. audio-call:invite
 * Initiated by caller. Forwards SDP offer to recipient.
 */
export declare function handleCallInvite(socket: AuthenticatedWebSocket, payload: AudioCallInvitePayload): Promise<void>;
/**
 * 2. audio-call:ring
 * Dispatched by receiver when ringing UI starts.
 */
export declare function handleCallRing(socket: AuthenticatedWebSocket, payload: AudioCallRingPayload): void;
/**
 * 3. audio-call:accept
 * Dispatched by receiver upon clicking Accept with answer SDP.
 */
export declare function handleCallAccept(socket: AuthenticatedWebSocket, payload: AudioCallAcceptPayload): void;
/**
 * 4. audio-call:reject
 * Dispatched when receiver declines call.
 */
/**
 * 4. audio-call:reject
 * Dispatched when receiver declines call.
 */
export declare function handleCallReject(socket: AuthenticatedWebSocket, payload: AudioCallRejectPayload): Promise<void>;
/**
 * 5. audio-call:ice-candidate
 * Relays ICE candidate between caller and receiver.
 */
export declare function handleCallIceCandidate(socket: AuthenticatedWebSocket, payload: AudioCallIceCandidatePayload): void;
/**
 * 6. audio-call:end
 * Dispatched when either participant hangs up.
 */
export declare function handleCallEnd(socket: AuthenticatedWebSocket, payload: AudioCallEndPayload): Promise<void>;
/**
 * 7. audio-call:mute / audio-call:unmute
 * Relays peer microphone mute state
 */
export declare function handleCallMute(socket: AuthenticatedWebSocket, payload: AudioCallMutePayload): void;
/**
 * 8. audio-call:ice-restart (Phase 41)
 * Relays renegotiation offer with ICE restart flag to remote peer during network handover
 */
export declare function handleCallIceRestart(socket: AuthenticatedWebSocket, payload: AudioCallIceRestartPayload): void;
/**
 * 9. audio-call:ice-restart-answer (Phase 41)
 * Relays renegotiation answer back to offerer to complete ICE restart
 */
export declare function handleCallIceRestartAnswer(socket: AuthenticatedWebSocket, payload: AudioCallIceRestartAnswerPayload): void;
/**
 * 8. Socket Disconnect Hook for Active Voice Calls (Phase 39)
 * Cleans up active call sessions on socket disconnection preventing memory leaks and zombie ringing
 */
export declare function handleSocketDisconnectForCalls(socket: AuthenticatedWebSocket): Promise<void>;
/**
 * 9. Deliver Pending Ringing Calls on Connect (Phase 40)
 * Forwards any pending incoming call invites to a user when their socket establishes connection
 */
export declare function checkPendingCallsForUser(socket: AuthenticatedWebSocket): void;
/**
 * 10. Handle Internal Call Rejection (Phase 40)
 * Invoked by Server #1 /api/calls/reject when a callee taps "Decline" on a mobile push notification
 */
export declare function handleInternalCallReject(callId: string, reason?: string): Promise<boolean>;
export {};
