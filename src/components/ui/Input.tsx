import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cx } from '../../lib/utils';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

export function Field({ label, error, hint, required, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-xxs">
      {label && (
        <label htmlFor={htmlFor} className="text-body text-ink">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="text-caption text-ink-muted">{hint}</span>}
      {error && <span className="text-caption text-error">{error}</span>}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({ error, className, ...rest }, ref) => (
  <input
    ref={ref}
    className={cx(
      'min-touch w-full bg-surface-1 px-md py-[11px] text-body text-ink rounded-none border-0 border-b-2 outline-none focus-visible:outline-none',
      error ? 'border-b-error' : 'border-b-transparent focus:border-b-primary',
      className
    )}
    {...rest}
  />
));
TextInput.displayName = 'TextInput';

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(({ error, className, children, ...rest }, ref) => (
  <select
    ref={ref}
    className={cx(
      'min-touch w-full bg-surface-1 px-md py-[11px] text-body text-ink rounded-none border-0 border-b-2 outline-none appearance-none',
      error ? 'border-b-error' : 'border-b-transparent focus:border-b-primary',
      className
    )}
    {...rest}
  >
    {children}
  </select>
));
SelectInput.displayName = 'SelectInput';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ error, className, ...rest }, ref) => (
  <textarea
    ref={ref}
    className={cx(
      'w-full bg-surface-1 px-md py-[11px] text-body text-ink rounded-none border-0 border-b-2 outline-none min-h-[96px]',
      error ? 'border-b-error' : 'border-b-transparent focus:border-b-primary',
      className
    )}
    {...rest}
  />
));
TextArea.displayName = 'TextArea';
