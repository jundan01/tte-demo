import { cx } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  warning?: boolean;
  loading?: boolean;
}

export function StatCard({ label, value, warning, loading }: StatCardProps) {
  return (
    <div className={cx('bg-canvas border border-hairline p-lg', warning && 'border-t-[3px] border-t-warning')}>
      <p className="text-body-sm text-ink-muted mb-xs">{label}</p>
      {loading ? (
        <div className="h-[42px] w-20 bg-surface-2 animate-pulse" />
      ) : (
        <p className="text-display-md text-ink">{value}</p>
      )}
    </div>
  );
}
