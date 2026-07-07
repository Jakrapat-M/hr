// STA-232 — Messages tab: 4 message types (Error/Warning/Approve/Information),
// sorted by type priority first, then date (newest-first within a band).

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('sorts an unsorted mixed list by type priority (Error > Warning > Approve > Information), newest-first within a band', () => {
    const messages: TimesheetMessage[] = [
      msg({ level: 'information', titleEn: 'Info Old', dateRaw: '2026-05-25' }),
      msg({ level: 'approve', titleEn: 'Approve', dateRaw: '2026-06-01' }),
      msg({ level: 'warning', titleEn: 'Warning Old', dateRaw: '2026-05-28' }),
      msg({ level: 'error', titleEn: 'Error', dateRaw: '2026-06-05' }),
      msg({ level: 'warning', titleEn: 'Warning New', dateRaw: '2026-06-02' }),
    ];
    render(<MessagesTab messages={messages} isTh={false} />);
    const titles = screen
      .getAllByText(/^(Error|Warning New|Warning Old|Approve|Info Old)$/)
      .map((el) => el.textContent);
    expect(titles).toEqual(['Error', 'Warning New', 'Warning Old', 'Approve', 'Info Old']);
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

  it('renders the designated badge token class for each of the 4 types', () => {
    const messages: TimesheetMessage[] = [
      msg({ level: 'error', badgeEn: 'Error', titleEn: 'Error title' }),
      msg({ level: 'warning', badgeEn: 'Warning', titleEn: 'Warning title' }),
      msg({ level: 'approve', badgeEn: 'Approve', titleEn: 'Approve title' }),
      msg({ level: 'information', badgeEn: 'Information', titleEn: 'Information title' }),
    ];
    render(<MessagesTab messages={messages} isTh={false} />);
    expect(screen.getByText('Error')).toHaveClass('border-danger', 'bg-danger-soft', 'text-danger');
    expect(screen.getByText('Warning')).toHaveClass('border-warning', 'bg-warning-soft', 'text-warning');
    expect(screen.getByText('Approve')).toHaveClass('border-accent', 'bg-accent-soft', 'text-accent');
    expect(screen.getByText('Information')).toHaveClass('border-info', 'bg-info-soft', 'text-info');
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
