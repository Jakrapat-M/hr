import { describe, it, expect } from 'vitest';
import { migrateTerminationApprovals } from '@/stores/termination-approvals';

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

    const result = migrateTerminationApprovals(persisted, 1);

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
});
