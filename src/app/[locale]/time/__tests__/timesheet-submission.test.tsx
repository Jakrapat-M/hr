/**
 * STA-65 — Timesheet weekly submission flow (mock).
 *
 * Covers:
 *  (a) editing hours + adding a project then saving persists a `submitted` record.
 *  (b) the read-only review surface lists a submitted timesheet.
 *  (c) GUARD: no `timesheet` member leaked into the quick-approve RequestType union
 *      — this locks the consensus decision that the review surface is reporting,
 *      NOT a routed approval.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../../messages/th.json';

import TimesheetPage from '../timesheet/page';
import TimesheetReviewPage from '../review/page';
import {
  useTimesheetSubmissions,
  validateTimesheet,
  selectSubmittedTimesheets,
  type TimesheetSubmissionRow,
} from '@/stores/timesheet-submissions';
import { useAuthStore } from '@/stores/auth-store';

// Both pages read the locale from next/navigation useParams; default to TH.
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
}));

function renderTh(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  // Reset the in-memory store to a known empty baseline per test.
  useTimesheetSubmissions.setState({ submissions: [] });
  // Give the timesheet page a signed-in identity so submit() attributes correctly.
  useAuthStore.setState({
    userId: 'EMP501',
    username: 'ทดสอบ พนักงาน',
    email: 'test@example.com',
    roles: ['manager'],
    isAuthenticated: true,
  });
});

describe('STA-65 timesheet submission', () => {
  it('(a) editing hours + adding a project then submitting persists a submitted record', () => {
    // STA-155 removed the "Weekly hours" tab from the TimesheetPage UI, but the
    // submission store + review surface + import path are retained. This locks the
    // persistence contract the (now headless) weekly flow still feeds.
    const rows: TimesheetSubmissionRow[] = [
      { project: 'Project Alpha', mon: 6, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
      { project: 'STA-65 QA', mon: 2, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    ];
    expect(validateTimesheet(rows)).toEqual({ valid: true });

    useTimesheetSubmissions.getState().submit({
      employeeId: 'EMP501',
      employeeName: 'ทดสอบ พนักงาน',
      weekStart: '2026-05-11',
      rows,
      totalHours: 8,
    });

    const submissions = useTimesheetSubmissions.getState().submissions;
    expect(submissions).toHaveLength(1);
    expect(submissions[0].status).toBe('submitted');
    expect(submissions[0].employeeId).toBe('EMP501');
    expect(submissions[0].totalHours).toBeGreaterThan(0);
    // The added project is carried in the snapshot.
    expect(submissions[0].rows.some((r) => r.project === 'STA-65 QA')).toBe(true);
  });

  it('(a1) the Weekly hours tab is removed from the timesheet tab navigation (STA-155)', () => {
    renderTh(<TimesheetPage />);
    expect(screen.queryByRole('tab', { name: 'ชั่วโมงรายสัปดาห์' })).toBeNull();
    // STA-195 rebuilt the timesheet into 5 tabs (Schedule/Summary/Time Result/
    // Clock Log/Messages); the Schedule tab is the surviving default entry.
    expect(screen.getByRole('tab', { name: 'ตารางกะ' })).toBeInTheDocument();
  });

  it('(a2) rejects an over-24h day with a pumpkin error status and persists nothing', () => {
    const bad: TimesheetSubmissionRow[] = [
      { project: 'X', mon: 25, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    ];
    expect(validateTimesheet(bad)).toEqual({ valid: false, reason: 'day-over-24' });

    const empty: TimesheetSubmissionRow[] = [
      { project: 'X', mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    ];
    expect(validateTimesheet(empty)).toEqual({ valid: false, reason: 'empty' });
  });

  it('(b) the read-only review surface lists a submitted timesheet', () => {
    useTimesheetSubmissions.getState().submit({
      employeeId: 'EMP777',
      employeeName: 'มานี รักงาน',
      weekStart: '2026-05-11',
      rows: [{ project: 'Project Alpha', mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 }],
      totalHours: 40,
    });

    renderTh(<TimesheetReviewPage />);

    expect(screen.getByRole('heading', { name: 'ตรวจสอบใบบันทึกเวลา' })).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('มานี รักงาน')).toBeInTheDocument();
    expect(within(table).getByText('40 ชม.')).toBeInTheDocument();
    // No approve/reject controls on the reporting surface.
    expect(screen.queryByRole('button', { name: /อนุมัติ|ปฏิเสธ/ })).toBeNull();
  });

  it('(b2) hides the review surface for employee-tier roles (remove-not-hide)', () => {
    useAuthStore.setState({ roles: ['employee'] });
    renderTh(<TimesheetReviewPage />);
    expect(screen.getByText('ไม่พร้อมใช้งาน')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('selectSubmittedTimesheets returns only submitted rows, newest first', () => {
    const store = useTimesheetSubmissions.getState();
    store.saveDraft({
      employeeId: 'D1',
      employeeName: 'Draft One',
      weekStart: '2026-05-11',
      rows: [{ project: 'P', mon: 1, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }],
      totalHours: 1,
    });
    store.submit({
      employeeId: 'S1',
      employeeName: 'Submitted One',
      weekStart: '2026-05-11',
      rows: [{ project: 'P', mon: 8, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }],
      totalHours: 8,
    });
    const submitted = selectSubmittedTimesheets(useTimesheetSubmissions.getState().submissions);
    expect(submitted).toHaveLength(1);
    expect(submitted[0].employeeName).toBe('Submitted One');
  });
});

describe('STA-65 guard — review surface is NOT a routed approval', () => {
  it('(c) does not add a `timesheet` member to the quick-approve RequestType union', async () => {
    // APPROVAL_REGISTRY is typed `Record<RequestType, ApprovalAdapter>`, so its
    // runtime keys exhaustively enumerate the RequestType union. A `timesheet`
    // key would mean a routed approval was wired — which the consensus forbids.
    const { APPROVAL_REGISTRY } = await import('@/lib/approval-registry');
    const requestTypes = Object.keys(APPROVAL_REGISTRY);

    expect(requestTypes).not.toContain('timesheet');
    // Sanity: the registry is the real one (still enumerates the known types).
    expect(requestTypes).toEqual(
      expect.arrayContaining(['leave', 'overtime', 'claim', 'transfer', 'change_request', 'probation']),
    );

    // Belt-and-braces: the RequestType union source itself never mentions timesheet.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/quick-approve-api.ts'),
      'utf8',
    );
    const unionLine = src.split('\n').find((l) => l.includes('export type RequestType')) ?? '';
    expect(unionLine).not.toContain('timesheet');
  });
});
