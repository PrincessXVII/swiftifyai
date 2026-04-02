import { useEffect } from 'react';

type ToastType = 'error' | 'success' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(id);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`} role="alert">
      {message}
    </div>
  );
}
