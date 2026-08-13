import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/utils';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface ToastContextValue {
  showToast: (type: 'success' | 'error', message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="fixed top-md right-md z-[100] flex flex-col gap-xs w-full max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cx(
                'bg-canvas text-ink text-body-sm px-md py-sm border-l-[3px] shadow-md',
                t.type === 'success' ? 'border-l-success' : 'border-l-error'
              )}
            >
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx;
}
