'use client';

// STA-256/257 — shared date input for OT + Time Correction forms.
//
// Keeps a real native <input type="date"> as the selection method (the system
// calendar popup — showPicker() fires on click, focus is the fallback for
// browsers without it) while DISPLAYING the chosen value as an abbreviated
// [day mon year]: TH = "8 ก.ค. 2569" (B.E.), EN = "8 Jul 2026" (A.D.).
// In disabled mode (auto-calculated End Date) only the read-only display
// renders — the user cannot interact with the field.

import { useRef } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateAbbrev } from '@/lib/date';

export interface FormattedDateInputProps {
  /** Forwarded to the native input so a FormField label can target it. */
  id?: string;
  /** Date-only ISO value (YYYY-MM-DD) or '' when unset. */
  value: string;
  onChange?: (iso: string) => void;
  locale: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
  'data-testid'?: string;
  className?: string;
}

export function FormattedDateInput({
  id,
  value,
  onChange,
  locale,
  min,
  max,
  disabled = false,
  placeholder,
  'aria-label': ariaLabel,
  'data-testid': testId,
  className,
}: FormattedDateInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const isTh = locale === 'th';
  const text = value
    ? formatDateAbbrev(value, locale)
    : (placeholder ?? (isTh ? 'เลือกวันที่' : 'Select date'));

  return (
    <div className={cn('relative w-full', className)}>
      {!disabled && (
        <input
          ref={ref}
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          aria-label={ariaLabel}
          data-testid={testId}
          onChange={(e) => onChange?.(e.target.value)}
          onClick={() => {
            // System calendar popup — supported browsers only; focus otherwise.
            try {
              ref.current?.showPicker?.();
            } catch {
              /* non-gesture / unsupported → the focused input still works */
            }
          }}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
      )}
      <div
        aria-hidden={!disabled}
        data-testid={testId ? `${testId}-display` : undefined}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-hairline px-3 py-2.5 text-body transition',
          disabled ? 'bg-canvas-soft text-ink-muted' : 'bg-surface text-ink',
          !value && !disabled && 'text-ink-faint',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2',
        )}
      >
        <span>{text}</span>
        <CalendarDays size={16} className="shrink-0 text-ink-faint" aria-hidden />
      </div>
    </div>
  );
}
