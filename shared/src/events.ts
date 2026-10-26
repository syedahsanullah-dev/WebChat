import { Message, MessageStatus, MessageType } from './types';

export type WsEventType =
  | 'ping'
  | 'pong'
  | 'user:online'
  | 'user:offline'
  | 'typing:start'
  | 'typing:stop'
  | 'message:send'
  | 'message:ack'
  | 'message:new'
  | 'message:read'
  | 'message:status'
  | 'message:reaction'
  | 'message:delete'
  | 'group:created'
  | 'group:member_update'
  | 'group:join'
  | 'group:leave'
  | 'audio-call:invite'
  | 'audio-call:incoming'
  | 'audio-call:ring'
  | 'audio-call:accept'
  | 'audio-call:accepted'
  | 'audio-call:reject'
  | 'audio-call:busy'
  | 'audio-call:ice-candidate'
  | 'audio-call:end'
  | 'audio-call:ended';

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
  username?: string;
}

export interface UserOfflinePayload {
  userId: string;
  lastSeen: string;
}

export interface TypingPayload {
  chatId: string;
  userId: string;
  username?: string;
}

export interface TypingStartPayload {
  chatId: string;
  recipientId?: string;
}

export interface TypingStopPayload {
  chatId: string;
  recipientId?: string;
}

export interface UserTypingStatusPayload {
  chatId: string;
  userId: string;
  username?: string;
  isTyping: boolean;
}

export interface SendMessagePayload {
  tempId?: string;
  chatId: string;
  recipientId?: string;
  content: string;
  type?: MessageType;
  messageType?: string;
  fileUrl?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mediaSize?: number | null;
  duration?: number | null;
  mediaDuration?: number | null;
  replyToId?: string | null;
  replyToMessageId?: string | null;
}

export interface MessageAckPayload {
  tempId?: string;
  messageId: string;
  chatId: string;
  createdAt: string;
  status: MessageStatus;
}

export interface MessageReadPayload {
  chatId: string;
  userId?: string;
  messageId?: string;
  messageIds?: string[];
}

export interface MessageStatusUpdatePayload {
  chatId: string;
  messageId?: string;
  status: MessageStatus;
  userId: string;
}

export interface MessageSendPayload extends SendMessagePayload {}

export interface MessageNewPayload extends Message {
  tempId?: string;
}

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
  action?: 'add' | 'remove';
}

export interface MessageDeletePayload {
  messageId: string;
  chatId: string;
  deleteType?: 'everyone' | 'forMe';
  userId?: string;
}

export interface GroupCreatedPayload {
  groupId: string;
  title: string;
  adminId: string;
  participantIds: string[];
}

export interface GroupMemberUpdatePayload {
  groupId: string;
  action: 'add' | 'remove' | 'promote' | 'demote' | 'leave';
  userId: string;
  role?: string;
  performedBy: string;
}

export interface AudioCallInvitePayload {
  callId: string;
  chatId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  receiverId: string;
  sdpOffer?: any;
  offerSdp?: any;
}

export interface AudioCallIncomingPayload {
  callId: string;
  chatId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  receiverId: string;
  sdpOffer?: any;
  offerSdp?: any;
}

export interface AudioCallRingPayload {
  callId: string;
  chatId?: string;
  callerId?: string;
  receiverId: string;
}

export interface AudioCallAcceptPayload {
  callId: string;
  chatId?: string;
  callerId?: string;
  receiverId: string;
  sdpOffer?: any;
  sdpAnswer?: any;
  answerSdp?: any;
}

export interface AudioCallAcceptedPayload {
  callId: string;
  chatId?: string;
  callerId?: string;
  receiverId: string;
  sdpAnswer?: any;
  answerSdp?: any;
}

export interface AudioCallRejectPayload {
  callId: string;
  chatId?: string;
  callerId?: string;
  receiverId: string;
  reason?: 'declined' | 'busy' | 'timeout' | 'offline' | string;
}

export interface AudioCallBusyPayload {
  callId: string;
  chatId?: string;
  callerId?: string;
  receiverId: string;
}

export interface AudioCallIceCandidatePayload {
  callId: string;
  chatId?: string;
  callerId?: string;
  senderId?: string;
  receiverId: string;
  candidate: any;
}

export interface AudioCallEndPayload {
  callId: string;
  chatId?: string;
  callerId?: string;
  receiverId: string;
  duration?: number;
  status?: 'completed' | 'missed' | 'rejected' | 'busy' | string;
  reason?: string;
}

export interface AudioCallEndedPayload {
  callId: string;
  chatId?: string;
  duration?: number;
  status?: string;
  reason?: string;
}
