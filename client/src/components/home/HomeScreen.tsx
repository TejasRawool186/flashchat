import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../lib/socket';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [userName, setUserName] = useState(() => sessionStorage.getItem('userName') || '');
  const [inputCode, setInputCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Auto-populate room code if redirected from ChatScreen
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code') || (location.state as any)?.roomCode || '';
    if (code) {
      setInputCode(code.toUpperCase());
    }
  }, [location]);

  const handleCreateRoom = () => {
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setIsConnecting(true);
    setError('');
    
    // Save to sessionStorage
    sessionStorage.setItem('userName', userName.trim());

    socket.emit('create-room', { userName: userName.trim() }, (res: any) => {
      setIsConnecting(false);
      if (res.success && res.roomCode) {
        navigate(`/chat/${res.roomCode}`);
      } else {
        setError(res.error || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (inputCode.trim().length !== 6) {
      setError('Please enter a 6-character room code');
      return;
    }

    setIsConnecting(true);
    setError('');

    // Save to sessionStorage
    sessionStorage.setItem('userName', userName.trim());
    const formattedCode = inputCode.trim().toUpperCase();

    // Check room validity first by joining
    socket.emit('join-room', formattedCode, { userName: userName.trim() }, (res: any) => {
      setIsConnecting(false);
      if (res.success) {
        navigate(`/chat/${formattedCode}`);
      } else {
        setError(res.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="app home-screen">
      <div className="home-bg" />
      <div className="home-center">
        <div className="home-card">
          <div className="home-logo">
            <div className="home-logo-glow" />
            <svg
              className="home-logo-icon icon-pulse"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
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
            
            <button className="btn-create" onClick={handleCreateRoom} disabled={isConnecting}>
              {isConnecting ? 'Creating...' : 'Create Room'}
            </button>

            <div className="home-divider"><span>or join room</span></div>

            <input
              type="text"
              className="home-input"
              placeholder="6-character code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase())}
              maxLength={6}
            />
            <button
              className="btn-join block-btn"
              onClick={handleJoinRoom}
              disabled={isConnecting || inputCode.length !== 6}
            >
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

        <div className="home-encryption-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>🔒 End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
