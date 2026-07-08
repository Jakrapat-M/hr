import type { Role } from '@/lib/rbac';
import type { AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone';
import {
  deriveTermination,
  normalizeTerminationReason,
  type TerminationRequestSourceRoute,
  type TerminationRequestSubmitterRole,
} from '@/lib/termination-request';
import type { TerminationRequest } from './termination-approvals';

type PersistedTerminationRequest = Omit<
  TerminationRequest,
  'attachments' | 'reasonCode' | 'sourceRoute' | 'submittedBy'
> & {
  attachments?: AttachedFile[] | string[];
  reasonCode: string;
  submittedBy?: { id: string; name: string; role: TerminationRequestSubmitterRole | Role };
  sourceRoute?: TerminationRequestSourceRoute;
};

function migrateAttachments(request: PersistedTerminationRequest): PersistedTerminationRequest {
  return {
    ...request,
    attachments: request.attachments?.map((file, i) =>
      typeof file === 'string'
        ? { id: `seed-att-${i}-${file}`, name: file, size: 0, type: 'application/pdf' }
        : file,
    ),
  };
}

function normalizeSubmittedBy(
  submittedBy: PersistedTerminationRequest['submittedBy'],
): TerminationRequest['submittedBy'] {
  const role = submittedBy?.role === 'hr_admin' || submittedBy?.role === 'hr_manager' || submittedBy?.role === 'hrbp' || submittedBy?.role === 'spd'
    ? 'hr'
    : submittedBy?.role ?? 'employee';
  return {
    id: submittedBy?.id ?? 'unknown',
    name: submittedBy?.name ?? 'Unknown',
    role,
  };
}

function isAttachedFile(file: AttachedFile | string): file is AttachedFile {
  return typeof file !== 'string';
}

function migrateToV2(request: PersistedTerminationRequest): TerminationRequest {
  return {
    ...request,
    reasonCode: normalizeTerminationReason(request.reasonCode),
    terminationDate: request.terminationDate ?? deriveTermination(request.requestedLastDay).terminationDate,
    submittedBy: normalizeSubmittedBy(request.submittedBy),
    sourceRoute: request.sourceRoute ?? 'ess',
    attachments: request.attachments?.filter(isAttachedFile),
  };
}

export function migrateTerminationApprovals(persisted: unknown, version: number) {
  const state = persisted as { requests?: PersistedTerminationRequest[] } | undefined;
  if (version >= 2 || !state?.requests) return state as { requests: TerminationRequest[] };
  const v1 = {
    ...state,
    requests: state.requests.map(migrateAttachments),
  };
  return {
    ...v1,
    requests: v1.requests.map(migrateToV2),
  };
}
