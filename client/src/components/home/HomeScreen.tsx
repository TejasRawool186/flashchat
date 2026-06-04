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
      
      {/* Landing Header */}
      <header className="landing-hdr">
        <div className="home-logo" style={{ marginBottom: 0 }}>
          <svg
            className="home-logo-icon"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ color: 'var(--accent)' }}
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <h2 style={{ fontSize: '1.4rem' }}>FlashChat</h2>
        </div>
        <nav className="landing-nav">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#security" className="landing-nav-link">Security</a>
          <a href="#about" className="landing-nav-link">E2E Crypt</a>
        </nav>
      </header>

      <div className="home-center">
        {/* Top Badge */}
        <div className="landing-badge">
          <span>⚡</span>
          <span>Version 2.0: E2E Encryption & AI Bot is live</span>
        </div>

        {/* Hero Section */}
        <div className="landing-hero">
          <h1 className="landing-title">
            Secure, Ephemeral, and Modern<br />
            Chat with <span>FlashChat</span>
          </h1>
          <p className="landing-subtitle">
            An instant, zero-config messaging platform with client-side end-to-end encryption, markdown parsing, syntax highlighting, and secure AI helpers.
          </p>
        </div>

        {/* Form and Chat Showcase Row */}
        <div className="landing-row">
          {/* Join/Create Card */}
          <div className="home-card-wrapper">
            <div className="home-card">
              <div className="home-logo">
                <svg
                  className="home-logo-icon"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <h2>Start Chatting</h2>
              </div>

              <div className="home-form">
                <input
                  type="text"
                  className="home-input"
                  placeholder="Enter your display name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value.slice(0, 30))}
                  maxLength={30}
                />
                
                <button className="btn-create" onClick={handleCreateRoom} disabled={isConnecting}>
                  {isConnecting ? 'Creating...' : 'Create Secure Room'}
                </button>

                <div className="home-divider">
                  <span>or join room</span>
                </div>

                <input
                  type="text"
                  className="home-input"
                  placeholder="Enter 6-digit room code"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase())}
                  maxLength={6}
                />
                <button
                  className="btn-join"
                  onClick={handleJoinRoom}
                  disabled={isConnecting || inputCode.length !== 6}
                >
                  {isConnecting ? 'Joining...' : 'Join Room'}
                </button>
              </div>

              {error && <p className="home-error">{error}</p>}
            </div>
          </div>

          {/* Interactive Simulated Showcase */}
          <div className="landing-showcase">
            <div className="showcase-header">
              <div className="showcase-dot" />
              <div className="showcase-title">Encrypted Room (Preview)</div>
            </div>

            <div className="showcase-bubble">
              <div className="showcase-avatar">🤖</div>
              <div className="showcase-content">
                <span className="showcase-bot-tag">FlashBot ⚡</span>
                <div>Welcome! Messages in this room are encrypted client-side using **AES-GCM-256** before being relayed. Try `/ask` to chat with me!</div>
              </div>
            </div>

            <div className="showcase-bubble self">
              <div className="showcase-avatar">👤</div>
              <div className="showcase-content">
                <div>Hey Bot, tell me about FlashChat security?</div>
              </div>
            </div>

            <div className="showcase-bubble">
              <div className="showcase-avatar">🤖</div>
              <div className="showcase-content">
                <span className="showcase-bot-tag">FlashBot ⚡</span>
                <div>FlashChat operates in **zero-knowledge** mode. Plaintext never hits the database or server logs. Only users in the room hold the derived keys! 🔒</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid Section */}
        <div id="features" className="home-features" style={{ width: '100%', marginTop: '2rem' }}>
          <div className="home-feat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>No Account Required</span>
          </div>
          <div className="home-feat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>Auto-Disappearing Data</span>
          </div>
          <div className="home-feat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <span>Multi-Device E2E Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
