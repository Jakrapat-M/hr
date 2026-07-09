import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Role } from '@/lib/rbac';

// pay-rate-approvals — Zustand+persist store for STA-24 pay-rate change requests.
//
// Mirrors promotion-approvals shape. SPD review chain identical to promotion.
// TODO(STA-24): wire approve() to timeline events once PayRateChangeEvent exists
//               in @hrms/shared/types/timeline. Currently approve() only mutates
//               request status — no timeline write.

export type PayRateStep = 'pending_spd' | 'approved' | 'rejected';

export type PayRateAuditEntry = {
  actorRole: Role;
  actorName: string;
  action: 'submit' | 'approve' | 'reject';
  comment?: string;
  at: string; // ISO timestamp
};

export type PayRateAmountType = 'flat' | 'percent';

export type PayRateRecurringPayment = {
  payComponent: string;
  amount: number;
  currency: string;
  frequency: string;
};

export type PayRateRequest = {
  id: string; // PR-YYYYMMDD-HHMMSS-<rand>
  employeeId: string;
  employeeName: string;
  effectiveDate: string; // ISO date YYYY-MM-DD
  eventReasonCode: 'PRCHG_MERINC' | 'PRCHG_ADJPOS' | 'PRCHG_SALADJ' | 'PRCHG_SALCUT';
  /** Required only when eventReasonCode === 'PRCHG_SALADJ' */
  reasonForSalaryAdjustCode?: string;
  payGroup: string;
  payrollId: string;
  payComponent: string;
  amountType: PayRateAmountType;
  amount: number;
  currency: string;
  frequency: string; // currently fixed to 'Monthly'
  recurringPayments: PayRateRecurringPayment[];
  notes?: string;
  status: PayRateStep;
  submittedAt: string; // ISO timestamp
  submittedBy: { id: string; name: string; role: Role };
  audit: PayRateAuditEntry[];
};

export const PAY_RATE_STEP_LABEL: Record<PayRateStep, string> = {
  pending_spd: 'รอ SPD อนุมัติ',
  approved:    'อนุมัติแล้ว',
  rejected:    'ถูกปฏิเสธ',
};

interface PayRateApprovalsState {
  requests: PayRateRequest[];
  addRequest: (
    r: Omit<PayRateRequest, 'id' | 'submittedAt' | 'status' | 'audit'>,
  ) => string;
  approve: (id: string, by: { role: Role; name: string }, comment?: string) => void;
  reject: (id: string, by: { role: Role; name: string }, reason: string) => void;
  clear: () => void;
}

function generatePayRateRequestId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PR-${ts}-${rand}`;
}

export const usePayRateApprovals = create<PayRateApprovalsState>()(
  persist(
    (set) => ({
      requests: [],
      addRequest: (payload) => {
        const id = generatePayRateRequestId();
        const now = new Date().toISOString();
        const req: PayRateRequest = {
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
      approve: (id, by, comment) => {
        // TODO(STA-24): write PayRateChangeEvent to useTimelines once shared type lands.
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id
              ? r
              : {
                  ...r,
                  status: 'approved' as PayRateStep,
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
        }));
      },
      reject: (id, by, reason) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id
              ? r
              : {
                  ...r,
                  status: 'rejected' as PayRateStep,
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
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'cnext-pay-rate-approvals',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
