import React from 'react';

interface ImageViewerProps {
  src: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, onClose }) => {
  return (
    <div className="img-viewer" onClick={onClose}>
      <button className="img-viewer-close" onClick={onClose}>✕</button>
      <img src={src} alt="Full size preview" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};

export default ImageViewer;
