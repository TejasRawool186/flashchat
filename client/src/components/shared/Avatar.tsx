import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 40, className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  // Deterministic background color based on name string
  const getBackgroundColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#e11d48', '#ea580c', '#d97706', '#059669', '#0d9488',
      '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#c026d3'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(name)}&size=${size}`;

  if (hasError || !name) {
    return (
      <div
        className={`avatar-fallback ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: getBackgroundColor(name || 'Unknown'),
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: `${size * 0.4}px`,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          flexShrink: 0
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={`${name}'s avatar`}
      className={`avatar-img ${className}`}
      onError={() => setHasError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        objectFit: 'cover',
        backgroundColor: 'var(--bg-2)',
        flexShrink: 0
      }}
    />
  );
};

export default Avatar;
