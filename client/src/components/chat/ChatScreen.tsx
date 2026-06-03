import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket, connectSocket } from '../../lib/socket';
import { Message, User, FileProgress, ReplyTo } from '../../types';
import { deriveRoomKey, encrypt, decrypt } from '../../lib/crypto';
import { getFileType } from '../../lib/utils';

// Subcomponents
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { FileProgressTray } from './FileProgressTray';
import { TypingIndicator } from './TypingIndicator';
import { Sidebar } from '../sidebar/Sidebar';
import { Notification } from '../shared/Notification';
import { DropZone } from '../shared/DropZone';
import { AttachmentPicker } from '../modals/AttachmentPicker';
import { ImageViewer } from '../modals/ImageViewer';
import { QRShareModal } from '../modals/QRShareModal';

export const ChatScreen: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Route & Join parameters
  const upperCode = (roomCode || '').toUpperCase();
  const [userName, setUserName] = useState(() => sessionStorage.getItem('userName') || '');
  const [tempName, setTempName] = useState('');
  
  // Encryption
  const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);

  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [deviceCount, setDeviceCount] = useState(1);
  const [fileProgress, setFileProgress] = useState<Record<string, FileProgress>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  
  // UI States
  const [isDragging, setIsDragging] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showQRShare, setShowQRShare] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [codeMode, setCodeMode] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  // Refs for tracking files and URLs
  const pendingFiles = useRef<Record<string, any>>({});
  const fileUrls = useRef<Record<string, string>>({});
  
  const showNotif = useCallback((msg: string) => {
    setNotification(msg);
  }, []);

  const handleJoinWithTempName = () => {
    if (!tempName.trim()) {
      setError('Please enter your name');
      return;
    }
    sessionStorage.setItem('userName', tempName.trim());
    setUserName(tempName.trim());
    setError('');
  };

  // Socket Connection and Event Listeners
  useEffect(() => {
    if (!userName || !upperCode) return;

    connectSocket();

    // Derive room-specific key for E2E encryption
    deriveRoomKey(upperCode)
      .then((key) => {
        setRoomKey(key);
      })
      .catch((err) => {
        console.error('Key derivation failed:', err);
        showNotif('Encryption setup failed!');
      });

    // Helper: Decrypt encrypted messages in history
    const decryptHistory = async (history: Message[], key: CryptoKey): Promise<Message[]> => {
      return Promise.all(
        history.map(async (msg) => {
          if (msg.encrypted) {
            try {
              const decryptedText = await decrypt(key, msg.encrypted);
              return { ...msg, text: decryptedText };
            } catch (err) {
              console.error('Failed to decrypt historical message:', msg.id, err);
              return { ...msg, text: '⚠ [Decryption failed — key mismatch]' };
            }
          }
          return msg;
        })
      );
    };

    // Emit Join event
    socket.emit('join-room', upperCode, { userName }, (res: any) => {
      if (res.success) {
        setDeviceCount(res.deviceCount || 1);
        if (res.users) setUsers(res.users);
      } else {
        showNotif(res.error || 'Failed to join room');
        navigate('/');
      }
    });

    // Device events
    const handleDeviceUpdate = (data: any) => {
      if (data && typeof data.deviceCount === 'number') {
        setDeviceCount(data.deviceCount);
        showNotif(data.message || 'Device list updated');
      }
    };

    const handleUserListUpdate = (data: { users: User[] }) => {
      setUsers(data.users);
    };

    // Typing events
    const handleTypingStart = (data: { userId: string; userName: string }) => {
      if (data.userId !== socket.id) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: data.userName }));
      }
    };

    const handleTypingStop = (data: { userId: string }) => {
      setTypingUsers((prev) => {
        const copy = { ...prev };
        delete copy[data.userId];
        return copy;
      });
    };

    // File events
    const handleFileStart = (data: any) => {
      pendingFiles.current[data.fileId] = {
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        totalChunks: data.totalChunks,
        chunks: [],
        receivedChunks: 0,
      };
      setFileProgress((prev) => ({
        ...prev,
        [data.fileId]: { name: data.fileName, progress: 0 }
      }));
    };

    const handleFileChunk = (data: any) => {
      const file = pendingFiles.current[data.fileId];
      if (file) {
        file.chunks[data.chunkIndex] = data.chunk;
        file.receivedChunks++;
        const progress = Math.round((file.receivedChunks / file.totalChunks) * 100);
        setFileProgress((prev) => ({
          ...prev,
          [data.fileId]: { ...prev[data.fileId], progress }
        }));
      }
    };

    const handleFileComplete = (data: any) => {
      const file = pendingFiles.current[data.fileId];
      if (file) {
        const blob = new Blob(file.chunks, { type: file.fileType });
        const url = URL.createObjectURL(blob);
        fileUrls.current[data.fileId] = url;
        
        setMessages((prev) =>
          prev.map((msg) => (msg.id === data.fileId ? { ...msg, downloadUrl: url } : msg))
        );
        delete pendingFiles.current[data.fileId];
        setFileProgress((prev) => {
          const { [data.fileId]: _, ...rest } = prev;
          return rest;
        });
      }
    };

    // Message History
    const handleChatHistory = async (history: Message[]) => {
      // Defer history setting until key is derived
      const key = await deriveRoomKey(upperCode);
      const decryptedHistory = await decryptHistory(history, key);
      setMessages(decryptedHistory);
    };

    // Social Events: Reactions and receipts
    const handleReactionUpdate = (data: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg))
      );
    };

    const handleMessageStatusUpdate = (data: { messageId: string; status: any }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === data.messageId ? { ...msg, status: data.status } : msg))
      );
    };

    // Listeners binding
    socket.on('device-update', handleDeviceUpdate);
    socket.on('user-list-update', handleUserListUpdate);
    socket.on('typing-start', handleTypingStart);
    socket.on('typing-stop', handleTypingStop);
    
    socket.on('file-start', handleFileStart);
    socket.on('file-chunk', handleFileChunk);
    socket.on('file-complete', handleFileComplete);
    
    socket.on('chat-history', handleChatHistory);
    socket.on('reaction-update', handleReactionUpdate);
    socket.on('message-status-update', handleMessageStatusUpdate);

    return () => {
      socket.off('device-update', handleDeviceUpdate);
      socket.off('user-list-update', handleUserListUpdate);
      socket.off('typing-start', handleTypingStart);
      socket.off('typing-stop', handleTypingStop);
      socket.off('file-start', handleFileStart);
      socket.off('file-chunk', handleFileChunk);
      socket.off('file-complete', handleFileComplete);
      socket.off('chat-history', handleChatHistory);
      socket.off('reaction-update', handleReactionUpdate);
      socket.off('message-status-update', handleMessageStatusUpdate);
      socket.emit('leave-room');
    };
  }, [userName, upperCode, navigate, showNotif]);

  // Handle new incoming decrypted messages
  useEffect(() => {
    if (!roomKey) return;

    const handleNewMessage = async (message: Message) => {
      if (message.encrypted) {
        try {
          const decryptedText = await decrypt(roomKey, message.encrypted);
          message.text = decryptedText;
        } catch (err) {
          console.error('Failed to decrypt message:', err);
          message.text = '⚠ [Decryption failed]';
        }
      }

      if (message.type === 'file' && fileUrls.current[message.id]) {
        message.downloadUrl = fileUrls.current[message.id];
      }

      setMessages((prev) => [...prev, message]);

      // Emit read receipts if the message was sent by someone else
      if (message.senderId !== socket.id) {
        socket.emit('message-read', { messageId: message.id });
      }
    };

    socket.on('new-message', handleNewMessage);
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [roomKey]);

  // Quote-reply and Reactions callbacks
  const handleReply = (msg: Message) => {
    setReplyTo({
      id: msg.id,
      text: msg.text || (msg.type === 'file' ? `Shared a file: ${msg.fileName}` : 'Shared a snippet'),
      senderName: msg.senderName
    });
  };

  const handleReact = (msgId: string, emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      socket.emit('remove-reaction', { messageId: msgId, emoji });
    } else {
      socket.emit('add-reaction', { messageId: msgId, emoji });
    }
  };

  // Text / Code Sending with E2E Encryption
  const handleSendMessage = async (text: string, type: string, quote?: ReplyTo | null) => {
    if (!roomKey) {
      showNotif('Encryption key not initialized yet.');
      return;
    }

    try {
      // Encrypt the message text client-side
      const encryptedPayload = await encrypt(roomKey, text);

      const messagePayload: any = {
        senderName: userName,
        type: type,
        encrypted: encryptedPayload,
        text: `[Encrypted Message]`, // Fallback for clients without decryption
      };

      if (quote) {
        messagePayload.replyTo = quote;
      }

      if (type === 'code') {
        messagePayload.language = 'javascript'; // Default or syntax highlighted language
      }

      socket.emit('send-message', messagePayload);
    } catch (err) {
      console.error('E2E Encryption send failed:', err);
      showNotif('Encryption failed!');
    }
  };

  // File Upload Logic
  const handleFileSelect = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      try {
        const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 11);
        const CHUNK_SIZE = 64 * 1024;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const fileType = getFileType(file.name, file.type);

        socket.emit('file-start', {
          fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          totalChunks,
          isImage: fileType === 'image',
          senderName: userName,
        });

        setFileProgress((prev) => ({
          ...prev,
          [fileId]: { name: file.name, progress: 0, sending: true }
        }));

        let offset = 0;
        let chunkIndex = 0;
        const reader = new FileReader();

        const readNext = () => {
          reader.readAsArrayBuffer(file.slice(offset, offset + CHUNK_SIZE));
        };

        reader.onload = (e) => {
          try {
            socket.emit('file-chunk', {
              fileId,
              chunk: e.target!.result as ArrayBuffer,
              chunkIndex
            });
            chunkIndex++;
            offset += CHUNK_SIZE;

            setFileProgress((prev) => ({
              ...prev,
              [fileId]: {
                ...prev[fileId],
                progress: Math.min(Math.round((offset / file.size) * 100), 100)
              }
            }));

            if (offset < file.size) {
              readNext();
            } else {
              socket.emit('file-complete', {
                fileId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                isImage: fileType === 'image',
                senderName: userName,
              });

              const url = URL.createObjectURL(file);
              fileUrls.current[fileId] = url;
              
              setMessages((prev) =>
                prev.map((msg) => (msg.id === fileId ? { ...msg, downloadUrl: url } : msg))
              );
              setFileProgress((prev) => {
                const { [fileId]: _, ...rest } = prev;
                return rest;
              });
            }
          } catch (err) {
            console.error('File chunk upload error:', err);
          }
        };

        reader.onerror = () => console.error('FileReader error during upload');
        readNext();
      } catch (err) {
        console.error('File assembly initialization failed:', err);
      }
    });
  };

  const handleAttachmentSelect = ({ type, files }: { type: string; files?: File[] }) => {
    if (type === 'code') {
      setCodeMode(true);
    } else if (files) {
      handleFileSelect(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSearchResultClick = (msgId: string) => {
    const el = document.getElementById(msgId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('search-highlight');
      setTimeout(() => el.classList.remove('search-highlight'), 2000);
    }
  };

  // Render Name Input Overlay if User lands directly without username
  if (!userName) {
    return (
      <div className="app home-screen">
        <div className="home-bg" />
        <div className="home-center">
          <div className="home-card" style={{ backdropFilter: 'blur(16px)', background: 'rgba(255,255,255,0.7)' }}>
            <div className="home-logo">
              <svg className="home-logo-icon icon-pulse" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              <h1>Join Room {upperCode}</h1>
            </div>
            <p className="home-subtitle" style={{ marginBottom: '1.5rem' }}>Enter a username to join this temporary chat</p>
            <div className="home-form">
              <input
                type="text"
                className="home-input"
                placeholder="Enter your name"
                value={tempName}
                onChange={(e) => setTempName(e.target.value.slice(0, 30))}
                maxLength={30}
              />
              <button className="btn-create" onClick={handleJoinWithTempName}>
                Join Chat
              </button>
            </div>
            {error && <p className="home-error" style={{ marginTop: '1rem' }}>{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  const roomUrl = `${window.location.origin}/chat/${upperCode}`;

  return (
    <div
      className="app chat-screen"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}
    >
      <DropZone isDragging={isDragging} />
      <Notification message={notification} visible={!!notification} onClose={() => setNotification('')} />

      {/* Sidebar Panel */}
      <Sidebar
        roomCode={upperCode}
        users={users}
        deviceCount={deviceCount}
        isEncrypted={!!roomKey}
        messages={messages}
        onSearchResult={handleSearchResultClick}
        socketId={socket.id || ''}
      />

      {/* Main Chat Layout */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        <ChatHeader
          roomCode={upperCode}
          deviceCount={deviceCount}
          isTyping={Object.keys(typingUsers).length > 0}
          isEncrypted={!!roomKey}
          onCopyCode={() => {
            navigator.clipboard.writeText(upperCode);
            showNotif('Room code copied!');
          }}
          onShareQR={() => setShowQRShare(true)}
          onLeave={() => {
            socket.emit('leave-room');
            navigate('/');
          }}
        />

        {/* Message Container */}
        <MessageList
          messages={messages}
          socketId={socket.id || ''}
          onReply={handleReply}
          onReact={handleReact}
          onImageView={(url) => setViewingImage(url)}
        />

        {/* Active Typing Notification bar */}
        <TypingIndicator
          isTyping={Object.keys(typingUsers).length > 0}
          typingUsers={Object.values(typingUsers)}
        />

        {/* File Progress Trays */}
        <FileProgressTray fileProgress={fileProgress} />

        {/* Message Input Panel */}
        <InputBar
          onSendMessage={handleSendMessage}
          onAttachmentClick={() => setShowAttachmentPicker(true)}
          onTypingStart={() => socket.emit('typing-start')}
          onTypingStop={() => socket.emit('typing-stop')}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          codeMode={codeMode}
          onSetCodeMode={setCodeMode}
        />
      </div>

      {/* Modal Overlays */}
      {showAttachmentPicker && (
        <AttachmentPicker
          onSelect={handleAttachmentSelect}
          onClose={() => setShowAttachmentPicker(false)}
        />
      )}

      {showQRShare && (
        <QRShareModal
          roomCode={upperCode}
          roomUrl={roomUrl}
          onClose={() => setShowQRShare(false)}
        />
      )}

      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
        />
      )}
    </div>
  );
};

export default ChatScreen;
