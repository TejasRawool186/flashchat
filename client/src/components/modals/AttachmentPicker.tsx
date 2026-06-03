import React, { useRef } from 'react';

interface AttachmentPickerProps {
  onSelect: (selection: { type: string; files?: File[] }) => void;
  onClose: () => void;
}

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({ onSelect, onClose }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const options = [
    {
      id: 'document',
      label: 'Document',
      accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      id: 'image',
      label: 'Image',
      accept: 'image/*',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )
    },
    {
      id: 'code',
      label: 'Code',
      accept: null,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
    },
    {
      id: 'archive',
      label: 'Archive',
      accept: '.zip,.rar,.7z,.tar,.gz',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    }
  ];

  const handleClick = (opt: typeof options[0]) => {
    if (opt.id === 'code') {
      onSelect({ type: 'code' });
      onClose();
    } else if (opt.id === 'image') {
      imgRef.current?.click();
    } else {
      if (fileRef.current) {
        fileRef.current.accept = opt.accept || '';
        fileRef.current.click();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onSelect({ type: 'file', files: Array.from(e.target.files) });
      onClose();
    }
  };

  return (
    <>
      <div className="picker-overlay" onClick={onClose} />
      <div className="picker">
        <div className="picker-handle" />
        <h3>Share</h3>
        <div className="picker-options">
          {options.map((o) => (
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
};

export default AttachmentPicker;
