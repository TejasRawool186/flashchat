import React from 'react';

interface DropZoneProps {
  isDragging: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ isDragging }) => {
  if (!isDragging) return null;

  return (
    <div className="drop-zone">
      <div className="drop-content">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p>Drop files here</p>
        <p className="drop-hint">Images, documents, archives and more</p>
      </div>
    </div>
  );
};

export default DropZone;
