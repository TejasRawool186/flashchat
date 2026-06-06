import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Message } from '../../types';
import { Avatar } from '../shared/Avatar';
import { ReactionBar } from './ReactionBar';
import { getFileType, getFileIcon, formatFileSize, formatTime } from '../../lib/utils';
import { LinkPreview } from './LinkPreview';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  onReply: (msg: Message) => void;
  onReact: (msgId: string, emoji: string, hasReacted: boolean) => void;
  onImageView: (url: string) => void;
  socketId: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  onReply,
  onReact,
  onImageView,
  socketId
}) => {
  const isCode = message.type === 'code' || message.messageType === 'code';
  const isFile = message.type === 'file';
  const isImage = isFile && getFileType(message.fileName, message.fileType) === 'image';

  const renderStatus = () => {
    if (!isSelf || !message.status) return null;
    
    switch (message.status) {
      case 'sending':
        return <span className="msg-status sending" style={{ opacity: 0.5 }}>◷</span>;
      case 'sent':
        return <span className="msg-status sent" title="Sent">✓</span>;
      case 'delivered':
        return <span className="msg-status delivered" title="Delivered">✓✓</span>;
      case 'read':
        return <span className="msg-status read" style={{ color: '#0284c7' }} title="Read">✓✓</span>;
      default:
        return null;
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const renderMessageContent = () => {
    if (isCode) {
      const codeString = message.text || '';
      return (
        <div className="code-msg-container" style={{ borderRadius: '8px', overflow: 'hidden', margin: '4px 0' }}>
          <div
            className="code-hdr"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#2d3748',
              color: '#e2e8f0',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <span>{message.language || 'CODE'}</span>
            <button
              onClick={() => handleCopyCode(codeString)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter
            language={message.language || 'javascript'}
            style={oneDark}
            customStyle={{ margin: 0, padding: '12px', fontSize: '0.85rem' }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    if (isImage && message.downloadUrl) {
      return (
        <div
          className="img-msg"
          onClick={() => onImageView(message.downloadUrl!)}
          style={{ cursor: 'pointer', position: 'relative', borderRadius: '12px', overflow: 'hidden' }}
        >
          <img
            src={message.downloadUrl}
            alt={message.fileName || 'Shared Image'}
            loading="lazy"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '300px', objectFit: 'cover' }}
          />
          <div className="img-overlay">
            <span className="img-name">{message.fileName}</span>
            <a
              href={message.downloadUrl}
              download={message.fileName}
              onClick={(e) => e.stopPropagation()}
              className="img-dl"
              title="Download image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      );
    }

    if (isFile) {
      return (
        <div className="file-msg">
          <div className="file-icon">
            {getFileIcon(getFileType(message.fileName, message.fileType))}
          </div>
          <div className="file-info" style={{ flex: 1, minWidth: 0 }}>
            <div className="file-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {message.fileName}
            </div>
            <div className="file-size" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              {formatFileSize(message.fileSize)}
            </div>
          </div>
          {message.downloadUrl && (
            <a href={message.downloadUrl} download={message.fileName} className="file-dl" title="Download file">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          )}
        </div>
      );
    }

    // Default text message with Markdown rendering
    const text = message.text || '';
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    const firstUrl = urlMatch ? urlMatch[0] : null;

    return (
      <div className="msg-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {text}
        </ReactMarkdown>
        {firstUrl && <LinkPreview url={firstUrl} />}
      </div>
    );
  };

  return (
    <div className={`message ${isSelf ? 'sent' : 'received'} ${message.isGrouped ? 'grouped' : ''}`}>
      {/* Show Avatar for other users, only if not grouped */}
      {!isSelf && !message.isGrouped && (
        <Avatar name={message.senderName} size={32} className="msg-avatar" />
      )}
      
      {/* Spacer to align grouped received messages */}
      {!isSelf && message.isGrouped && <div style={{ width: '32px', flexShrink: 0 }} />}

      <div className="msg-bubble-wrap" style={{ maxWidth: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Sender name for received, first message in group */}
        {!isSelf && !message.isGrouped && (
          <span className="msg-sender-name" style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '2px', marginLeft: '4px' }}>
            {message.senderName}
          </span>
        )}

        <div
          className="msg-bubble"
          style={{
            position: 'relative',
            padding: isImage ? '0' : undefined,
            overflow: isImage ? 'hidden' : undefined,
            background: isImage ? 'none' : undefined,
            border: isImage ? 'none' : undefined,
            boxShadow: isImage ? 'none' : undefined
          }}
        >
          {/* Quoted Reply Preview */}
          {message.replyTo && (
            <div
              className="msg-reply-quoted"
              style={{
                borderLeft: '3px solid var(--accent)',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.05)',
                fontSize: '0.8rem',
                borderRadius: '4px',
                marginBottom: '6px',
                opacity: 0.85
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{message.replyTo.senderName}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.replyTo.text}
              </div>
            </div>
          )}

          {/* Actual content */}
          {renderMessageContent()}

          {/* Hover Reply Button */}
          <button
            className="msg-reply-btn"
            onClick={() => onReply(message)}
            title="Reply"
            style={{
              position: 'absolute',
              top: '50%',
              [isSelf ? 'left' : 'right']: '-36px',
              transform: 'translateY(-50%)',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: 0,
              transition: 'opacity 0.2s',
              zIndex: 5
            }}
          >
            ↩
          </button>
        </div>

        {/* Reaction Bar */}
        <ReactionBar
          messageId={message.id}
          reactions={message.reactions}
          onReact={onReact}
          socketId={socketId}
        />

        {/* Metadata: Timestamp & Status Checkmark */}
        {message.showTimestamp && (
          <div className="msg-meta" style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span className="msg-time">{formatTime(message.timestamp)}</span>
            {renderStatus()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
