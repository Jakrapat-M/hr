import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Role } from '@/lib/rbac';
import type { AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone';
import {
  deriveTermination,
  normalizeTerminationReason,
  type TerminationReasonCode,
  type TerminationRequestSourceRoute,
  type TerminationRequestSubmitterRole,
  type TerminationVoluntary,
} from '@/lib/termination-request';
import { migrateTerminationApprovals } from './termination-approvals-migration';
export { TERMINATION_REASON_LABEL } from '@/lib/termination-request';
export type { TerminationReasonCode } from '@/lib/termination-request';
export { migrateTerminationApprovals } from './termination-approvals-migration';
export { TERMINATION_STEP_BADGE_TONE, TERMINATION_STEP_LABEL, TERMINATION_STEP_LABEL_I18N } from './termination-approval-labels';

// termination-approvals — Zustand+persist store for ESS termination requests.
//
// Chain 1 (BRD #172): Employee submits resignation → pending_manager → Manager approves
//   → pending_spd → SPD approves/rejects → done. Either step can reject.
// Reason codes sourced from SF zVoluntary picklist (sf-extract/qas-fields-2026-04-25).
// 17 codes total: 16 TERM_* from zVoluntary + TERM_OTHER.

export type TerminationStep = 'pending_manager' | 'pending_spd' | 'approved' | 'rejected' | 'sent_back' | 'withdrawn';

export type TerminationActorRole = Role | 'hr';

export type TerminationAuditEntry = {
  actorRole: TerminationActorRole;
  actorName: string;
  action: 'submit' | 'approve' | 'reject' | 'send_back' | 'resubmit' | 'withdraw';
  comment?: string;
  at: string; // ISO timestamp
};

export type TerminationRequest = {
  id: string; // TR-YYYYMMDD-HHMMSS-<rand>
  employeeId: string;
  employeeName: string;
  requestedLastDay: string; // ISO date YYYY-MM-DD
  terminationDate?: string;
  reasonCode: TerminationReasonCode;
  reasonText?: string;
  reasonForTermination?: string;
  voluntary?: TerminationVoluntary;
  transferOutTo?: string;
  okToRehire?: boolean;
  additionalInfo?: string;
  personalEmail?: string; // STA-247 — ESS resignation field parity with termination
  attachments?: AttachedFile[]; // STA-247 — was filenames-only string[]; now multi-file (AttachmentDropzone)
  status: TerminationStep;
  sentBackFrom?: Extract<TerminationStep, 'pending_manager' | 'pending_spd'>;
  submittedAt: string; // ISO timestamp
  submittedBy: { id: string; name: string; role: TerminationRequestSubmitterRole };
  sourceRoute?: TerminationRequestSourceRoute;
  audit: TerminationAuditEntry[];
};

interface TerminationApprovalsState {
  requests: TerminationRequest[];
  addRequest: (r: Omit<TerminationRequest, 'id' | 'submittedAt' | 'status' | 'audit' | 'sourceRoute'> & { sourceRoute?: TerminationRequestSourceRoute }) => string;
  approveByManager: (id: string, by: { role: 'manager'; name: string }, comment?: string) => void;
  approve: (id: string, by: { role: TerminationActorRole; name: string }, comment?: string) => void;
  reject: (id: string, by: { role: TerminationActorRole; name: string }, reason: string) => void;
  sendBack: (id: string, note: string, actor: { role: TerminationActorRole; name: string }) => void;
  updateRequest: (id: string, patch: Partial<Omit<TerminationRequest, 'id' | 'submittedAt' | 'audit'>>) => void;
  resubmit: (id: string) => void;
  withdraw: (id: string) => void;
  clear: () => void;
}

function generateTermId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TR-${ts}-${rand}`;
}

export const useTerminationApprovals = create<TerminationApprovalsState>()(
  persist(
    (set) => ({
      requests: [],
      addRequest: (payload) => {
        const id = generateTermId();
        const now = new Date().toISOString();
        const req: TerminationRequest = {
          ...payload,
          id,
          submittedAt: now,
          status: 'pending_manager',
          reasonCode: normalizeTerminationReason(payload.reasonCode),
          terminationDate: payload.terminationDate ?? deriveTermination(payload.requestedLastDay).terminationDate,
          sourceRoute: payload.sourceRoute ?? 'ess',
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
      approveByManager: (id, by, comment) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id || r.status !== 'pending_manager'
              ? r
              : {
                  ...r,
                  status: 'pending_spd' as TerminationStep,
                  audit: [
                    ...r.audit,
                    {
                      actorRole: by.role as Role,
                      actorName: by.name,
                      action: 'approve' as const,
                      comment,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      approve: (id, by, comment) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id || r.status !== 'pending_spd'
              ? r
              : {
                  ...r,
                  status: 'approved' as TerminationStep,
                  audit: [
                    ...r.audit,
                    {
                      actorRole: by.role,
                      actorName: by.name,
                      action: 'approve' as const,
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
            r.id !== id || (r.status !== 'pending_manager' && r.status !== 'pending_spd')
              ? r
              : {
                  ...r,
                  status: 'rejected' as TerminationStep,
                  audit: [
                    ...r.audit,
                    {
                      actorRole: by.role,
                      actorName: by.name,
                      action: 'reject' as const,
                      comment: reason,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      sendBack: (id, note, actor) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id || (r.status !== 'pending_manager' && r.status !== 'pending_spd')
              ? r
              : {
                  ...r,
                  status: 'sent_back' as TerminationStep,
                  sentBackFrom: r.status,
                  audit: [
                    ...r.audit,
                    {
                      actorRole: actor.role,
                      actorName: actor.name,
                      action: 'send_back' as const,
                      comment: note,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      updateRequest: (id, patch) =>
        set((state) => ({
          requests: state.requests.map((r) => {
            if (r.id !== id) return r;
            const requestedLastDay = patch.requestedLastDay ?? r.requestedLastDay;
            return {
              ...r,
              ...patch,
              reasonCode: patch.reasonCode ? normalizeTerminationReason(patch.reasonCode) : r.reasonCode,
              requestedLastDay,
              terminationDate: patch.terminationDate ?? deriveTermination(requestedLastDay).terminationDate,
            };
          }),
        })),
      resubmit: (id) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id || r.status !== 'sent_back'
              ? r
              : {
                  ...r,
                  status: 'pending_manager' as TerminationStep,
                  sentBackFrom: undefined,
                  audit: [
                    ...r.audit,
                    {
                      actorRole: r.submittedBy.role,
                      actorName: r.submittedBy.name,
                      action: 'resubmit' as const,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      withdraw: (id) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id || r.status === 'approved' || r.status === 'withdrawn'
              ? r
              : {
                  ...r,
                  status: 'withdrawn' as TerminationStep,
                  audit: [
                    ...r.audit,
                    {
                      actorRole: r.submittedBy.role,
                      actorName: r.submittedBy.name,
                      action: 'withdraw' as const,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'cnext-termination-approvals',
      storage: createJSONStorage(() => localStorage),
      // See migrateTerminationApprovals() above for why this migration exists.
      version: 2,
      migrate: (persisted: unknown, version) => migrateTerminationApprovals(persisted, version),
    },
  ),
);
