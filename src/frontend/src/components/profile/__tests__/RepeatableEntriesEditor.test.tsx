/**
 * RepeatableEntriesEditor.test.tsx — STA-244 shell unit tests.
 *
 * The shell owns collection mechanics only: unlimited add, min-row remove gate,
 * exactly-one-primary, 8-row read-preview cap, and a per-row patch callback.
 */

import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach } from 'vitest';
import { RepeatableEntriesEditor } from '@/components/profile/RepeatableEntriesEditor';

afterEach(cleanup);

interface Row {
  name: string;
  primary: boolean;
}

function Harness({
  initial = [],
  primaryKey,
  minRows,
  maxRows,
  disabled,
  previewRows,
}: {
  initial?: Row[];
  primaryKey?: keyof Row;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  previewRows?: number;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  return (
    <RepeatableEntriesEditor<Row>
      entries={rows}
      onChange={setRows}
      makeEmpty={() => ({ name: '', primary: false })}
      renderRow={(entry, patch) => (
        <input
          aria-label={`name-${entry.name}`}
          value={entry.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      )}
      primaryKey={primaryKey}
      addLabel="Add Row"
      emptyLabel="No rows"
      minRows={minRows}
      maxRows={maxRows}
      disabled={disabled}
      previewRows={previewRows}
    />
  );
}

describe('RepeatableEntriesEditor — collection mechanics', () => {
  it('adds rows with no upper limit (click Add 12× → 12 rows)', () => {
    render(<Harness />);
    const add = screen.getByTestId('repeatable-add');
    for (let i = 0; i < 12; i += 1) fireEvent.click(add);
    expect(screen.getAllByTestId('repeatable-row')).toHaveLength(12);
  });

  it('respects maxRows (Add disabled at the cap)', () => {
    render(<Harness initial={[{ name: 'a', primary: false }]} maxRows={1} />);
    const add = screen.getByTestId('repeatable-add');
    expect(add).toBeDisabled();
  });

  it('remove is gated by minRows (last row not removable when minRows=1)', () => {
    render(<Harness initial={[{ name: 'a', primary: false }]} minRows={1} />);
    const removeBtn = screen.getByRole('button', { name: /remove 1/ });
    expect(removeBtn).toBeDisabled();
  });

  it('remove works down to zero when minRows=0 (default)', () => {
    render(<Harness initial={[{ name: 'a', primary: false }]} />);
    const removeBtn = screen.getByRole('button', { name: /remove 1/ });
    expect(removeBtn).not.toBeDisabled();
    fireEvent.click(removeBtn);
    expect(screen.queryAllByTestId('repeatable-row')).toHaveLength(0);
  });

  it('enforces exactly-one-primary when primaryKey is set', () => {
    render(
      <Harness
        primaryKey="primary"
        initial={[
          { name: 'a', primary: true },
          { name: 'b', primary: false },
          { name: 'c', primary: false },
        ]}
      />,
    );
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[0].checked).toBe(true);
    fireEvent.click(radios[2]);
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(false);
    expect(radios[2].checked).toBe(true);
  });

  it('reassigns primary when the current primary row is removed (exactly-one, not at-most-one)', () => {
    render(
      <Harness
        primaryKey="primary"
        initial={[
          { name: 'a', primary: true },
          { name: 'b', primary: false },
        ]}
      />,
    );
    // Remove row 1 (the primary). The remaining row must become primary — the
    // group must never end up with zero primaries.
    fireEvent.click(screen.getByRole('button', { name: /remove 1/ }));
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios).toHaveLength(1);
    expect(radios[0].checked).toBe(true);
  });

  it('marks the first row primary when adding into an empty group', () => {
    render(<Harness primaryKey="primary" />);
    fireEvent.click(screen.getByTestId('repeatable-add'));
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios).toHaveLength(1);
    expect(radios[0].checked).toBe(true);
  });

  it('caps the read-preview at previewRows (disabled) with a "Showing X of N" footer', () => {
    const initial = Array.from({ length: 10 }, (_, i) => ({ name: `r${i}`, primary: false }));
    render(<Harness initial={initial} disabled previewRows={8} />);
    expect(screen.getAllByTestId('repeatable-row')).toHaveLength(8);
    expect(screen.getByText('Showing 8 of 10')).toBeInTheDocument();
    // No add/remove controls in read mode.
    expect(screen.queryByTestId('repeatable-add')).not.toBeInTheDocument();
  });

  it('renderRow receives a patch callback that updates only its row', () => {
    render(
      <Harness
        initial={[
          { name: 'a', primary: false },
          { name: 'b', primary: false },
        ]}
      />,
    );
    const rows = screen.getAllByTestId('repeatable-row');
    const input = within(rows[0]).getByLabelText('name-a') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'zzz' } });
    // Row 0 patched, row 1 untouched.
    expect(within(screen.getAllByTestId('repeatable-row')[0]).getByLabelText('name-zzz')).toBeInTheDocument();
    expect(within(screen.getAllByTestId('repeatable-row')[1]).getByLabelText('name-b')).toBeInTheDocument();
  });
});
