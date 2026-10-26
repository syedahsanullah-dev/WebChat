export type UserStatus = 'online' | 'offline';

export type SystemRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  status?: string | null;
  systemRole?: SystemRole;
  isSuspended?: boolean;
  isOnline?: boolean;
  lastSeen?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type MessageType = 'text' | 'image' | 'voice' | 'audio' | 'location';

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
  latitude?: number | null;
  longitude?: number | null;
  locationAddress?: string | null;
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

export interface SystemMetricsPayload {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  uptime: number;
  activeSockets: number;
  onlineUsers: number;
  activeRooms: number;
  memory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB?: number;
  };
  db: {
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    messagesSentLast24h: number;
  };
  serverTime: string;
}

export interface StorageCategoryUsage {
  bytes: number;
  count: number;
}

export interface StorageAnalyticsPayload {
  totalBytes: number;
  totalFiles: number;
  categories: {
    avatars: StorageCategoryUsage;
    images: StorageCategoryUsage;
    voice: StorageCategoryUsage;
    docs: StorageCategoryUsage;
  };
}

export interface OrphanFileInfo {
  id: string;
  filename: string;
  relativePath: string;
  sizeBytes: number;
  category: 'avatars' | 'images' | 'voice' | 'docs';
  modifiedAt: string;
}

export interface AdminUserView {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  about?: string;
  systemRole: SystemRole;
  isSuspended: boolean;
  isOnline?: boolean;
  lastSeen?: string | Date | null;
  createdAt: string | Date;
  _count?: {
    sentMessages?: number;
    sessions?: number;
    chatParticipants?: number;
    initiatedCalls?: number;
  };
}

export type DlpAction = 'BLOCK' | 'WARN' | 'LOG';

export interface DlpRuleDefinition {
  id: string;
  name: string;
  pattern: string;
  category: string;
  action: DlpAction;
  isActive: boolean;
  matchCount: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type BroadcastSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SystemBroadcast {
  id: string;
  creatorId: string;
  severity: BroadcastSeverity;
  message: string;
  isActive: boolean;
  expiresAt?: string | Date | null;
  createdAt: string | Date;
  creator?: {
    id: string;
    username: string;
    displayName?: string;
  };
}

export interface StaticLocationPayload {
  latitude: number;
  longitude: number;
  locationAddress?: string | null;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface OutboxMessage {
  tempId: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: MessageType | string;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  replyToMessageId?: string | null;
  isE2EE?: boolean;
  e2eeIv?: string | null;
  queuedAt: number;
}

