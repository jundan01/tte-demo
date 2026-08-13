import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cx } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Tombol aksi ringkas di dalam tabel (Panel Superadmin) — tidak menegakkan
   * target sentuh 48px, karena aturan itu (DESIGN.md §9) khusus Portal Publik
   * & elemen form utama, bukan aksi baris tabel padat-data. */
  compact?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-blue-hover active:bg-blue-80',
  secondary: 'bg-ink text-inverse-ink hover:bg-[#2a2a2a]',
  tertiary: 'bg-canvas text-primary border border-primary hover:bg-surface-1',
  ghost: 'bg-transparent text-primary hover:bg-surface-1',
  danger: 'bg-error text-on-primary hover:bg-[#ba1a24]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, disabled, compact, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cx(
          'inline-flex items-center justify-center gap-xs text-button rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          compact ? 'px-sm py-xxs' : 'px-md py-sm min-touch',
          variantClasses[variant],
          className
        )}
        {...rest}
      >
        {loading && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
