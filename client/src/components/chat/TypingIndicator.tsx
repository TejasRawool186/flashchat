import React from 'react';

interface TypingIndicatorProps {
  isTyping: boolean;
  typingUsers?: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping, typingUsers = [] }) => {
  if (!isTyping) return null;

  const getTypingText = () => {
    if (typingUsers.length === 0) return 'Someone is typing';
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing`;
    return `${typingUsers[0]}, ${typingUsers[1]} and others are typing`;
  };

  return (
    <div className="typing-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', fontSize: '0.8rem', color: 'var(--text-3)' }}>
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
};

export default TypingIndicator;
