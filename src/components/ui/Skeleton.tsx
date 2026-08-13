import { cx } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse bg-surface-2', className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-md border-b border-hairline px-md py-sm">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
