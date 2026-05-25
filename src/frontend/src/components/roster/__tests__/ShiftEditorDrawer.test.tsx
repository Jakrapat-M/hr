// ShiftEditorDrawer + page interaction tests:
//   AC1.4 click shift opens drawer, Cancel closes (page-level)
//   AC1.5 ?panel=swap mounts ShiftSwapModal open (page-level)
//   AC1.6 Bulk Assign button opens BulkAssignModal (page-level)
//   drawer prefill + Save closes (component-level)

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import { ShiftEditorDrawer } from '../ShiftEditorDrawer';
import type { RosterShift } from '@/data/roster/mock';

// ── next/navigation mock — overridable per test for ?panel=swap (AC1.5) ──
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  usePathname: () => '/th/roster',
}));

const SHIFT: RosterShift = {
  id: 's-x',
  type: 'regular',
  start: 9,
  end: 18,
  breakStart: 13,
  breakEnd: 14,
  labelTh: 'กะปกติ',
  labelEn: 'Regular',
};

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  searchParams = new URLSearchParams();
});

describe('ShiftEditorDrawer — component', () => {
  it('does not render when closed', () => {
    wrap(
      <ShiftEditorDrawer
        open={false}
        shift={SHIFT}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.queryByTestId('shift-editor-drawer')).toBeNull();
  });

  it('renders and prefills from the shift when open', () => {
    wrap(
      <ShiftEditorDrawer
        open
        shift={SHIFT}
        employeeName="คุณสิริพร จันทร์แดง"
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByTestId('shift-editor-drawer')).toBeInTheDocument();
    // prefilled start/end from the shift
    expect((screen.getByDisplayValue('9') as HTMLInputElement).value).toBe('9');
    expect((screen.getByDisplayValue('18') as HTMLInputElement).value).toBe('18');
    expect(screen.getByText('คุณสิริพร จันทร์แดง')).toBeInTheDocument();
  });

  it('Cancel triggers onClose', () => {
    const onClose = vi.fn();
    wrap(
      <ShiftEditorDrawer open shift={SHIFT} onClose={onClose} onSave={() => {}} />,
    );
    fireEvent.click(screen.getByText('ยกเลิก'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Save fires onSave with the current draft', () => {
    const onSave = vi.fn();
    wrap(
      <ShiftEditorDrawer open shift={SHIFT} onClose={() => {}} onSave={onSave} />,
    );
    fireEvent.click(screen.getByText('บันทึก'));
    expect(onSave).toHaveBeenCalledWith({ type: 'regular', start: 9, end: 18 });
  });
});

describe('RosterPage interactions — AC1.4 / AC1.5 / AC1.6', () => {
  // Imported lazily so the next/navigation mock is in place first.
  async function renderPage() {
    const { default: RosterPage } = await import('@/app/[locale]/roster/page');
    return wrap(<RosterPage />);
  }

  it('AC1.4 — clicking a shift opens the editor drawer, Cancel closes it', async () => {
    await renderPage();
    const firstShift = screen.getAllByTestId('shift-cell')[0];
    fireEvent.click(firstShift);
    expect(screen.getByTestId('shift-editor-drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ยกเลิก'));
    expect(screen.queryByTestId('shift-editor-drawer')).toBeNull();
  });

  it('AC1.5 — ?panel=swap mounts the swap modal open', async () => {
    searchParams = new URLSearchParams('panel=swap');
    await renderPage();
    expect(screen.getByTestId('shift-swap-modal')).toBeInTheDocument();
  });

  it('AC1.6 — Bulk Assign button opens the bulk-assign modal', async () => {
    await renderPage();
    expect(screen.queryByTestId('bulk-assign-modal')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'กำหนดกะแบบกลุ่ม' }));
    expect(screen.getByTestId('bulk-assign-modal')).toBeInTheDocument();
  });
});
