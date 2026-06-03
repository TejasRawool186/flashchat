import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fading out slightly before the 2.5s mark to feel smooth
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 2000);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash ${isFading ? 'fade-out' : ''}`}>
      <div className="splash-glow" />
      <div className="splash-card">
        <svg
          className="splash-icon icon-pulse"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <h1 className="splash-title">FlashChat</h1>
        <p className="splash-sub">FAST • SECURE • TEMPORARY</p>
        <div className="splash-loader" />
      </div>
    </div>
  );
};

export default SplashScreen;
