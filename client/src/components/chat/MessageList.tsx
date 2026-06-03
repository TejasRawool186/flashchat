import React, { useRef, useEffect, useState } from 'react';
import { Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { processMessagesWithGrouping } from '../../lib/utils';

interface MessageListProps {
  messages: Message[];
  socketId: string;
  onReply: (msg: Message) => void;
  onReact: (msgId: string, emoji: string, hasReacted: boolean) => void;
  onImageView: (url: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  socketId,
  onReply,
  onReact,
  onImageView
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMessagesCount, setPrevMessagesCount] = useState(messages.length);

  const processedMessages = processMessagesWithGrouping(messages);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
    setShowScrollBtn(false);
    setUnreadCount(0);
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  // Handle scroll events to show/hide the scroll-to-bottom button
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    // Show button if user scrolls up more than 150px
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    setShowScrollBtn(!isNearBottom);
    
    if (isNearBottom) {
      setUnreadCount(0);
    }
  };

  // Auto-scroll when new messages arrive if already at the bottom, or increase unread count
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const isNewMessage = messages.length > prevMessagesCount;
    setPrevMessagesCount(messages.length);

    if (isNewMessage) {
      const lastMessage = messages[messages.length - 1];
      const isSelf = lastMessage.senderId === socketId;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;

      if (isSelf || isNearBottom) {
        // Auto-scroll for own messages or if already near bottom
        setTimeout(() => scrollToBottom('smooth'), 50);
      } else {
        // Increment unread count for others' messages if scrolled up
        setUnreadCount((prev) => prev + 1);
      }
    }
  }, [messages, socketId, prevMessagesCount]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        className="messages"
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {processedMessages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <div className="empty-title">Welcome to FlashChat</div>
            <div className="empty-hint">Your messages are end-to-end encrypted and will disappear when the room expires.</div>
          </div>
        ) : (
          processedMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSelf={msg.senderId === socketId}
              onReply={onReply}
              onReact={onReact}
              onImageView={onImageView}
              socketId={socketId}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollBtn && (
        <button
          className="scroll-btn"
          onClick={() => scrollToBottom('smooth')}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            zIndex: 10,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          ↓ {unreadCount > 0 ? `${unreadCount} new` : 'Latest'}
        </button>
      )}
    </div>
  );
};

export default MessageList;
