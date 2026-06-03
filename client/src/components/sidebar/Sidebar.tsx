import React, { useState } from 'react';
import { User, Message } from '../../types';
import { Avatar } from '../shared/Avatar';

interface SidebarProps {
  roomCode: string;
  users: User[];
  deviceCount: number;
  isEncrypted: boolean;
  messages: Message[];
  onSearchResult: (msgId: string) => void;
  socketId: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  roomCode,
  users,
  deviceCount,
  isEncrypted,
  messages,
  onSearchResult,
  socketId
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  // Filter messages for search
  const searchResults = searchQuery.trim()
    ? messages.filter(
        (m) =>
          (m.type === 'text' || m.type === 'code') &&
          m.text &&
          m.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sidebar Header */}
      <div className="sb-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <div className="sb-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg
            className="home-logo-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span className="sb-title" style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
            FlashChat
          </span>
        </div>
      </div>

      {/* Room Info Panel */}
      <div
        className="sb-info-panel"
        style={{
          padding: '16px',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600 }}>ROOM CODE</span>
          <button
            onClick={handleCopyCode}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.75rem',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 600,
              padding: 0
            }}
          >
            Copy
          </button>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.05em' }}>{roomCode}</div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-2)' }}>
          <span>{isEncrypted ? '🔒 End-to-end encrypted' : '🔓 Unencrypted'}</span>
        </div>
      </div>

      {/* Users List Section */}
      <div
        className="sb-users-section"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-3)', letterSpacing: '0.05em' }}>
          ACTIVE DEVICES ({users.length})
        </h4>
        <div className="sb-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {users.map((u) => {
            const isMe = u.id === socketId;
            return (
              <div
                key={u.id}
                className="sb-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px',
                  borderRadius: '8px',
                  background: isMe ? 'var(--bg-3)' : 'transparent'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar name={u.name} size={32} />
                  <span
                    className="status-dot online"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      border: '2px solid var(--bg)',
                      width: '8px',
                      height: '8px'
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {u.name} {isMe && <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 400 }}>(You)</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message Search Section */}
      <div className="sb-search-section" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)', letterSpacing: '0.05em' }}>
          SEARCH MESSAGES
        </h4>
        <input
          type="text"
          className="sb-search"
          placeholder="Search chat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-2)',
            fontSize: '0.85rem'
          }}
        />

        {searchQuery.trim() && (
          <div
            className="sb-search-results"
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              marginTop: '4px',
              background: 'var(--bg)'
            }}
          >
            <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
              {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
            </div>
            {searchResults.map((m) => (
              <div
                key={m.id}
                onClick={() => onSearchResult(m.id)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.2s',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                className="sb-search-result-item"
              >
                <span style={{ fontWeight: 600 }}>{m.senderName}: </span>
                <span>{m.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
