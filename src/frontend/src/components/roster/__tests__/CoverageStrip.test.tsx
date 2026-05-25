// CoverageStrip tests — aligned to roster-ref-2026-05-25.png:
//   AC1.3 (revised per ref): 24 cells; ok=bg-accent, gap=bg-danger (pumpkin),
//         over=bg-[var(--color-accent-alt)] opacity-60, off=bg-hairline.
//   eyebrow + summary + deficit slot present.
//   Falsifiable token scan still real: gap = --color-danger (pumpkin), which is
//   NOT a Tailwind red/rose/pink class, so the scan must still pass.

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import enMessages from '../../../../messages/en.json';
import { CoverageStrip } from '../CoverageStrip';
import {
  COVERAGE,
  COVERAGE_SUMMARY,
  ROSTER_HOURS,
  type CoverageStatus,
} from '@/data/roster/mock';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/th/roster',
}));

function renderStrip(coverage?: CoverageStatus[], locale: 'th' | 'en' = 'th') {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'th' ? thMessages : enMessages}
    >
      <CoverageStrip coverage={coverage} />
    </NextIntlClientProvider>,
  );
}

const RED_CLASS = /(^|\s)(bg|text|border)-(red|rose|pink)-\d/;
const HEX = /#([0-9a-fA-F]{3,8})\b/;

// Revised token map per the reference.
const STATUS_CLASS: Record<CoverageStatus, string> = {
  ok: 'bg-accent',
  gap: 'bg-danger',
  over: 'bg-[var(--color-accent-alt)]',
  off: 'bg-hairline',
};

describe('CoverageStrip — AC1.3 (ref-aligned)', () => {
  it('renders exactly 24 coverage cells', () => {
    renderStrip();
    expect(screen.getAllByTestId('cov-cell')).toHaveLength(ROSTER_HOURS);
  });

  it('maps each status to its ref token class', () => {
    const fixture: CoverageStatus[] = Array.from({ length: ROSTER_HOURS }, (_, i) =>
      (['ok', 'gap', 'over', 'off'] as CoverageStatus[])[i % 4],
    );
    renderStrip(fixture);
    const cells = screen.getAllByTestId('cov-cell');
    cells.forEach((cell, i) => {
      const status = fixture[i];
      expect(cell.getAttribute('data-status')).toBe(status);
      expect(cell.className).toContain(STATUS_CLASS[status]);
    });
  });

  it('gap=bg-danger (pumpkin), ok=bg-accent, over=accent-alt, off=bg-hairline', () => {
    renderStrip(['gap', 'ok', 'over', 'off']);
    const [gap, ok, over, off] = screen.getAllByTestId('cov-cell');
    expect(gap.className).toContain('bg-danger');
    expect(ok.className).toContain('bg-accent');
    expect(over.className).toContain('bg-[var(--color-accent-alt)]');
    expect(off.className).toContain('bg-hairline');
  });

  it('uses the real default coverage array length', () => {
    expect(COVERAGE.length).toBe(ROSTER_HOURS);
  });
});

describe('CoverageStrip — label, summary, deficit', () => {
  it('renders the coverage summary "12 gaps · Peak 13–16"', () => {
    renderStrip(undefined, 'en');
    const summary = screen.getByTestId('coverage-summary');
    expect(summary.textContent).toContain(`${COVERAGE_SUMMARY.gaps} gaps`);
    expect(summary.textContent).toContain(
      `Peak ${COVERAGE_SUMMARY.peakStart}–${COVERAGE_SUMMARY.peakEnd}`,
    );
  });

  it('renders the deficit "−16 hrs" in pumpkin (text-danger)', () => {
    renderStrip(undefined, 'en');
    const deficit = screen.getByTestId('coverage-deficit');
    expect(deficit.textContent).toContain(`${COVERAGE_SUMMARY.deficitHrs}`);
    expect(deficit.className).toContain('text-danger');
  });
});

describe('CoverageStrip — token scan (falsifiable)', () => {
  it('no red/rose/pink class and no inline hex anywhere', () => {
    const { container } = renderStrip();
    container.querySelectorAll('*').forEach((el) => {
      expect(el.className.toString()).not.toMatch(RED_CLASS);
      const style = el.getAttribute('style') || '';
      expect(style).not.toMatch(HEX);
    });
  });
});
