import React, { useEffect, useState } from 'react';

interface NotificationProps {
  message: string;
  visible: boolean;
  onClose?: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, visible, onClose }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (visible && message) {
      setActive(true);
      const timer = setTimeout(() => {
        setActive(false);
        if (onClose) onClose();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setActive(false);
    }
  }, [visible, message, onClose]);

  if (!active || !message) return null;

  return (
    <div className="notif show">
      <span className="notif-text">{message}</span>
    </div>
  );
};

export default Notification;
