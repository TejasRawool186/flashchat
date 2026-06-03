import React from 'react';

interface ChatHeaderProps {
  roomCode: string;
  deviceCount: number;
  isTyping: boolean;
  isEncrypted: boolean;
  onCopyCode: () => void;
  onLeave: () => void;
  onShareQR: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  roomCode,
  deviceCount,
  isTyping,
  isEncrypted,
  onCopyCode,
  onLeave,
  onShareQR
}) => {
  return (
    <header className="chat-header">
      <div className="chat-header-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Room {roomCode}</h2>
          {isEncrypted && (
            <span
              title="End-to-end encrypted room"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: '#16a34a',
                fontSize: '0.9rem',
                cursor: 'help'
              }}
            >
              🔒
            </span>
          )}
        </div>
        <div className="chat-header-sub">
          <span className="status-dot online" />
          <span>
            {deviceCount} {deviceCount === 1 ? 'device' : 'devices'} active
          </span>
          {isTyping && (
            <span className="chat-typing-label" style={{ marginLeft: '8px', color: 'var(--text-3)' }}>
              (typing...)
            </span>
          )}
        </div>
      </div>

      <div className="chat-header-actions">
        <button className="hdr-btn" onClick={onCopyCode} title="Copy Room Code">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy</span>
        </button>

        <button className="hdr-btn" onClick={onShareQR} title="Share Room via QR Code">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <line x1="7" y1="17" x2="7" y2="17.01" />
            <line x1="17" y1="7" x2="17" y2="7.01" />
            <line x1="7" y1="7" x2="7" y2="7.01" />
            <line x1="17" y1="17" x2="17" y2="17.01" />
          </svg>
          <span>Share</span>
        </button>

        <button className="hdr-btn leave" onClick={onLeave} title="Leave Room">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Leave</span>
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
