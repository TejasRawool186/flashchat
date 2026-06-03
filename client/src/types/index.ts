/* ═══════════════════════════════════════════
   FlashChat — Core Type Definitions
   ═══════════════════════════════════════════ */

export interface User {
  id: string;
  name: string;
  joinedAt: number;
  publicKey?: string;
  avatarSeed?: string;
}

export interface Reaction {
  emoji: string;
  users: { id: string; name: string }[];
}

export interface ReplyTo {
  id: string;
  text: string;
  senderName: string;
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export type MessageType = 'text' | 'code' | 'file';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  text?: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  type: MessageType;
  messageType?: string;
  language?: string | null;

  // File-specific
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  downloadUrl?: string;

  // Social features
  reactions?: Reaction[];
  replyTo?: ReplyTo;
  status?: MessageStatus;

  // Link preview
  linkPreview?: LinkPreviewData;

  // Encryption
  encrypted?: EncryptedPayload;

  // Grouping (computed client-side)
  isGrouped?: boolean;
  isLastInGroup?: boolean;
  showTimestamp?: boolean;
}

export interface FileProgress {
  name: string;
  progress: number;
  sending?: boolean;
}

export interface RoomInfo {
  roomCode: string;
  deviceCount: number;
  users: User[];
  createdAt?: number;
  isEncrypted?: boolean;
}

export interface DeviceUpdateData {
  deviceCount: number;
  message: string;
  users?: User[];
}

export interface JoinRoomResponse {
  success: boolean;
  roomCode?: string;
  deviceCount?: number;
  users?: User[];
  error?: string;
}

export interface CreateRoomResponse {
  success: boolean;
  roomCode?: string;
  deviceCount?: number;
  error?: string;
}

// Encryption types
export interface EncryptedPayload {
  iv: string;       // base64 encoded IV
  ciphertext: string; // base64 encoded ciphertext
}

export interface KeyExchangeData {
  publicKey: string; // base64 encoded public key
  userId: string;
  userName: string;
}

// Socket event types
export interface ServerToClientEvents {
  'device-update': (data: DeviceUpdateData) => void;
  'new-message': (message: Message) => void;
  'typing-start': (data: { userId: string; userName: string }) => void;
  'typing-stop': (data: { userId: string }) => void;
  'file-start': (data: FileStartData) => void;
  'file-chunk': (data: FileChunkData) => void;
  'file-complete': (data: FileCompleteData) => void;
  'chat-history': (messages: Message[]) => void;
  'public-key': (data: KeyExchangeData) => void;
  'user-list-update': (data: { users: User[] }) => void;
  'reaction-update': (data: { messageId: string; reactions: Reaction[] }) => void;
  'message-status-update': (data: { messageId: string; status: MessageStatus; userId: string }) => void;
}

export interface ClientToServerEvents {
  'create-room': (callback: (res: CreateRoomResponse) => void) => void;
  'join-room': (roomCode: string, userName: string, callback: (res: JoinRoomResponse) => void) => void;
  'leave-room': () => void;
  'send-message': (data: SendMessageData) => void;
  'typing-start': () => void;
  'typing-stop': () => void;
  'file-start': (data: FileStartData) => void;
  'file-chunk': (data: FileChunkData) => void;
  'file-complete': (data: FileCompleteData) => void;
  'key-exchange': (data: KeyExchangeData) => void;
  'add-reaction': (data: { messageId: string; emoji: string }) => void;
  'remove-reaction': (data: { messageId: string; emoji: string }) => void;
  'message-read': (data: { messageId: string }) => void;
}

export interface SendMessageData {
  text: string;
  type?: MessageType;
  senderName: string;
  language?: string;
  replyTo?: ReplyTo;
  encrypted?: EncryptedPayload;
}

export interface FileStartData {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  isImage?: boolean;
  senderId?: string;
  senderName?: string;
}

export interface FileChunkData {
  fileId: string;
  chunk: ArrayBuffer;
  chunkIndex: number;
}

export interface FileCompleteData {
  fileId: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  isImage?: boolean;
  senderId?: string;
  senderName?: string;
}
