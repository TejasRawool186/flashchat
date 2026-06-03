import React from 'react';
import { FileProgress } from '../../types';

interface FileProgressTrayProps {
  fileProgress: Record<string, FileProgress>;
}

export const FileProgressTray: React.FC<FileProgressTrayProps> = ({ fileProgress }) => {
  const items = Object.entries(fileProgress);
  if (items.length === 0) return null;

  return (
    <div className="file-progress-tray">
      {items.map(([fileId, item]) => (
        <div key={fileId} className="fp-item">
          <div className="fp-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div className="fp-info" style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
            <div className="fp-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', fontWeight: 500 }}>
              {item.name}
            </div>
            <div className="fp-bar" style={{ height: '4px', background: 'var(--bg-3)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
              <div
                className="fp-fill"
                style={{
                  width: `${item.progress}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 0.1s ease',
                  borderRadius: '2px'
                }}
              />
            </div>
          </div>
          <div className="fp-pct" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>
            {item.progress}%
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileProgressTray;
