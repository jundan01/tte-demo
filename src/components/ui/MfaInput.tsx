import { useRef } from 'react';

interface MfaInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

const LENGTH = 6;

export function MfaInput({ value, onChange, onComplete, disabled }: MfaInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(LENGTH, ' ').split('').slice(0, LENGTH);

  function setDigit(index: number, char: string) {
    const clean = char.replace(/[^0-9]/g, '');
    const chars = value.split('');
    chars[index] = clean;
    const next = chars.join('').slice(0, LENGTH).replace(/\s/g, '');
    onChange(next);
    if (clean && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
    if (next.length === LENGTH) {
      onComplete?.(next);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index].trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, LENGTH);
    onChange(pasted);
    if (pasted.length === LENGTH) onComplete?.(pasted);
  }

  return (
    <div className="flex gap-xs" role="group" aria-label="Kode verifikasi 6 digit">
      {Array.from({ length: LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[i].trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-[48px] h-[56px] text-center text-headline bg-surface-1 border-0 border-b-2 border-transparent focus:border-b-primary outline-none rounded-none"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
