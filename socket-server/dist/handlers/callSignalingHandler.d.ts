import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { AudioCallInvitePayload, AudioCallRingPayload, AudioCallAcceptPayload, AudioCallRejectPayload, AudioCallIceCandidatePayload, AudioCallEndPayload } from '../types/index.js';
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
