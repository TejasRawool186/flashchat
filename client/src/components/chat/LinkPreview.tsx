import React, { useEffect, useState } from 'react';
import { LinkPreviewData } from '../../types';

interface LinkPreviewProps {
  url: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const fetchUrl = `${SERVER_URL}/api/link-preview?url=${encodeURIComponent(url)}`;

    setLoading(true);
    setError(false);

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch preview');
        return res.json();
      })
      .then((previewData) => {
        if (active) {
          setData(previewData);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Link preview error:', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [url]);

  if (loading || error || !data || (!data.title && !data.description)) {
    return null; // Don't show anything if loading, error, or not enough meta info
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--bg-2)',
        overflow: 'hidden',
        marginTop: '8px',
        textDecoration: 'none',
        color: 'inherit',
        maxWidth: '400px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        animation: 'fadeIn 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {data.image && (
        <div style={{ width: '100%', height: '140px', overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
          <img
            src={data.image}
            alt={data.title || 'Preview'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {data.siteName && (
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {data.siteName}
          </span>
        )}
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.title}
        </div>
        {data.description && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
};

export default LinkPreview;
