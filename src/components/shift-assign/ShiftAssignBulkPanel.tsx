'use client';

// STA-168 — grid-native bulk panel. Justified as a SECOND panel distinct from
// roster's BulkAssignModal: that modal selects an EMPLOYEE LIST + one shift type;
// the month grid needs CELL-RANGE selection (employee × day). The shift VOCABULARY
// is shared via SHIFT_CODES (no fork).

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/humi';
import { SHIFT_CODES } from '@/lib/time/shift-codes';
import { buildTimeOptions } from '@/lib/time/time-options';
import type { CellPatch } from '@/stores/shift-assignment';

const TIME_OPTIONS = buildTimeOptions(15);
const SHIFT_ENTRIES = Object.values(SHIFT_CODES);

export interface ShiftAssignBulkPanelProps {
  selectedCount: number;
  isTh: boolean;
  onApply: (patch: CellPatch) => void;
  onClear: () => void;
  onClearSelection: () => void;
}

type Mode = 'shift' | 'dayOff' | 'ot';

export function ShiftAssignBulkPanel({
  selectedCount,
  isTh,
  onApply,
  onClear,
  onClearSelection,
}: ShiftAssignBulkPanelProps) {
  const t = useTranslations('shiftAssign');
  const [mode, setMode] = useState<Mode>('shift');
  const [shiftCode, setShiftCode] = useState<string>(SHIFT_ENTRIES[0]?.code ?? '');
  const [otStart, setOtStart] = useState('17:00');
  const [otEnd, setOtEnd] = useState('19:00');

  const disabled = selectedCount === 0;

  const apply = () => {
    if (disabled) return;
    if (mode === 'shift') onApply({ shiftCode, dayOff: false });
    else if (mode === 'dayOff') onApply({ dayOff: true });
    else onApply({ otStart, otEnd });
  };

  const selectStyle: React.CSSProperties = {
    fontSize: 13,
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-hairline)',
    background: 'var(--color-surface)',
    color: 'var(--color-ink)',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-hairline)',
    background: active ? 'var(--color-accent-soft)' : 'var(--color-canvas-soft)',
    color: active ? 'var(--color-accent)' : 'var(--color-ink-soft)',
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    cursor: 'pointer',
  });

  return (
    <div
      className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft"
      style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}
      data-testid="shift-assign-bulk-panel"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
          {t('selectedCount', { count: selectedCount })}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" style={tabStyle(mode === 'shift')} onClick={() => setMode('shift')}>
            {t('working')}
          </button>
          <button type="button" style={tabStyle(mode === 'dayOff')} onClick={() => setMode('dayOff')}>
            {t('dayOff')}
          </button>
          <button type="button" style={tabStyle(mode === 'ot')} onClick={() => setMode('ot')}>
            {t('addOt')}
          </button>
        </div>
      </div>

      {mode === 'shift' && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{t('chooseShift')}</span>
          <select
            aria-label={t('chooseShift')}
            value={shiftCode}
            onChange={(e) => setShiftCode(e.target.value)}
            style={selectStyle}
          >
            {SHIFT_ENTRIES.map((s) => (
              <option key={s.code} value={s.code}>
                {(isTh ? s.nameTh : s.nameEn)}
              </option>
            ))}
          </select>
        </label>
      )}

      {mode === 'ot' && (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{t('otStart')}</span>
            <select aria-label={t('otStart')} value={otStart} onChange={(e) => setOtStart(e.target.value)} style={selectStyle}>
              {TIME_OPTIONS.map((tm) => (
                <option key={tm} value={tm}>{tm}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{t('otEnd')}</span>
            <select aria-label={t('otEnd')} value={otEnd} onChange={(e) => setOtEnd(e.target.value)} style={selectStyle}>
              {TIME_OPTIONS.map((tm) => (
                <option key={tm} value={tm}>{tm}</option>
              ))}
            </select>
          </label>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={disabled}>
          {t('clearSelection')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onClear} disabled={disabled}>
          {t('clear')}
        </Button>
        <Button variant="primary" size="sm" onClick={apply} disabled={disabled}>
          {t('applyToN', { count: selectedCount })}
        </Button>
      </div>
    </div>
  );
}
