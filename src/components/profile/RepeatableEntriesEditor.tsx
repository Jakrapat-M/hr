'use client';

// ════════════════════════════════════════════════════════════
// RepeatableEntriesEditor — STA-244 thin repeat-shell.
//
// Owns COLLECTION MECHANICS ONLY: add / remove / exactly-one-primary /
// 8-row read-preview cap / "+ Add" button. The per-row body is supplied by the
// caller as a render prop, so this shell stays type-agnostic and every new N-group
// on /profile/me reuses the same tested collection logic.
//
// It never wires a submit handler — the owning section editor submits (direct+dual).
// Cnext primitives only; danger uses pumpkin --color-danger (NO red); no raw hex.
// ════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/cnext';

export interface RepeatableEntriesEditorProps<T> {
  /** Current rows. */
  entries: T[];
  /** Emit the next rows array. */
  onChange: (next: T[]) => void;
  /** Factory for a fresh empty row (used by "+ Add"). */
  makeEmpty: () => T;
  /**
   * Render prop for one row body. Receives the row, a `patch` callback that
   * shallow-merges a partial into THIS row, and the row index.
   */
  renderRow: (entry: T, patch: (patch: Partial<T>) => void, index: number) => ReactNode;
  /** When set, renders a radio column enforcing exactly-one-primary on this boolean key. */
  primaryKey?: keyof T;
  /** Label + aria-label for the add button. */
  addLabel: string;
  /** Shown when there are zero rows. */
  emptyLabel?: string;
  /** Upper bound on rows. Default: unlimited. */
  maxRows?: number;
  /** Lower bound protected by the remove gate. Default: 0 (last row removable). */
  minRows?: number;
  /** Read-preview cap — when `disabled`, show at most this many rows. Default: 8. */
  previewRows?: number;
  /** Read/preview mode: hides add, disables remove/primary, caps at previewRows. */
  disabled?: boolean;
  /** Label for the primary radio (a11y). */
  primaryLabel?: string;
  /** "Showing X of N" builder for the read-preview footer. */
  moreLabel?: (shown: number, total: number) => string;
}

export function RepeatableEntriesEditor<T>({
  entries,
  onChange,
  makeEmpty,
  renderRow,
  primaryKey,
  addLabel,
  emptyLabel,
  maxRows = Number.POSITIVE_INFINITY,
  minRows = 0,
  previewRows = 8,
  disabled = false,
  primaryLabel = 'Primary',
  moreLabel,
}: RepeatableEntriesEditorProps<T>) {
  const patchRow = (index: number, patch: Partial<T>) => {
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  // Keep exactly-one-primary: if the collection has ≥1 row, none is primary,
  // and a primaryKey is configured, promote the first row. No-op when primaryKey
  // is unset or the collection is empty (zero rows → zero primaries is valid).
  const ensurePrimary = (rows: T[]): T[] => {
    if (!primaryKey || rows.length === 0) return rows;
    const hasPrimary = rows.some((r) => Boolean((r as Record<string, unknown>)[primaryKey as string]));
    if (hasPrimary) return rows;
    return rows.map((r, i) => (i === 0 ? ({ ...r, [primaryKey]: true }) as T : r));
  };

  const removeRow = (index: number) => {
    if (entries.length <= minRows) return;
    // Reassign primary if the removed row was the primary one (else the group
    // would have zero primaries — violates exactly-one-primary).
    onChange(ensurePrimary(entries.filter((_, i) => i !== index)));
  };

  const setPrimary = (index: number) => {
    if (!primaryKey) return;
    onChange(
      entries.map((e, i) => ({ ...e, [primaryKey]: i === index }) as T),
    );
  };

  const addRow = () => {
    if (entries.length >= maxRows) return;
    // ensurePrimary marks the first row primary when adding into an empty group.
    onChange(ensurePrimary([...entries, makeEmpty()]));
  };

  // Read-preview cap only applies in disabled/display mode — never hide rows
  // the user is actively editing.
  const visible = disabled ? entries.slice(0, previewRows) : entries;
  const hiddenCount = entries.length - visible.length;

  return (
    <div className="cnext-col" style={{ gap: 12 }}>
      {entries.length === 0 && emptyLabel && (
        <p style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>{emptyLabel}</p>
      )}

      {visible.map((entry, index) => (
        <div
          key={index}
          data-testid="repeatable-row"
          className="cnext-card cnext-card--tight"
          style={{ background: 'var(--color-canvas-soft)' }}
        >
          <div className="cnext-row" style={{ alignItems: 'flex-start', gap: 12 }}>
            {primaryKey && (
              <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                <input
                  type="radio"
                  name={`repeatable-primary-${String(primaryKey)}`}
                  aria-label={primaryLabel}
                  checked={Boolean((entry as Record<string, unknown>)[primaryKey as string])}
                  onChange={() => setPrimary(index)}
                  disabled={disabled}
                  className="h-4 w-4 accent-[var(--color-accent)] cursor-pointer disabled:cursor-not-allowed"
                />
                <span style={{ fontSize: 10, color: 'var(--color-ink-muted)' }}>{primaryLabel}</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              {renderRow(entry, (patch) => patchRow(index, patch), index)}
            </div>

            {!disabled && (
              <div className="pt-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${addLabel} — remove ${index + 1}`}
                  disabled={entries.length <= minRows}
                  onClick={() => removeRow(index)}
                  className="text-danger hover:text-danger hover:bg-danger/10"
                >
                  <Trash2 size={16} aria-hidden />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}

      {disabled && hiddenCount > 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
          {moreLabel
            ? moreLabel(visible.length, entries.length)
            : `Showing ${visible.length} of ${entries.length}`}
        </p>
      )}

      {!disabled && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-testid="repeatable-add"
          aria-label={addLabel}
          onClick={addRow}
          disabled={entries.length >= maxRows}
          className="self-start"
        >
          <Plus size={16} aria-hidden />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
