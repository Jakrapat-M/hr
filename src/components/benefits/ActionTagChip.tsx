'use client';

/**
 * ActionTagChip — small teal-accent pill rendered as the first child inside a
 * benefit Create / Make Correction / Insert popup, naming the action that opened
 * the form. Shared by the benefit plan catalog and the eligibility rule manager
 * so both surfaces use identical action framing. Humi tokens only (teal accent,
 * never red).
 */

export type ActionTagMode = 'create' | 'correction' | 'insert';

export function ActionTagChip({ mode, label }: { mode: ActionTagMode; label: string }) {
  return (
    <span
      data-action-tag={mode}
      className="inline-flex items-center rounded-[var(--radius-sm)] border border-accent/30 bg-accent-soft px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold text-accent"
    >
      {label}
    </span>
  );
}
