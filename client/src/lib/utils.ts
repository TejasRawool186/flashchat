/* ═══════════════════════════════════════════
   FlashChat — Utility Functions
   ═══════════════════════════════════════════ */

export const getFileType = (fileName?: string, mimeType?: string): string => {
  if (!fileName) return 'default';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (mimeType?.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  return 'default';
};

export const getFileIcon = (type: string): string => {
  const icons: Record<string, string> = {
    pdf: '📄', doc: '📝', ppt: '📊', zip: '📦',
    image: '🖼️', video: '🎬', default: '📎',
  };
  return icons[type] || icons.default;
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const formatTime = (timestamp?: string): string => {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/**
 * Detect URLs in text and return an array of parts.
 * URL parts are objects { type: 'url', text }, plain text parts are { type: 'text', text }.
 */
export interface TextPart {
  type: 'text' | 'url';
  text: string;
}

export const parseTextWithUrls = (text: string): TextPart[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/\S+)/g;
  const parts: TextPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'url', text: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: text.slice(lastIndex) });
  }
  return parts;
};

/**
 * Extract URLs from text for link preview fetching
 */
export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/\S+)/g;
  return text.match(urlRegex) || [];
};

/**
 * Group consecutive messages from the same sender
 */
import type { Message } from '../types';

export const processMessagesWithGrouping = (messages: Message[]): Message[] => {
  if (!Array.isArray(messages)) return [];
  return messages.map((msg, i) => {
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;
    const sameAsPrev = prev &&
      prev.senderId === msg.senderId &&
      (new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime()) < 120000;
    const sameAsNext = next &&
      next.senderId === msg.senderId &&
      (new Date(next.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 120000;
    return {
      ...msg,
      isGrouped: !!sameAsPrev,
      isLastInGroup: !sameAsNext,
      showTimestamp: !sameAsNext || !sameAsPrev,
    };
  });
};

/**
 * Validate incoming message structure
 */
export const isValidMessage = (msg: unknown): msg is Message => {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return typeof m.id === 'string' && typeof m.timestamp === 'string';
};

/**
 * Generate a unique ID for messages/files
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

/**
 * Generate avatar URL using DiceBear API
 */
export const getAvatarUrl = (seed: string, style: string = 'bottts-neutral'): string => {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=40`;
};

/**
 * Sanitize text input - basic HTML entity encoding
 * (Full sanitization handled by DOMPurify in components)
 */
export const sanitizeText = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Truncate text to a max length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
};
