import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { MessageType, ReplyTo } from '../../types';

interface InputBarProps {
  onSendMessage: (text: string, type: MessageType, replyTo?: ReplyTo | null) => void;
  onAttachmentClick: () => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyTo: ReplyTo | null;
  onCancelReply: () => void;
  codeMode: boolean;
  onSetCodeMode: (v: boolean) => void;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  onAttachmentClick,
  onTypingStart,
  onTypingStop,
  replyTo,
  onCancelReply,
  codeMode,
  onSetCodeMode
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localTyping, setLocalTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [text, codeMode]);

  // Click outside emoji picker to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Typing start detection
    if (!localTyping && e.target.value.trim()) {
      setLocalTyping(true);
      onTypingStart();
    }

    // Reset typing stop timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setLocalTyping(false);
      onTypingStop();
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (codeMode) {
        // In code mode, Enter creates a new line
        return;
      }
      if (!e.shiftKey) {
        // Send message on Enter without Shift
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;

    onSendMessage(text, codeMode ? 'code' : 'text', replyTo);
    setText('');
    onSetCodeMode(false);
    onCancelReply();

    if (localTyping) {
      setLocalTyping(false);
      onTypingStop();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  return (
    <div className="input-bar-container" style={{ position: 'relative', width: '100%' }}>
      {/* Reply Preview Header */}
      {replyTo && (
        <div
          className="input-reply-preview"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-2)',
            padding: '8px 16px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.8rem',
            animation: 'slideUp 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Replying to {replyTo.senderName}:</span>
            <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyTo.text}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              color: 'var(--text-3)'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="input-emoji-picker"
          style={{
            position: 'absolute',
            bottom: '72px',
            left: '16px',
            zIndex: 100,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.LIGHT}
            lazyLoadEmojis={true}
          />
        </div>
      )}

      {/* Main Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="input-bar"
        style={{
          borderTopLeftRadius: replyTo ? '0' : 'var(--radius)',
          borderTopRightRadius: replyTo ? '0' : 'var(--radius)'
        }}
      >
        <button
          type="button"
          className="ib-attach"
          onClick={onAttachmentClick}
          title="Share attachment"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <button
          type="button"
          className="ib-emoji-trigger"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: 'var(--text-2)',
            display: 'grid',
            placeItems: 'center'
          }}
          title="Add emoji"
        >
          😊
        </button>

        {codeMode ? (
          <div className="ib-code-wrap" style={{ flex: 1 }}>
            <div className="ib-code-hdr">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>Code Snippet</span>
              <button
                type="button"
                className="ib-code-close"
                onClick={() => onSetCodeMode(false)}
              >
                ✕
              </button>
            </div>
            <textarea
              ref={textareaRef as any}
              placeholder="Paste your code here..."
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              className="ib-code-area"
              rows={4}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef as any}
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="ib-input"
            rows={1}
            style={{
              resize: 'none',
              maxHeight: '120px',
              fontFamily: 'inherit',
              padding: '12px',
              border: 'none',
              outline: 'none',
              background: 'none',
              width: '100%',
              fontSize: '0.95rem',
              color: 'var(--text)'
            }}
          />
        )}

        <button
          type="submit"
          className={`ib-send ${text.trim() ? 'active' : ''}`}
          disabled={!text.trim()}
          title="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default InputBar;
