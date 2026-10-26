export type UserStatus = 'online' | 'offline';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  status?: string | null;
  isOnline?: boolean;
  lastSeen?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type MessageType = 'text' | 'image' | 'voice' | 'audio';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string | Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender?: User;
  content: string;
  type: MessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  status: MessageStatus;
  replyToId?: string | null;
  replyTo?: Message | null;
  reactions?: MessageReaction[];
  isDeleted?: boolean;
  isE2EE?: boolean;
  e2eeIv?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type ChatType = 'direct' | 'group';

export type ParticipantRole = 'member' | 'admin';

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  user?: User;
  role: ParticipantRole;
  joinedAt: string | Date;
}

export interface Chat {
  id: string;
  type: ChatType;
  name?: string | null;
  avatarUrl?: string | null;
  creatorId?: string | null;
  participants: ChatParticipant[];
  messages?: Message[];
  lastMessage?: Message | null;
  unreadCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Contact {
  id: string;
  userId: string;
  contactUserId: string;
  contactUser?: User;
  alias?: string | null;
  createdAt: string | Date;
}

export type CallStatus = 'missed' | 'completed' | 'rejected' | 'busy';

export interface CallLog {
  id: string;
  callerId: string;
  caller?: User;
  receiverId: string;
  receiver?: User;
  type: 'audio';
  status: CallStatus;
  duration?: number | null;
  createdAt: string | Date;
}

export interface UserPublicKey {
  id: string;
  userId: string;
  publicKey: string;
  algorithm: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}
