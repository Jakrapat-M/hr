import { beforeEach, describe, expect, it } from 'vitest';
import {
  migrateTerminationApprovals,
  useTerminationApprovals,
} from '@/stores/termination-approvals';

// STA-247 changed TerminationRequest.attachments from filenames-only string[]
// to AttachedFile[] ({id, name, size, type}). Browsers that persisted state
// before that change still hold the old string[] shape; migrateTerminationApprovals()
// must repair it on load so the resignation detail page's
// `<li key={file.id}>{file.name}</li>` render doesn't get an undefined key +
// blank filename.

const LEGACY_REQUEST = {
  id: 'TR-LEGACY-0001',
  employeeId: 'EMP-1',
  employeeName: 'Legacy Employee',
  requestedLastDay: '2026-05-31',
  reasonCode: 'TERM_RESIGN',
  attachments: ['resignation-letter.pdf', 'notice.pdf'],
  status: 'pending_manager',
  submittedAt: '2026-04-24T08:00:00.000Z',
  submittedBy: { id: 'EMP-1', name: 'Legacy Employee', role: 'employee' },
  audit: [],
};

describe('migrateTerminationApprovals', () => {
  it('converts legacy string[] attachments into AttachedFile[] objects', () => {
    const result = migrateTerminationApprovals({ requests: [LEGACY_REQUEST] }, 0);

    expect(result.requests[0].attachments).toEqual([
      { id: 'seed-att-0-resignation-letter.pdf', name: 'resignation-letter.pdf', size: 0, type: 'application/pdf' },
      { id: 'seed-att-1-notice.pdf', name: 'notice.pdf', size: 0, type: 'application/pdf' },
    ]);
  });

  it('leaves already-correct AttachedFile[] attachments untouched', () => {
    const modern = {
      ...LEGACY_REQUEST,
      attachments: [{ id: 'att-1', name: 'resignation-letter.pdf', size: 42_000, type: 'application/pdf' }],
    };

    const result = migrateTerminationApprovals({ requests: [modern] }, 0);

    expect(result.requests[0].attachments).toEqual(modern.attachments);
  });

  it('is a no-op once the persisted version is already current', () => {
    const persisted = { requests: [LEGACY_REQUEST] };

    const result = migrateTerminationApprovals(persisted, 2);

    // Still the old string[] shape — migration is skipped at version >= 1.
    expect(result.requests[0].attachments).toEqual(['resignation-letter.pdf', 'notice.pdf']);
  });

  it('handles missing/empty persisted state without throwing', () => {
    expect(migrateTerminationApprovals(undefined, 0)).toBeUndefined();
    expect(migrateTerminationApprovals({}, 0)).toEqual({});
  });

  it('handles requests with no attachments field at all', () => {
    const { attachments: _drop, ...noAttachments } = LEGACY_REQUEST;
    const result = migrateTerminationApprovals({ requests: [noAttachments] }, 0);

    expect(result.requests[0].attachments).toBeUndefined();
  });

  it('upgrades v1 requests to v2 derived termination fields and canonical reason codes', () => {
    const result = migrateTerminationApprovals({ requests: [LEGACY_REQUEST] }, 1);

    expect(result.requests[0]).toMatchObject({
      terminationDate: '2026-06-01',
      reasonCode: 'TERM_RESIGN',
      sourceRoute: 'ess',
    });
  });

  it('normalizes the legacy retirement typo during v2 migration', () => {
    const result = migrateTerminationApprovals(
      { requests: [{ ...LEGACY_REQUEST, reasonCode: 'TERM_RETRIE' }] },
      1,
    );

    expect(result.requests[0].reasonCode).toBe('TERM_RETIRE');
  });
});

describe('useTerminationApprovals lifecycle actions', () => {
  beforeEach(() => {
    useTerminationApprovals.setState({ requests: [] });
  });

  function addRequest(): string {
    return useTerminationApprovals.getState().addRequest({
      employeeId: 'EMP-1001',
      employeeName: 'Nalin Prasert',
      requestedLastDay: '2026-08-31',
      reasonCode: 'TERM_RESIGN',
      personalEmail: 'nalin@example.com',
      submittedBy: {
        id: 'EMP-1001',
        name: 'Nalin Prasert',
        role: 'employee',
      },
      sourceRoute: 'ess',
    });
  }

  it('sendBack marks the current stage, records note and audit entry', () => {
    const id = addRequest();

    useTerminationApprovals
      .getState()
      .sendBack(id, 'Please confirm final working date', { role: 'manager', name: 'Manager A' });

    const request = useTerminationApprovals.getState().requests[0];
    expect(request.status).toBe('sent_back');
    expect(request.sentBackFrom).toBe('pending_manager');
    expect(request.audit.at(-1)).toMatchObject({
      actorRole: 'manager',
      actorName: 'Manager A',
      action: 'send_back',
      comment: 'Please confirm final working date',
    });
  });

  it('updateRequest revises editable fields without changing status', () => {
    const id = addRequest();
    useTerminationApprovals
      .getState()
      .sendBack(id, 'Need details', { role: 'manager', name: 'Manager A' });

    useTerminationApprovals.getState().updateRequest(id, {
      requestedLastDay: '2026-09-15',
      reasonForTermination: 'RESIGN_FAMILY',
      additionalInfo: 'Updated family details',
    });

    const request = useTerminationApprovals.getState().requests[0];
    expect(request.status).toBe('sent_back');
    expect(request.requestedLastDay).toBe('2026-09-15');
    expect(request.reasonForTermination).toBe('RESIGN_FAMILY');
    expect(request.additionalInfo).toBe('Updated family details');
  });

  it('resubmit sends a sent-back request to manager approval and audits it', () => {
    const id = addRequest();
    useTerminationApprovals
      .getState()
      .sendBack(id, 'Need details', { role: 'manager', name: 'Manager A' });

    useTerminationApprovals.getState().resubmit(id);

    const request = useTerminationApprovals.getState().requests[0];
    expect(request.status).toBe('pending_manager');
    expect(request.sentBackFrom).toBeUndefined();
    expect(request.audit.at(-1)).toMatchObject({
      actorRole: 'employee',
      actorName: 'Nalin Prasert',
      action: 'resubmit',
    });
  });

  it('withdraw marks the request withdrawn and audits it', () => {
    const id = addRequest();

    useTerminationApprovals.getState().withdraw(id);

    const request = useTerminationApprovals.getState().requests[0];
    expect(request.status).toBe('withdrawn');
    expect(request.audit.at(-1)).toMatchObject({
      actorRole: 'employee',
      actorName: 'Nalin Prasert',
      action: 'withdraw',
    });
  });
});
