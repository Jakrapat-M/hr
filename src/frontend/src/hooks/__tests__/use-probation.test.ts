import { describe, it, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useProbationCase, STATUS_LABEL } from '../use-probation';

// PB-002 is the seeded pending_hr case; PB-005 is the seeded exempt case
// (isProbationExempt: true, hireDate '2026-05-04').
async function loadCase(id: string) {
  const view = renderHook(() => useProbationCase(id));
  await waitFor(() => expect(view.result.current.probationCase).not.toBeNull());
  return view;
}

describe('useProbationCase — STA-23 HRBP send-back + exempt shortcut', () => {
  it('STATUS_LABEL covers the new sent_back key (TH)', () => {
    expect(STATUS_LABEL.sent_back).toBe('ส่งกลับหัวหน้างาน');
    // pending_hr relabelled to HRBP wording
    expect(STATUS_LABEL.pending_hr).toBe('รอ HRBP');
  });

  it('sendBackToManager sets status sent_back and appends a manager-visible timeline entry', async () => {
    const { result } = await loadCase('PB-002');
    const before = result.current.probationCase!.timeline.length;

    act(() => result.current.sendBackToManager('กรุณาแนบผลประเมินให้ครบ'));

    await waitFor(() => expect(result.current.probationCase!.status).toBe('sent_back'));
    const tl = result.current.probationCase!.timeline;
    expect(tl.length).toBe(before + 1);
    const last = tl[tl.length - 1];
    expect(last.actorRole).toBe('HRBP');
    expect(last.action).toContain('HRBP ส่งกลับให้หัวหน้างาน');
    expect(last.action).toContain('กรุณาแนบผลประเมินให้ครบ');
  });

  it('hrbpApprove sets status approved + logs HRBP approval', async () => {
    const { result } = await loadCase('PB-002');
    act(() => result.current.hrbpApprove());
    await waitFor(() => expect(result.current.probationCase!.status).toBe('approved'));
    const actions = result.current.probationCase!.timeline.map((t) => t.action);
    expect(actions.some((a) => a.includes('HRBP อนุมัติ'))).toBe(true);
  });

  it('exempt case mark-passed pre-fills hire date and submits a pass outcome', async () => {
    const { result } = await loadCase('PB-005');
    const c = result.current.probationCase!;
    expect(c.isProbationExempt).toBe(true);
    const hireDate = c.hireDate;

    act(() => result.current.markExemptPassed());

    await waitFor(() => expect(result.current.probationCase!.status).toBe('approved'));
    const tl = result.current.probationCase!.timeline;
    const passEntry = tl.find((t) => t.outcome === 'pass_normal');
    expect(passEntry).toBeDefined();
    expect(passEntry!.effectiveDate).toBe(hireDate);
    expect(passEntry!.action).toContain('ยกเว้นทดลองงาน');
  });
});
