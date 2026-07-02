// lib/time/my-requests.ts — STA-183
//
// Pure adapter that unifies the three employee-facing Time & Attendance request
// stores (leave / overtime / time-correction) into ONE row model for the
// self-service "My Request / คำขอของฉัน" page. No React, no store subscriptions,
// no `new Date()` at module scope — the caller passes the store arrays + a
// reference date so the whole thing stays deterministic + unit-testable.
//
// STRICT owner-filter: every mapper drops rows that do not belong to the passed
// `employeeId`. There is NO fallback-to-others (unlike ess/workflows'
// MOCK_ESS_REQUESTS) — an employee only ever sees their OWN requests.

import { leaveStageLabel, type LeaveRequest } from '@/stores/leave-approvals';
import { OT_STATUS_LABEL, type OTRequest } from '@/stores/overtime-requests';
import {
  CORRECTION_TYPE_LABEL,
  TIME_CORRECTION_STEP_LABEL,
  type TimeCorrectionRequest,
} from '@/stores/time-corrections';
import { getLeaveType } from '@/lib/time/leave-types';
import { isCancellableByCycle } from '@/lib/time/period';

export type MyRequestType = 'leave' | 'ot' | 'time_correction';
export type MyRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface MyRequestRow {
  id: string;
  type: MyRequestType;
  /** ISO timestamp the request was submitted. */
  submittedDate: string;
  /** ISO date (YYYY-MM-DD) the request starts. */
  startDate: string;
  /** ISO date (YYYY-MM-DD) the request ends (== startDate for single-day). */
  endDate: string;
  /** Free-text summary — localize at render (kept bilingual so the adapter is pure). */
  detail: { th: string; en: string };
  /** Collapsed status → drives the badge variant + the status filter. */
  status: MyRequestStatus;
  /** Narrated bilingual status label (leave narrates the awaitingNext stage). */
  statusLabel: { th: string; en: string };
  /** Cancellable iff not terminal AND the start date is in the cycle window. */
  cancellable: boolean;
  /** Back-reference to the source store record. */
  raw: { kind: MyRequestType; id: string };
}

function cancellableFor(status: MyRequestStatus, startDate: string, refDate?: Date): boolean {
  if (status === 'rejected' || status === 'cancelled') return false;
  return isCancellableByCycle(startDate, refDate);
}

function leaveToRow(r: LeaveRequest, refDate?: Date): MyRequestRow {
  const def = getLeaveType(r.leaveCode ?? '');
  const nameTh = def?.nameTh ?? r.leaveType;
  const nameEn = def?.nameEn ?? r.leaveType;
  const reason = r.reason?.trim();
  const status = r.status as MyRequestStatus;
  return {
    id: r.id,
    type: 'leave',
    submittedDate: r.submittedAt,
    startDate: r.startDate,
    endDate: r.endDate || r.startDate,
    detail: {
      th: reason ? `${nameTh} · ${reason}` : nameTh,
      en: reason ? `${nameEn} · ${reason}` : nameEn,
    },
    status,
    statusLabel: {
      th: leaveStageLabel(r.status, r.awaitingNext, true),
      en: leaveStageLabel(r.status, r.awaitingNext, false),
    },
    cancellable: cancellableFor(status, r.startDate, refDate),
    raw: { kind: 'leave', id: r.id },
  };
}

function otToRow(r: OTRequest, refDate?: Date): MyRequestRow {
  const startDate = (r.startAt ?? '').slice(0, 10);
  const endDate = (r.endAt ?? r.startAt ?? '').slice(0, 10) || startDate;
  const reason = r.reason?.trim();
  const status = r.status as MyRequestStatus;
  const label = OT_STATUS_LABEL[r.status];
  return {
    id: r.id,
    type: 'ot',
    submittedDate: r.submittedAt,
    startDate,
    endDate,
    detail: {
      th: reason ? `${r.hours} ชม. · ${reason}` : `${r.hours} ชม.`,
      en: reason ? `${r.hours} h · ${reason}` : `${r.hours} h`,
    },
    status,
    statusLabel: { th: label.th, en: label.en },
    cancellable: cancellableFor(status, startDate, refDate),
    raw: { kind: 'ot', id: r.id },
  };
}

function tcToRow(r: TimeCorrectionRequest, refDate?: Date): MyRequestRow {
  // Normalize the store's 'pending_manager' step to the collapsed 'pending'.
  const status: MyRequestStatus = r.status === 'pending_manager' ? 'pending' : r.status;
  const typeLabel = CORRECTION_TYPE_LABEL[r.correctionType];
  const reason = r.reason?.trim();
  const label = TIME_CORRECTION_STEP_LABEL[r.status];
  return {
    id: r.id,
    type: 'time_correction',
    submittedDate: r.submittedAt,
    startDate: r.date,
    endDate: r.date,
    detail: {
      th: reason ? `${typeLabel.th} · ${reason}` : typeLabel.th,
      en: reason ? `${typeLabel.en} · ${reason}` : typeLabel.en,
    },
    status,
    statusLabel: { th: label.th, en: label.en },
    cancellable: cancellableFor(status, r.date, refDate),
    raw: { kind: 'time_correction', id: r.id },
  };
}

/**
 * Build the unified, owner-filtered, submitted-desc row list for one employee.
 * `refDate` is threaded into the cycle-window cancel rule (pass `demoToday()` on
 * the demo surfaces). Strict owner-filter in EACH mapper — never trust the caller.
 */
export function buildMyRequests(
  employeeId: string,
  stores: { leave: LeaveRequest[]; ot: OTRequest[]; tc: TimeCorrectionRequest[] },
  refDate?: Date,
): MyRequestRow[] {
  const rows: MyRequestRow[] = [
    ...stores.leave.filter((r) => r.employeeId === employeeId).map((r) => leaveToRow(r, refDate)),
    ...stores.ot.filter((r) => r.employeeId === employeeId).map((r) => otToRow(r, refDate)),
    ...stores.tc.filter((r) => r.employeeId === employeeId).map((r) => tcToRow(r, refDate)),
  ];
  return rows.sort(
    (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime(),
  );
}
