import { Message, MessageStatus, MessageType } from './types';

export type WsEventType =
  | 'ping'
  | 'pong'
  | 'user:online'
  | 'user:offline'
  | 'typing:start'
  | 'typing:stop'
  | 'message:send'
  | 'message:new'
  | 'message:status'
  | 'message:reaction'
  | 'message:delete'
  | 'audio-call:invite'
  | 'audio-call:ring'
  | 'audio-call:accept'
  | 'audio-call:reject'
  | 'audio-call:ice-candidate'
  | 'audio-call:end';

export interface WsEnvelope<T = any> {
  type: WsEventType;
  payload: T;
}

export interface PingPayload {
  timestamp: number;
}

export interface PongPayload {
  timestamp: number;
}

export interface UserOnlinePayload {
  userId: string;
  username: string;
}

export interface UserOfflinePayload {
  userId: string;
  lastSeen: string;
}

export interface TypingPayload {
  chatId: string;
  userId: string;
  username: string;
}

export interface MessageSendPayload {
  chatId: string;
  content: string;
  type: MessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  replyToId?: string | null;
}

export interface MessageNewPayload extends Message {}

export interface MessageStatusPayload {
  messageId: string;
  chatId: string;
  status: MessageStatus;
}

export interface MessageReactionPayload {
  messageId: string;
  chatId: string;
  userId: string;
  emoji: string;
}

export interface MessageDeletePayload {
  messageId: string;
  chatId: string;
}

export interface AudioCallInvitePayload {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  receiverId: string;
}

export interface AudioCallRingPayload {
  callId: string;
  receiverId: string;
}

export interface AudioCallAcceptPayload {
  callId: string;
  receiverId: string;
  sdpOffer?: any;
  sdpAnswer?: any;
}

export interface AudioCallRejectPayload {
  callId: string;
  receiverId: string;
  reason?: string;
}

export interface AudioCallIceCandidatePayload {
  callId: string;
  candidate: any;
}

export interface AudioCallEndPayload {
  callId: string;
  duration?: number;
  reason?: string;
}
