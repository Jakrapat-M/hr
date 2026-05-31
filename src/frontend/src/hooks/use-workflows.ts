'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  APPROVAL_REGISTRY,
  useQueueWorkflowRows,
  type QueueWorkflowRow,
} from '@/lib/approval-registry';

// use-workflows — PR-2 (clickable-HRMS) ORPHAN2 bridge.
//
// This hook used to own a 7th parallel mock (MOCK_WORKFLOWS in a local useState),
// disconnected from the 6 approval stores. It now derives the workflow list from
// the SAME canonical source as /quick-approve (useQueueWorkflowRows over
// selectPendingApprovals), and routes approve/reject through APPROVAL_REGISTRY so
// an approval in the manager queue flips the matching workflow row's status LIVE,
// no refresh (AC-2.1). The page's existing UI/return contract is preserved.

export type WorkflowType =
 |'leave'
 |'transfer'
 |'personal_info'
 |'payroll_change'
 |'resignation'
 |'overtime'
 |'time_correction';
export type WorkflowStatus ='pending' |'approved' |'rejected' |'sent_back';
export type WorkflowUrgency ='low' |'normal' |'high' |'critical';

export interface WorkflowStep {
 step: number;
 approverName: string;
 approverId: string;
 status: WorkflowStatus |'skipped';
 actionDate?: string;
 comment?: string;
}

export interface WorkflowItem {
 id: string;
 type: WorkflowType;
 typeLabel: string;
 requesterName: string;
 requesterId: string;
 department: string;
 description: string;
 submittedDate: string;
 effectiveDate?: string;
 urgency: WorkflowUrgency;
 status: WorkflowStatus;
 currentStep: number;
 totalSteps: number;
 steps: WorkflowStep[];
 details?: Record<string, string>;
 changes?: { field: string; oldValue: string; newValue: string }[];
}

// The canonical queue uses the 6 RequestType values. Map them onto the wider
// WorkflowType union the page renders (personal_info covers change_request).
const QUEUE_TYPE_TO_WORKFLOW_TYPE: Record<QueueWorkflowRow['type'], WorkflowType> = {
  leave: 'leave',
  overtime: 'overtime',
  claim: 'payroll_change',
  transfer: 'transfer',
  change_request: 'personal_info',
  probation: 'personal_info',
  pay_rate: 'payroll_change',
  tax_planning: 'payroll_change',
  time_correction: 'time_correction',
};

function queueRowToWorkflowItem(row: QueueWorkflowRow): WorkflowItem {
  return {
    id: row.id,
    type: QUEUE_TYPE_TO_WORKFLOW_TYPE[row.type],
    typeLabel: row.typeLabel,
    requesterName: row.requesterName,
    requesterId: row.requesterId,
    department: row.department,
    description: row.description,
    submittedDate: row.submittedDate,
    urgency: row.urgency,
    status: row.status,
    currentStep: row.currentStep,
    totalSteps: row.totalSteps,
    steps: row.steps.map((s) => ({
      step: s.step,
      approverName: s.approverName,
      approverId: s.approverId,
      status: s.status,
      actionDate: s.actionDate,
      comment: s.comment,
    })),
  };
}

const MANAGER_NAME = 'Manager';

export function useWorkflows() {
 // Canonical source — same rows /quick-approve renders. Live via Zustand subscribe.
 const queueRows = useQueueWorkflowRows('en');
 // Locally-created rows + sent_back overlay: the canonical model has no create /
 // sent_back path (only approve/reject), so these stay UI-only so the page's
 // Create modal + Sent-Back tab keep working without inventing store schema.
 const [localItems, setLocalItems] = useState<WorkflowItem[]>([]);
 const [sentBackIds, setSentBackIds] = useState<Set<string>>(() => new Set());

 const workflows = useMemo<WorkflowItem[]>(() => {
   const derived = queueRows.map(queueRowToWorkflowItem).map((w) =>
     sentBackIds.has(w.id) && w.status === 'pending' ? { ...w, status: 'sent_back' as const } : w,
   );
   return [...localItems, ...derived];
 }, [queueRows, localItems, sentBackIds]);

 const approveWorkflow = useCallback(async (id: string, comment?: string): Promise<void> => {
   const row = queueRows.find((r) => r.id === id);
   if (row) {
     void comment;
     await APPROVAL_REGISTRY[row.type].approve(id, { name: MANAGER_NAME, role: 'spd' });
     return;
   }
   // Locally-created row (no canonical store) — flip in the overlay.
   setLocalItems((prev) =>
     prev.map((w) =>
       w.id === id
         ? { ...w, status: 'approved' as const, steps: w.steps.map((s) => ({ ...s, status: 'approved' as const })) }
         : w,
     ),
   );
 }, [queueRows]);

 const rejectWorkflow = useCallback(async (id: string, comment?: string): Promise<void> => {
   const row = queueRows.find((r) => r.id === id);
   if (row) {
     await APPROVAL_REGISTRY[row.type].reject(id, { name: MANAGER_NAME, role: 'spd' }, comment ?? 'ปฏิเสธจาก workflows');
     return;
   }
   setLocalItems((prev) =>
     prev.map((w) => (w.id === id ? { ...w, status: 'rejected' as const } : w)),
   );
 }, [queueRows]);

 const sendBackWorkflow = useCallback(async (id: string, comment?: string): Promise<void> => {
   void comment;
   // No canonical sent_back state — record an in-session overlay so the row moves
   // to the Sent-Back tab without mutating the source store.
   setSentBackIds((prev) => {
     const next = new Set(prev);
     next.add(id);
     return next;
   });
   setLocalItems((prev) =>
     prev.map((w) => (w.id === id ? { ...w, status: 'sent_back' as const } : w)),
   );
 }, []);

 const createWorkflow = useCallback(async (item: WorkflowItem): Promise<void> => {
   // Create stays UI-only (the canonical queue is manager-inbound). Prepend so the
   // new request shows immediately in the For-Approval tab.
   setLocalItems((prev) => [{ ...item, status: 'pending' as const }, ...prev]);
 }, []);

 const pending = workflows.filter((w) => w.status ==='pending');
 const sentBack = workflows.filter((w) => w.status ==='sent_back');
 const approved = workflows.filter((w) => w.status ==='approved');
 const rejected = workflows.filter((w) => w.status ==='rejected');

 return {
 workflows,
 pending,
 sentBack,
 approved,
 rejected,
 loading: false,
 error: null as string | null,
 approveWorkflow,
 rejectWorkflow,
 sendBackWorkflow,
 createWorkflow,
 };
}
