/**
 * SimpleClaimForm.editmode.test.tsx — STA-234
 * Additive edit-mode props (initialValues / initialAttachmentName / submitLabel /
 * initialDynamic) must prefill without changing byte-identical default behavior
 * when omitted.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── next-intl mock ────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useLocale: vi.fn().mockReturnValue('th'),
}));

// ── next/navigation mock ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/benefits-hub'),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

// ── Capability mock ───────────────────────────────────────────────────────────
vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    canSee: () => true,
    canDo: () => true,
    entities: {},
    actions: {},
    queueScope: 'enterprise',
  }),
}));

// ── cnext-profile-slice mock (FileUploadField dependency) ─────────────────────
const mockAddAttachment = vi.fn().mockReturnValue('att-test-id');
const mockRemoveAttachment = vi.fn();

vi.mock('@/stores/cnext-profile-slice', () => ({
  useCnextProfileStore: (selector: (s: unknown) => unknown) =>
    selector({ addAttachment: mockAddAttachment, removeAttachment: mockRemoveAttachment }),
}));

// ── auth-store mock ───────────────────────────────────────────────────────────
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ roles: ['hr_admin'] }),
}));

// ── lucide-react mock ─────────────────────────────────────────────────────────
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const stub = () => React.createElement('span', { 'data-testid': 'icon-stub' });
  const mocked: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) {
    mocked[key] = stub;
  }
  return mocked;
});

// ── cn mock ───────────────────────────────────────────────────────────────────
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { SimpleClaimForm } from '../SimpleClaimForm';
import { getPlan } from '@/data/benefits/plan-registry';

const DENTAL_PLAN = getPlan('BE-DEN-001')!; // simple-claim, requiresReceipt=true

beforeEach(() => {
  vi.clearAllMocks();
  mockAddAttachment.mockReturnValue('att-test-id');
});

describe('SimpleClaimForm — STA-234 edit mode', () => {
  it('prefills receiptNo / receiptAmount / remark from initialValues', () => {
    render(
      <SimpleClaimForm
        plan={DENTAL_PLAN}
        initialValues={{
          receiptNo: 'RCPT-cl-5',
          receiptDate: '2026-04-10',
          receiptAmount: '1500',
          claimAmount: '1500',
          remark: 'ต้องแนบใบเสร็จเพิ่ม',
        }}
      />,
    );

    expect((screen.getByLabelText(/เลขที่ใบเสร็จ/) as HTMLInputElement).value).toBe('RCPT-cl-5');
    expect((screen.getByLabelText(/จำนวนเงินตามใบเสร็จ/) as HTMLInputElement).value).toBe('1500');
    expect((screen.getByLabelText(/หมายเหตุ/) as HTMLTextAreaElement).value).toBe('ต้องแนบใบเสร็จเพิ่ม');
  });

  it('renders the submitLabel override on the submit button', () => {
    render(<SimpleClaimForm plan={DENTAL_PLAN} submitLabel="บันทึกการแก้ไข" />);
    expect(screen.getByRole('button', { name: 'บันทึกการแก้ไข' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' })).not.toBeInTheDocument();
  });

  it('renders the read-only existing-attachment chip when initialAttachmentName is set', () => {
    render(<SimpleClaimForm plan={DENTAL_PLAN} initialAttachmentName="opd-receipt.pdf" />);
    expect(screen.getByText('opd-receipt.pdf')).toBeInTheDocument();
    expect(screen.getByText(/ไฟล์แนบเดิม/)).toBeInTheDocument();
  });

  it('REGRESSION: with no new props, fields default to empty and the default submit label renders', () => {
    render(<SimpleClaimForm plan={DENTAL_PLAN} />);
    expect((screen.getByLabelText(/เลขที่ใบเสร็จ/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/จำนวนเงินตามใบเสร็จ/) as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' })).toBeInTheDocument();
    // No existing-attachment chip without initialAttachmentName.
    expect(screen.queryByText(/ไฟล์แนบเดิม/)).not.toBeInTheDocument();
  });

  // STA-234 follow-up — initialDynamic prefills required conditional selects
  // (e.g. medicalDental) so Edit can Save without a manual reselect.
  it('prefills the medicalDental conditional select from initialDynamic (dental row)', () => {
    render(<SimpleClaimForm plan={DENTAL_PLAN} initialDynamic={{ medicalDental: 'dental' }} />);
    const select = screen.getByLabelText(/การแพทย์ \/ ทันตกรรม/) as HTMLSelectElement;
    expect(select.value).toBe('dental');
  });

  it('REGRESSION: with no initialDynamic, the conditional select stays empty', () => {
    render(<SimpleClaimForm plan={DENTAL_PLAN} />);
    const select = screen.getByLabelText(/การแพทย์ \/ ทันตกรรม/) as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});
