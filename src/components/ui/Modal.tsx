import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, subtitle, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 w-full max-w-lg bg-canvas p-xl border border-hairline max-h-[90vh] overflow-y-auto"
      >
        <h2 id="modal-title" className="text-subhead text-ink mb-xxs">
          {title}
        </h2>
        {subtitle && <p className="text-body-sm text-ink-muted mb-md">{subtitle}</p>}
        <div className="mb-lg">{children}</div>
        {footer && <div className="flex justify-end gap-sm">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
