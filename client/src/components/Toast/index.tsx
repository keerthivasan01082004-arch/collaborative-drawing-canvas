import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastMessage {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ToastContextType {
  showToast: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'auto',
              borderLeft:
                toast.type === 'success'
                  ? '4px solid #22c55e'
                  : toast.type === 'warning'
                  ? '4px solid #f59e0b'
                  : toast.type === 'error'
                  ? '4px solid #ef4444'
                  : '4px solid #3b82f6',
            }}
          >
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
