import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRShareModalProps {
  roomCode: string;
  roomUrl: string;
  onClose: () => void;
}

export const QRShareModal: React.FC<QRShareModalProps> = ({ roomCode, roomUrl, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join FlashChat Room',
          text: `Join my temporary, end-to-end encrypted room on FlashChat! Code: ${roomCode}`,
          url: roomUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Share Room</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--text-3)',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        <div className="qr-code">
          <QRCodeSVG
            value={roomUrl}
            size={180}
            level="M"
            includeMargin={true}
            style={{
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '8px',
              background: '#fff'
            }}
          />
        </div>

        <div className="qr-room-code">{roomCode}</div>
        <p className="qr-label">Scan code or share URL to invite participants</p>

        <div className="qr-actions">
          <button className="qr-btn" onClick={handleCopyLink}>
            {copied ? 'Copied URL!' : 'Copy Link'}
          </button>
          
          {typeof navigator.share === 'function' && (
            <button className="qr-btn qr-btn-primary" onClick={handleShare}>
              Share Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRShareModal;
