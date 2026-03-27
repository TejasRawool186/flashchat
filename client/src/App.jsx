import { useState, useEffect, useRef, useCallback } from 'react';
import { socket, connectSocket, disconnectSocket } from './socket';
import './App.css';

/* ═══════════════════════════════════════════
   HELPER UTILITIES
   ═══════════════════════════════════════════ */

const getFileType = (fileName, mimeType) => {
  if (!fileName) return 'default';
  const ext = fileName.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (mimeType?.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  return 'default';
};

const getFileIcon = (type) => {
  const icons = { pdf: '📄', doc: '📝', ppt: '📊', zip: '📦', image: '🖼️', video: '🎬', default: '📎' };
  return icons[type] || icons.default;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatTime = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const highlightCode = (code) => {
  if (!code) return '';
  let hl = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const strings = [], comments = [];
  
  hl = hl.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, m => {
    strings.push(m); return `__STR_${strings.length - 1}__`;
  });
  hl = hl.replace(/(\/\/.*$|#[^\n]*$)/gm, m => {
    comments.push(m); return `__CMT_${comments.length - 1}__`;
  });
  hl = hl.replace(/(\/\*[\s\S]*?\*\/)/g, m => {
    comments.push(m); return `__CMT_${comments.length - 1}__`;
  });

  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'def', 'print', 'self', 'None', 'True', 'False', 'public', 'private', 'protected', 'static', 'void', 'int', 'string', 'boolean', 'String', 'System', 'out', 'println'];
  keywords.forEach(kw => {
    hl = hl.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span class="kw">${kw}</span>`);
  });
  hl = hl.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
  
  strings.forEach((str, i) => { hl = hl.replace(`__STR_${i}__`, `<span class="str">${str}</span>`); });
  comments.forEach((cmt, i) => { hl = hl.replace(`__CMT_${i}__`, `<span class="cmt">${cmt}</span>`); });
  
  return hl;
};

const linkifyText = (text) => {
  if (!text) return '';
  const urlRegex = /(https?:\/\/\S+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="msg-link">{part}</a>;
    }
    return part;
  });
};

// Validate incoming message structure
const isValidMessage = (msg) => {
  return msg && typeof msg === 'object' && msg.id && msg.timestamp;
};

// Group consecutive messages from same sender
const processMessagesWithGrouping = (messages) => {
  if (!Array.isArray(messages)) return [];
  return messages.map((msg, i) => {
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;
    const sameAsPrev = prev && prev.senderId === msg.senderId &&
      (new Date(msg.timestamp) - new Date(prev.timestamp)) < 120000;
    const sameAsNext = next && next.senderId === msg.senderId &&
      (new Date(next.timestamp) - new Date(msg.timestamp)) < 120000;
    return { ...msg, isGrouped: sameAsPrev, isLastInGroup: !sameAsNext, showTimestamp: !sameAsNext || !sameAsPrev };
  });
};


/* ═══════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════ */

function SplashScreen({ onComplete }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="splash">
      <div className="splash-glow" />
      <div className="splash-card">
        <svg className="splash-icon icon-pulse" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <h1 className="splash-title">FlashChat</h1>
        <p className="splash-sub">FAST • SECURE • TEMPORARY</p>
        <div className="splash-loader"><div /></div>
      </div>
    </div>
  );
}

function CodeMessage({ code, onCopy }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };
  return (
    <div className="code-msg">
      <div className="code-hdr">
        <span className="code-lang">CODE</span>
        <button className={`code-copy ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
          )}
        </button>
      </div>
      <pre className="code-body" dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
    </div>
  );
}

const ImageMessage = ({ src, fileName, onView, downloadUrl }) => (
  <div className="img-msg" onClick={onView}>
    <img src={src} alt={fileName} loading="lazy" />
    <div className="img-overlay">
      <span className="img-name">{fileName}</span>
      {downloadUrl && (
        <a href={downloadUrl} download={fileName} onClick={(e) => e.stopPropagation()} className="img-dl" title="Download">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      )}
    </div>
  </div>
);

const FileMessage = ({ fileName, fileSize, fileType, downloadUrl }) => (
  <div className="file-msg">
    <div className="file-icon">
      {fileType.startsWith('image/') ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> : 
       fileType.startsWith('video/') ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> : 
       fileType.includes('pdf') ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> : 
       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
    </div>
    <div className="file-info">
      <span className="file-name">{fileName}</span>
      <span className="file-size">{formatFileSize(fileSize)}</span>
      {!downloadUrl && (
        <div className="file-progress-bar">
          <div className="file-progress-fill" style={{ width: '100%' }} />
        </div>
      )}
    </div>
    {downloadUrl && (
      <a href={downloadUrl} download={fileName} className="file-dl" title="Download">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </a>
    )}
  </div>
);

function AttachmentPicker({ onSelect, onClose }) {
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const options = [
    { id: 'document', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, label: 'Document', accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt' },
    { id: 'image', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: 'Image', accept: 'image/*' },
    { id: 'code', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>, label: 'Code', accept: null },
    { id: 'archive', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, label: 'Archive', accept: '.zip,.rar,.7z,.tar,.gz' },
  ];
  const handleClick = (opt) => {
    if (opt.id === 'code') { onSelect({ type: 'code' }); onClose(); }
    else if (opt.id === 'image') imgRef.current?.click();
    else { fileRef.current.accept = opt.accept; fileRef.current?.click(); }
  };
  const handleFileChange = (e) => {
    if (e.target.files?.length) { onSelect({ type: 'file', files: Array.from(e.target.files) }); onClose(); }
  };
  return (
    <>
      <div className="picker-overlay" onClick={onClose} />
      <div className="picker">
        <div className="picker-handle" />
        <h3>Share</h3>
        <div className="picker-options">
          {options.map(o => (
            <div key={o.id} className="picker-opt" onClick={() => handleClick(o)}>
              <div className={`picker-opt-icon ${o.id}`}>{o.icon}</div>
              <span>{o.label}</span>
            </div>
          ))}
        </div>
        <input type="file" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }} multiple />
        <input type="file" ref={imgRef} accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} multiple />
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════
   MAIN APP COMPONENT
   ═══════════════════════════════════════════ */

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState('home');
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [deviceCount, setDeviceCount] = useState(0);
  const [messages, setMessages] = useState([]); // ALWAYS an array
  const [messageInput, setMessageInput] = useState('');
  const [notification, setNotification] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [fileProgress, setFileProgress] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [localTyping, setLocalTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const containerRef = useRef(null);
  const endRef = useRef(null);
  const pendingFiles = useRef({});
  const fileUrls = useRef({});
  const inputRef = useRef(null);

  /* ─── Notification helper ─── */
  const showNotif = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }, []);

  /* ─── Socket setup with FULL cleanup ─── */
  useEffect(() => {
    connectSocket();

    const handleDeviceUpdate = (data) => {
      if (data && typeof data.deviceCount === 'number') {
        setDeviceCount(data.deviceCount);
        showNotif(data.message || 'Device update');
      }
    };

    const handleNewMessage = (message) => {
      try {
        if (!isValidMessage(message)) {
          console.warn('Invalid message received:', message);
          return;
        }
        const container = containerRef.current;
        const isAtBottom = container
          ? container.scrollHeight - container.scrollTop - container.clientHeight < 80
          : true;

        if (message.type === 'file' && fileUrls.current[message.id]) {
          message.downloadUrl = fileUrls.current[message.id];
        }
        setMessages(prev => Array.isArray(prev) ? [...prev, message] : [message]);

        if (!isAtBottom && message.senderId !== socket.id) {
          setUnreadCount(prev => prev + 1);
        }
        if (isAtBottom) {
          setTimeout(() => container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }), 30);
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    const handleTypingStart = () => setIsTyping(true);
    const handleTypingStop = () => setIsTyping(false);

    const handleFileStart = (data) => {
      try {
        pendingFiles.current[data.fileId] = {
          fileName: data.fileName, fileSize: data.fileSize, fileType: data.fileType,
          totalChunks: data.totalChunks, chunks: [], receivedChunks: 0
        };
        setFileProgress(prev => ({ ...prev, [data.fileId]: { name: data.fileName, progress: 0 } }));
      } catch (err) { console.error('file-start error:', err); }
    };

    const handleFileChunk = (data) => {
      try {
        const file = pendingFiles.current[data.fileId];
        if (file) {
          file.chunks[data.chunkIndex] = data.chunk;
          file.receivedChunks++;
          const progress = Math.round((file.receivedChunks / file.totalChunks) * 100);
          setFileProgress(prev => ({ ...prev, [data.fileId]: { ...prev[data.fileId], progress } }));
        }
      } catch (err) { console.error('file-chunk error:', err); }
    };

    const handleFileComplete = (data) => {
      try {
        const file = pendingFiles.current[data.fileId];
        if (file) {
          const blob = new Blob(file.chunks, { type: file.fileType });
          const url = URL.createObjectURL(blob);
          fileUrls.current[data.fileId] = url;
          setMessages(prev =>
            Array.isArray(prev)
              ? prev.map(msg => msg.id === data.fileId ? { ...msg, downloadUrl: url } : msg)
              : prev
          );
          delete pendingFiles.current[data.fileId];
          setFileProgress(prev => { const { [data.fileId]: _, ...rest } = prev; return rest; });
        }
      } catch (err) { console.error('file-complete error:', err); }
    };

    const handleChatHistory = (history) => {
      try {
        if (Array.isArray(history) && history.length > 0) {
          setMessages(history);
          // Scroll to bottom after loading history
          setTimeout(() => {
            const container = containerRef.current;
            if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
          }, 100);
        }
      } catch (err) { console.error('chat-history error:', err); }
    };

    socket.on('device-update', handleDeviceUpdate);
    socket.on('new-message', handleNewMessage);
    socket.on('typing-start', handleTypingStart);
    socket.on('typing-stop', handleTypingStop);
    socket.on('file-start', handleFileStart);
    socket.on('file-chunk', handleFileChunk);
    socket.on('file-complete', handleFileComplete);
    socket.on('chat-history', handleChatHistory);

    return () => {
      socket.off('device-update', handleDeviceUpdate);
      socket.off('new-message', handleNewMessage);
      socket.off('typing-start', handleTypingStart);
      socket.off('typing-stop', handleTypingStop);
      socket.off('file-start', handleFileStart);
      socket.off('file-chunk', handleFileChunk);
      socket.off('file-complete', handleFileComplete);
      socket.off('chat-history', handleChatHistory);
      disconnectSocket();
    };
  }, [showNotif]);

  /* ─── Scroll management ─── */
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
    if (atBottom) { c.scrollTop = c.scrollHeight; setShowScrollBtn(false); }
    else setShowScrollBtn(true);
  }, [messages]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onScroll = () => {
      const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
      setShowScrollBtn(!atBottom);
      if (atBottom) setUnreadCount(0);
    };
    c.addEventListener('scroll', onScroll);
    return () => c.removeEventListener('scroll', onScroll);
  }, [messages]);

  /* ─── Room Actions ─── */
  const createRoom = () => {
    if (!userName.trim()) { setError('Please enter your name'); return; }
    setIsConnecting(true); setError('');
    socket.emit('create-room', (res) => {
      setIsConnecting(false);
      if (res.success) { setRoomCode(res.roomCode); setDeviceCount(res.deviceCount); setScreen('chat'); }
      else setError(res.error || 'Failed to create room');
    });
  };

  const joinRoom = () => {
    if (!userName.trim()) { setError('Please enter your name'); return; }
    if (inputCode.length !== 6) { setError('Please enter a 6-digit room code'); return; }
    setIsConnecting(true); setError('');
    socket.emit('join-room', inputCode, (res) => {
      setIsConnecting(false);
      if (res.success) { setRoomCode(res.roomCode); setDeviceCount(res.deviceCount); setScreen('chat'); }
      else setError(res.error || 'Failed to join room');
    });
  };

  const leaveRoom = () => {
    socket.emit('leave-room');
    setScreen('home'); setRoomCode(''); setMessages([]); setDeviceCount(0);
    setInputCode(''); setUnreadCount(0); setIsTyping(false); setLocalTyping(false);
  };

  /* ─── Input handling ─── */
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    // Auto-expand
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
    // Typing indicator
    if (!localTyping && e.target.value.trim()) {
      setLocalTyping(true);
      socket.emit('typing-start');
    }
    if (typingTimeout) clearTimeout(typingTimeout);
    const t = setTimeout(() => { setLocalTyping(false); socket.emit('typing-stop'); }, 1000);
    setTypingTimeout(t);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !codeMode) {
      e.preventDefault();
      if (messageInput.trim()) sendMessage(e);
    }
  };

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!messageInput.trim()) return;
    if (codeMode) {
      socket.emit('send-message', { text: messageInput, type: 'code', senderName: userName.trim() });
    } else {
      socket.emit('send-message', { text: messageInput, senderName: userName.trim() });
    }
    setMessageInput(''); setCodeMode(false);
    if (localTyping) { setLocalTyping(false); socket.emit('typing-stop'); }
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
  };

  /* ─── File handling ─── */
  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      try {
        const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const CHUNK_SIZE = 64 * 1024;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const fileType = getFileType(file.name, file.type);

        socket.emit('file-start', { fileId, fileName: file.name, fileSize: file.size, fileType: file.type, totalChunks, isImage: fileType === 'image', senderName: userName.trim() });
        setFileProgress(prev => ({ ...prev, [fileId]: { name: file.name, progress: 0, sending: true } }));

        let offset = 0, chunkIndex = 0;
        const reader = new FileReader();
        const readNext = () => { reader.readAsArrayBuffer(file.slice(offset, offset + CHUNK_SIZE)); };

        reader.onload = (ev) => {
          try {
            socket.emit('file-chunk', { fileId, chunk: ev.target.result, chunkIndex });
            chunkIndex++; offset += CHUNK_SIZE;
            setFileProgress(prev => ({ ...prev, [fileId]: { ...prev[fileId], progress: Math.min(Math.round((offset / file.size) * 100), 100) } }));
            if (offset < file.size) readNext();
            else {
              socket.emit('file-complete', { fileId, fileName: file.name, fileSize: file.size, fileType: file.type, isImage: fileType === 'image', senderName: userName.trim() });
              const url = URL.createObjectURL(file);
              fileUrls.current[fileId] = url;
              setMessages(prev => Array.isArray(prev) ? prev.map(m => m.id === fileId ? { ...m, downloadUrl: url } : m) : prev);
              setFileProgress(prev => { const { [fileId]: _, ...rest } = prev; return rest; });
            }
          } catch (err) { console.error('File chunk read error:', err); }
        };
        reader.onerror = () => console.error('FileReader error');
        readNext();
      } catch (err) { console.error('File upload error:', err); }
    });
  };

  const handleAttachmentSelect = ({ type, files }) => {
    if (type === 'code') setCodeMode(true);
    else if (files) handleFileSelect(files);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    showNotif('Room code copied!');
  };

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    setShowScrollBtn(false); setUnreadCount(0);
  };

  /* ─── Message Renderer (with try-catch) ─── */
  const renderMessage = (msg) => {
    try {
      const isCode = msg.type === 'code' || msg.messageType === 'code';
      const isFile = msg.type === 'file';
      const isImage = isFile && getFileType(msg.fileName, msg.fileType) === 'image';
      
      const isSelf = msg.senderId === socket.id;
      const renderName = () => {
        if (!msg.senderName) return null;
        return <div className="msg-sender-name">{msg.senderName}</div>;
      };

      if (isCode) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {renderName()}
            <CodeMessage code={msg.text} onCopy={() => showNotif('Code copied!')} />
            {msg.showTimestamp && <div className="msg-meta"><span className="msg-time">{formatTime(msg.timestamp)}</span></div>}
          </div>
        );
      }
      if (isImage && msg.downloadUrl) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {renderName()}
            <ImageMessage src={msg.downloadUrl} fileName={msg.fileName} onView={() => setViewingImage(msg.downloadUrl)} downloadUrl={msg.downloadUrl} />
            {msg.showTimestamp && <div className="msg-meta"><span className="msg-time">{formatTime(msg.timestamp)}</span></div>}
          </div>
        );
      }
      if (isFile) {
        return (
          <div className="msg-bubble">
            {renderName()}
            <FileMessage fileName={msg.fileName} fileSize={msg.fileSize} fileType={msg.fileType} downloadUrl={msg.downloadUrl} />
            {msg.showTimestamp && <div className="msg-meta"><span className="msg-time">{formatTime(msg.timestamp)}</span></div>}
          </div>
        );
      }
      return (
        <div className="msg-bubble">
          {renderName()}
          <p className="msg-text">{linkifyText(msg.text)}</p>
          {msg.showTimestamp && <div className="msg-meta"><span className="msg-time">{formatTime(msg.timestamp)}</span></div>}
        </div>
      );
    } catch (err) {
      console.error('Message render error:', err);
      return <div className="msg-bubble msg-error">⚠ Failed to display message</div>;
    }
  };


  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  /* ─── HOME SCREEN ─── */
  if (screen === 'home') {
    return (
      <div className="app home-screen">
        <div className="home-bg" />
        <div className="home-center">
          <div className="home-card">
            <div className="home-logo">
              <div className="home-logo-glow" />
              <svg className="home-logo-icon icon-pulse" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <h1>FlashChat</h1>
            </div>
            <p className="home-subtitle">Temporary, fast, secure chat</p>

            <div className="home-form">
              <input
                type="text"
                className="home-input"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value.slice(0, 30))}
                maxLength={30}
              />
              
              <button className="btn-create" onClick={createRoom} disabled={isConnecting}>
                {isConnecting ? 'Creating...' : 'Create Room'}
              </button>

              <div className="home-divider"><span>or join room</span></div>

              <input
                type="text"
                className="home-input"
                placeholder="6-digit code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              <button className="btn-join block-btn" onClick={joinRoom} disabled={isConnecting || inputCode.length !== 6}>
                {isConnecting ? '...' : 'Join'}
              </button>
            </div>

            {error && <p className="home-error">{error}</p>}
          </div>

          <div className="home-features">
            <div className="home-feat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>No login</span>
            </div>
            <div className="home-feat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>No data stored</span>
            </div>
            <div className="home-feat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              <span>Multi-device</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── CHAT SCREEN ─── */
  return (
    <div className={`app chat-screen ${isDragging ? 'dragging' : ''}`}
      onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>

      <div className="app-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sb-header">
            <span className="sb-logo">⚡</span>
            <div>
              <p className="sb-title">FlashChat</p>
              <p className="sb-sub">Room {roomCode || '—'}</p>
            </div>
          </div>
          <div className="sb-search">
            <input type="text" placeholder="Search chats" />
          </div>
          <div className="sb-list">
            <button className="sb-item active">
              <div className="sb-item-name">Room {roomCode || '000000'}</div>
              <div className="sb-item-meta">
                {deviceCount} device{deviceCount !== 1 ? 's' : ''}
                {unreadCount > 0 && <span className="sb-badge">{unreadCount}</span>}
              </div>
            </button>
          </div>
        </aside>

        {/* CHAT AREA */}
        <main className="chat-main">
          <div className="chat-bg" aria-hidden="true" />

          {/* HEADER */}
          <header className="chat-header">
            <div className="chat-header-info">
              <h3>Room {roomCode || '000000'}</h3>
              <p className="chat-header-sub">
                <span className="status-dot" /> {deviceCount} device{deviceCount !== 1 ? 's' : ''} connected
              </p>
              {isTyping && <p className="chat-typing-label">Someone is typing...</p>}
            </div>
            <div className="chat-header-actions">
              <button className="hdr-btn" onClick={copyRoomCode} title="Copy code">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              <button className="hdr-btn leave" onClick={leaveRoom} title="Leave">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </header>

          {notification && <div className="notif">{notification}</div>}

          {/* MESSAGES */}
          <div className="messages" ref={containerRef}>
            {(!Array.isArray(messages) || messages.length === 0) ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg>
                </div>
                <p className="empty-title">No messages yet</p>
                <p className="empty-hint">Start chatting or drop files here</p>
              </div>
            ) : (
              processMessagesWithGrouping(messages).map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.senderId === socket.id ? 'sent' : 'received'} ${msg.isGrouped ? 'grouped' : ''} ${msg.isLastInGroup ? 'last-group' : ''}`}
                >
                  {renderMessage(msg)}
                  {msg.senderId === socket.id && <div className="msg-status">✔✔</div>}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* FILE PROGRESS */}
          {Object.keys(fileProgress).length > 0 && (
            <div className="file-progress-tray">
              {Object.entries(fileProgress).map(([id, f]) => (
                <div key={id} className="fp-item">
                  <span className="fp-icon">📎</span>
                  <span className="fp-name">{f.name}</span>
                  <div className="fp-bar"><div className="fp-fill" style={{ width: `${f.progress}%` }} /></div>
                  <span className="fp-pct">{f.progress}%</span>
                </div>
              ))}
            </div>
          )}

          {/* TYPING INDICATOR */}
          {isTyping && (
            <div className="typing-dots">
              <span /><span /><span /> Typing...
            </div>
          )}

          {/* INPUT BAR */}
          <form className="input-bar" onSubmit={sendMessage}>
            <button type="button" className="ib-attach" onClick={() => setShowAttachmentPicker(true)} title="Attach">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>

            {codeMode ? (
              <div className="ib-code-wrap">
                <div className="ib-code-hdr">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', flex: 1, marginLeft: '8px' }}>Code Snippet</span>
                  <button type="button" className="ib-code-close" onClick={() => setCodeMode(false)}>✕</button>
                </div>
                <textarea
                  ref={inputRef}
                  placeholder="Paste your code here..."
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="ib-code-area"
                  rows={4}
                />
              </div>
            ) : (
              <textarea
                ref={inputRef}
                placeholder="Type a message..."
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="ib-input"
                rows={1}
              />
            )}

            <button type="submit" className={`ib-send ${messageInput.trim() ? 'active' : ''}`} disabled={!messageInput.trim()} title="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>

          {/* SCROLL BUTTON */}
          {showScrollBtn && (
            <button className="scroll-btn" onClick={scrollToBottom}>
              ↓ {unreadCount > 0 ? `${unreadCount} new` : 'Latest'}
            </button>
          )}
        </main>
      </div>

      {/* MODALS */}
      {showAttachmentPicker && <AttachmentPicker onSelect={handleAttachmentSelect} onClose={() => setShowAttachmentPicker(false)} />}

      {isDragging && (
        <div className="drop-zone">
          <div className="drop-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p>Drop files here</p>
            <p className="drop-hint">Images, documents, archives and more</p>
          </div>
        </div>
      )}

      {viewingImage && (
        <div className="img-viewer" onClick={() => setViewingImage(null)}>
          <button className="img-viewer-close" onClick={() => setViewingImage(null)}>✕</button>
          <img src={viewingImage} alt="Full size" />
        </div>
      )}
    </div>
  );
}

export default App;
