import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Role } from '@/lib/rbac';
import type { PendingRequest } from '@/lib/quick-approve-api';

// workflow-approvals — shared Zustand store for personal-info change requests.
//
// Per BRD #166 + code comment at ess/profile/edit/page.tsx ("รอ SPD อนุมัติ"),
// the canonical chain for a personal-info change is ONE step:
//   Employee submit → pending_spd → approved | rejected
//
// Earlier drafts routed requests through manager → hrbp → spd. That was an
// enterprise-style assumption, not grounded in Cnext's BRD. Leave / lifecycle
// workflows (Manager approves leave, HRBP manages lifecycle) are separate
// queues handled by different stores — not this one.

export type ApprovalStep = 'pending_spd' | 'approved' | 'rejected';

export type FieldDiff = {
  /** Dotted path, e.g. 'contact.phone' / 'names.lastNameLocal' */
  path: string;
  /** Human-readable Thai label (already resolved at submit-time for display) */
  label: string;
  before: string;
  after: string;
};

export type Attachment = {
  filename: string;
  mimeType: string;
  size: number;
  /** Data URL (base64). Persisted in localStorage — keep files under 5 MB. */
  dataUrl: string;
};

export type AuditEntry = {
  actorRole: Role;
  actorName: string;
  action: 'submit' | 'approve' | 'reject';
  comment?: string;
  at: string; // ISO timestamp
};

export type ApprovalRequest = {
  id: string; // WF-YYYYMMDD-HHMMSS-<rand>
  type: 'personal_info_change';
  employeeId: string;
  employeeName: string;
  submittedBy: { id: string; name: string; role: Role };
  submittedAt: string;
  status: ApprovalStep;
  diffs: FieldDiff[];
  /** Required for name changes (marriage cert / deed poll / nationality cert). */
  attachments?: Attachment[];
  audit: AuditEntry[];
  /**
   * PR-1b: canonical queue-row snapshot carried verbatim for the unified inbox.
   * Present only on change_request rows seeded from APPROVAL_SEED_BY_TYPE so the
   * live inbox reconstructs the SAME display row.
   */
  queueSnapshot?: PendingRequest;
};

interface WorkflowState {
  requests: ApprovalRequest[];
  addRequest: (
    r: Omit<ApprovalRequest, 'id' | 'submittedAt' | 'status' | 'audit'>,
  ) => string;
  approve: (id: string, by: { role: Role; name: string }, comment?: string) => void;
  reject: (id: string, by: { role: Role; name: string }, reason: string) => void;
  /**
   * PR-1b: init-overwrite-empties seed. Receives the canonical change_request
   * queue rows; combines them with the legacy personal-info demo rows (which
   * other surfaces read) so this store has a SINGLE fixture source (plan R1).
   */
  seedFromQueue: (rows: PendingRequest[]) => void;
  /** Dev/demo reset — wipes the list */
  clear: () => void;
}

// Legacy personal-info-change demo rows — relocated here from demo-seed.ts so
// the workflow store owns its single fixture source (plan R1). These are NOT
// part of the 20 canonical queue rows; they back requests/ + workflows/ surfaces.
const LEGACY_PERSONAL_INFO_REQUESTS: ApprovalRequest[] = [
  {
    id: 'WF-20260424-0842-A3FX',
    type: 'personal_info_change',
    employeeId: 'EMP-0142',
    employeeName: 'กมลรัตน์ จันทร์แดง',
    submittedBy: { id: 'EMP-0142', name: 'กมลรัตน์ จันทร์แดง', role: 'employee' },
    submittedAt: '2026-04-24T08:42:00+07:00',
    status: 'pending_spd',
    diffs: [
      { path: 'contact.phone', label: 'เบอร์โทรศัพท์', before: '081-234-5678', after: '089-876-5432' },
      {
        path: 'contact.addressLine1',
        label: 'ที่อยู่',
        before: '123/4 ซอยสุขุมวิท 23 คลองเตย กรุงเทพ',
        after: '789/12 ซอยรัชดา 42 ห้วยขวาง กรุงเทพ',
      },
      { path: 'attributes.maritalStatus', label: 'สถานภาพสมรส', before: 'โสด', after: 'สมรส' },
    ],
    audit: [
      {
        actorRole: 'employee',
        actorName: 'กมลรัตน์ จันทร์แดง',
        action: 'submit',
        comment: 'แต่งงานเมื่อเดือนที่แล้ว ขออัปเดตที่อยู่ใหม่ด้วย',
        at: '2026-04-24T08:42:00+07:00',
      },
    ],
  },
  {
    id: 'WF-20260424-1015-B2KQ',
    type: 'personal_info_change',
    employeeId: 'EMP-0087',
    employeeName: 'ธนวัฒน์ สุขเกษม',
    submittedBy: { id: 'EMP-0087', name: 'ธนวัฒน์ สุขเกษม', role: 'employee' },
    submittedAt: '2026-04-24T10:15:00+07:00',
    status: 'pending_spd',
    diffs: [
      {
        path: 'emergencyContact.name',
        label: 'ผู้ติดต่อฉุกเฉิน (ชื่อ)',
        before: 'นางสาวสุนิสา ว.',
        after: 'นางสุนิสา สุขเกษม',
      },
      {
        path: 'emergencyContact.phone',
        label: 'ผู้ติดต่อฉุกเฉิน (เบอร์)',
        before: '086-111-2222',
        after: '081-999-8877',
      },
    ],
    audit: [
      {
        actorRole: 'employee',
        actorName: 'ธนวัฒน์ สุขเกษม',
        action: 'submit',
        at: '2026-04-24T10:15:00+07:00',
      },
    ],
  },
  {
    id: 'WF-20260422-1430-C9PM',
    type: 'personal_info_change',
    employeeId: 'EMP-0031',
    employeeName: 'สมศรี พรมใจดี',
    submittedBy: { id: 'EMP-0031', name: 'สมศรี พรมใจดี', role: 'employee' },
    submittedAt: '2026-04-22T14:30:00+07:00',
    status: 'approved',
    diffs: [
      { path: 'contact.email', label: 'อีเมลส่วนตัว', before: 'somsri.old@gmail.com', after: 'somsri.p@outlook.com' },
    ],
    audit: [
      {
        actorRole: 'employee',
        actorName: 'สมศรี พรมใจดี',
        action: 'submit',
        at: '2026-04-22T14:30:00+07:00',
      },
      {
        actorRole: 'spd',
        actorName: 'ดารณี ล. (SPD)',
        action: 'approve',
        comment: 'ยืนยันเอกสารแนบแล้ว',
        at: '2026-04-22T16:45:00+07:00',
      },
    ],
  },
];

/** Build a native change_request ApprovalRequest carrying its queue snapshot. */
function queueRowToWorkflowRequest(row: PendingRequest): ApprovalRequest {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const diffs: FieldDiff[] = Array.isArray(details.fieldDiffs)
    ? (details.fieldDiffs as Array<Record<string, unknown>>).map((d) => ({
        path: String(d.field ?? ''),
        label: String(d.label ?? ''),
        before: String(d.before ?? ''),
        after: String(d.after ?? ''),
      }))
    : [];
  return {
    id: row.id,
    type: 'personal_info_change',
    employeeId: row.requester.id,
    employeeName: row.requester.name,
    submittedBy: { id: row.requester.id, name: row.requester.name, role: 'employee' },
    submittedAt: row.submittedAt,
    status: 'pending_spd',
    diffs,
    audit: [
      {
        actorRole: 'employee',
        actorName: row.requester.name,
        action: 'submit',
        at: row.submittedAt,
      },
    ],
    queueSnapshot: row,
  };
}

// 1-step chain — SPD is the sole approver. `approve()` jumps straight to
// 'approved' regardless of who clicks. Kept as a function for future
// multi-step workflows without reshaping the call sites.
function nextStep(_current: ApprovalStep): ApprovalStep {
  return 'approved';
}

function generateId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WF-${ts}-${rand}`;
}

export const useWorkflowApprovals = create<WorkflowState>()(
  persist(
    (set) => ({
      requests: [],
      addRequest: (payload) => {
        const id = generateId();
        const now = new Date().toISOString();
        const req: ApprovalRequest = {
          ...payload,
          id,
          submittedAt: now,
          status: 'pending_spd',
          audit: [
            {
              actorRole: payload.submittedBy.role,
              actorName: payload.submittedBy.name,
              action: 'submit',
              at: now,
            },
          ],
        };
        set((state) => ({ requests: [req, ...state.requests] }));
        return id;
      },
      approve: (id, by, comment) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id
              ? r
              : {
                  ...r,
                  status: nextStep(r.status),
                  audit: [
                    ...r.audit,
                    {
                      actorRole: by.role,
                      actorName: by.name,
                      action: 'approve',
                      comment,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      reject: (id, by, reason) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id
              ? r
              : {
                  ...r,
                  status: 'rejected',
                  audit: [
                    ...r.audit,
                    {
                      actorRole: by.role,
                      actorName: by.name,
                      action: 'reject',
                      comment: reason,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      seedFromQueue: (rows) =>
        set((state) =>
          // init-overwrite-empties: queue change_request rows first (visible in
          // the unified inbox), then the legacy personal-info demo rows.
          state.requests.length === 0
            ? {
                requests: [
                  ...rows.map(queueRowToWorkflowRequest),
                  ...LEGACY_PERSONAL_INFO_REQUESTS,
                ],
              }
            : state,
        ),
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'cnext-workflow-approvals',
      version: 1, // PR-1b: bumped alongside the rehydrate-to-seed persist contract.
      storage: createJSONStorage(() => localStorage),
      // PR-1b persist contract (rehydrate-to-seed): drop persisted requests on
      // every rehydrate; ensureDemoSeed refills from the single fixture source.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<WorkflowState>;
        return { ...currentState, ...persisted, requests: [] };
      },
    },
  ),
);

export const STEP_LABEL: Record<ApprovalStep, string> = {
  pending_spd: 'รอ SPD อนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
};
