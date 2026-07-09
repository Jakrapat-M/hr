// STA-232 — Messages tab: 4 message types (Error/Warning/Approve/Information),
// sorted by type priority first, then date (newest-first within a band).
// STA-253 — re-issue: type grouping, per-type collapsible sections, type filter.

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessagesTab, type TimesheetMessage } from '../MessagesTab';

function msg(overrides: Partial<TimesheetMessage>): TimesheetMessage {
  return {
    level: 'information',
    badgeTh: 'ป้าย', badgeEn: 'Badge',
    titleTh: 'หัวข้อ', titleEn: 'Title',
    descTh: 'รายละเอียด', descEn: 'Description',
    date: 'System · 1 Jan 2026',
    dateRaw: '2026-01-01',
    ...overrides,
  };
}

describe('MessagesTab', () => {
  it('shows the empty state when there are no messages', () => {
    render(<MessagesTab messages={[]} isTh={false} />);
    expect(screen.getByText('No messages this period')).toBeInTheDocument();
  });

  it('shows the Thai empty state copy when isTh', () => {
    render(<MessagesTab messages={[]} isTh />);
    expect(screen.getByText('ไม่มีข้อความในรอบนี้')).toBeInTheDocument();
  });

  // NOTE (STA-253): titles renamed 'Error'/'Approve' -> 'Error Title'/'Approve Title' and the
  // assertion switched to the `message-title` testid. STA-253 added per-type group headers whose
  // badge text is the bare type name ("Error", "Approve", ...) — the old fixture values collided
  // with that new header text, so a plain getAllByText could no longer disambiguate card titles
  // from group headers. Scoping to the card-only testid keeps this test about card order, not DOM
  // text uniqueness.
  it('sorts an unsorted mixed list by type priority (Error > Warning > Approve > Information), newest-first within a band', () => {
    const messages: TimesheetMessage[] = [
      msg({ level: 'information', titleEn: 'Info Old', dateRaw: '2026-05-25' }),
      msg({ level: 'approve', titleEn: 'Approve Title', dateRaw: '2026-06-01' }),
      msg({ level: 'warning', titleEn: 'Warning Old', dateRaw: '2026-05-28' }),
      msg({ level: 'error', titleEn: 'Error Title', dateRaw: '2026-06-05' }),
      msg({ level: 'warning', titleEn: 'Warning New', dateRaw: '2026-06-02' }),
    ];
    render(<MessagesTab messages={messages} isTh={false} />);
    const titles = screen.getAllByTestId('message-title').map((el) => el.textContent);
    expect(titles).toEqual(['Error Title', 'Warning New', 'Warning Old', 'Approve Title', 'Info Old']);
  });

  it('keeps same-type same-date entries in their given (stable) order', () => {
    const messages: TimesheetMessage[] = [
      msg({ level: 'warning', titleEn: 'First', dateRaw: '2026-06-01' }),
      msg({ level: 'warning', titleEn: 'Second', dateRaw: '2026-06-01' }),
    ];
    render(<MessagesTab messages={messages} isTh={false} />);
    const titles = screen.getAllByText(/^(First|Second)$/).map((el) => el.textContent);
    expect(titles).toEqual(['First', 'Second']);
  });

  // NOTE (STA-253): scoped to the `message-badge` testid (see note above) instead of getByText,
  // since group headers now also render the bare type name.
  it('renders the designated badge token class for each of the 4 types', () => {
    const messages: TimesheetMessage[] = [
      msg({ level: 'error', badgeEn: 'Error badge', titleEn: 'Error title' }),
      msg({ level: 'warning', badgeEn: 'Warning badge', titleEn: 'Warning title' }),
      msg({ level: 'approve', badgeEn: 'Approve badge', titleEn: 'Approve title' }),
      msg({ level: 'information', badgeEn: 'Information badge', titleEn: 'Information title' }),
    ];
    render(<MessagesTab messages={messages} isTh={false} />);
    const badges = screen.getAllByTestId('message-badge');
    expect(badges[0]).toHaveClass('border-danger', 'bg-danger-soft', 'text-danger');
    expect(badges[1]).toHaveClass('border-warning', 'bg-warning-soft', 'text-warning');
    expect(badges[2]).toHaveClass('border-accent', 'bg-accent-soft', 'text-accent');
    expect(badges[3]).toHaveClass('border-info', 'bg-info-soft', 'text-info');
  });

  it('renders the Thai badge/title/desc fields when isTh', () => {
    render(
      <MessagesTab
        messages={[msg({ level: 'error', badgeTh: 'ผิดพลาด', titleTh: 'หัวข้อผิดพลาด', descTh: 'คำอธิบายผิดพลาด' })]}
        isTh
      />,
    );
    expect(screen.getByText('ผิดพลาด')).toBeInTheDocument();
    expect(screen.getByText('หัวข้อผิดพลาด')).toBeInTheDocument();
    expect(screen.getByText('คำอธิบายผิดพลาด')).toBeInTheDocument();
  });
});

describe('MessagesTab — grouping, filter, collapse (STA-253)', () => {
  function fourTypeMessages(): TimesheetMessage[] {
    return [
      msg({ level: 'error', titleEn: 'Error title', dateRaw: '2026-06-05' }),
      msg({ level: 'warning', titleEn: 'Warning title', dateRaw: '2026-06-02' }),
      msg({ level: 'warning', titleEn: 'Warning title 2', dateRaw: '2026-05-28' }),
      msg({ level: 'approve', titleEn: 'Approve title', dateRaw: '2026-06-01' }),
      msg({ level: 'information', titleEn: 'Info title', dateRaw: '2026-05-25' }),
    ];
  }

  it('groups messages by type in priority order, each header showing a count', () => {
    render(<MessagesTab messages={fourTypeMessages()} isTh={false} />);
    const groupHeaders = screen.getAllByRole('button', { expanded: true });
    expect(groupHeaders.map((el) => el.textContent)).toEqual([
      'Error1',
      'Warning2',
      'Approve1',
      'Information1',
    ]);
  });

  it('collapsing a group hides its cards but keeps the header visible', () => {
    render(<MessagesTab messages={fourTypeMessages()} isTh={false} />);
    expect(screen.getByText('Warning title')).toBeInTheDocument();
    expect(screen.getByText('Warning title 2')).toBeInTheDocument();

    const warningHeader = screen.getByRole('button', { name: /Warning/, expanded: true });
    fireEvent.click(warningHeader);

    expect(screen.queryByText('Warning title')).not.toBeInTheDocument();
    expect(screen.queryByText('Warning title 2')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Warning/, expanded: false })).toBeInTheDocument();
    // Other groups stay expanded and visible.
    expect(screen.getByText('Error title')).toBeInTheDocument();
  });

  it('filtering to a single type shows only that type\'s group', () => {
    render(<MessagesTab messages={fourTypeMessages()} isTh={false} />);
    (['Error', 'Approve', 'Information'] as const).forEach((label) => {
      fireEvent.click(screen.getByRole('button', { name: label, pressed: true }));
    });

    expect(screen.queryByText('Error title')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve title')).not.toBeInTheDocument();
    expect(screen.queryByText('Info title')).not.toBeInTheDocument();
    expect(screen.getByText('Warning title')).toBeInTheDocument();
    expect(screen.getByText('Warning title 2')).toBeInTheDocument();
  });

  it('shows the filtered empty-state copy when every type is deselected', () => {
    render(<MessagesTab messages={fourTypeMessages()} isTh={false} />);
    (['Error', 'Warning', 'Approve', 'Information'] as const).forEach((label) => {
      fireEvent.click(screen.getByRole('button', { name: label, pressed: true }));
    });
    expect(screen.getByText('No messages match the selected filter')).toBeInTheDocument();
  });

  it('the "All" chip resets the filter back to every type', () => {
    render(<MessagesTab messages={fourTypeMessages()} isTh={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Error', pressed: true }));
    expect(screen.queryByText('Error title')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Error title')).toBeInTheDocument();
    expect(screen.getByText('Warning title')).toBeInTheDocument();
    expect(screen.getByText('Approve title')).toBeInTheDocument();
    expect(screen.getByText('Info title')).toBeInTheDocument();
  });
});
