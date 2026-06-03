import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { connectSocket, disconnectSocket } from './lib/socket';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/home/HomeScreen';
import ChatScreen from './components/chat/ChatScreen';
import './App.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/chat/:roomCode" element={<ChatScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
