import React, { useState } from 'react';
import { Reaction } from '../../types';

interface ReactionBarProps {
  messageId: string;
  reactions?: Reaction[];
  onReact: (msgId: string, emoji: string, hasReacted: boolean) => void;
  socketId: string;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ReactionBar: React.FC<ReactionBarProps> = ({
  messageId,
  reactions = [],
  onReact,
  socketId
}) => {
  const [showQuickBar, setShowQuickBar] = useState(false);

  const hasUserReacted = (reaction: Reaction) => {
    return reaction.users.some(u => u.id === socketId);
  };

  const handleEmojiClick = (emoji: string, reacted: boolean) => {
    onReact(messageId, emoji, reacted);
    setShowQuickBar(false);
  };

  return (
    <div
      className="reaction-bar-container"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '4px',
        marginTop: '4px',
        position: 'relative'
      }}
      onMouseEnter={() => setShowQuickBar(true)}
      onMouseLeave={() => setShowQuickBar(false)}
    >
      {/* Existing Reaction Badges */}
      {reactions.map((r) => {
        const reacted = hasUserReacted(r);
        return (
          <button
            key={r.emoji}
            className={`reaction-badge ${reacted ? 'active' : ''}`}
            onClick={() => handleEmojiClick(r.emoji, reacted)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '12px',
              border: reacted ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: reacted ? 'var(--bg-3)' : 'var(--bg-2)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            <span>{r.emoji}</span>
            <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{r.users.length}</span>
          </button>
        );
      })}

      {/* Trigger button for adding reaction */}
      <button
        className="add-reaction-btn"
        onClick={() => setShowQuickBar(!showQuickBar)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          fontSize: '0.8rem',
          transition: 'all 0.2s'
        }}
        title="React to message"
      >
        ＋
      </button>

      {/* Quick Reaction Bar Popover */}
      {showQuickBar && (
        <div
          className="quick-reaction-popover"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '0',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '4px 8px',
            display: 'flex',
            gap: '6px',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {QUICK_EMOJIS.map((emoji) => {
            const r = reactions.find((react) => react.emoji === emoji);
            const reacted = r ? hasUserReacted(r) : false;
            return (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji, reacted)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                  transition: 'transform 0.1s'
                }}
                className="quick-emoji-option"
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReactionBar;
