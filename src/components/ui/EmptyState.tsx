import { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-xxl px-lg text-ink-subtle">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-md" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="0" />
        <path d="M3 7l2-4h14l2 4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="3" y1="7" x2="21" y2="7" />
      </svg>
      <p className="text-body text-ink-subtle">{title}</p>
      {description && <p className="text-body-sm text-ink-subtle mt-xxs">{description}</p>}
      {action && <div className="mt-md">{action}</div>}
    </div>
  );
}
