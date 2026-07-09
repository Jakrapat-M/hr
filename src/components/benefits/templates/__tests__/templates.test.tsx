/**
 * templates.test.tsx — Vitest + React Testing Library
 * Covers the 7 acceptance criteria listed in the task spec.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

// ── Capability mock — let everything through in tests ─────────────────────────
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

// ── auth-store mock (Capability dependency) ───────────────────────────────────
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ roles: ['hr_admin'] }),
}));

// ── lucide-react mock — pass through all icons as stub spans ──────────────────
// Use importOriginal so any icon QuickActionsTile or other cnext primitives need
// is automatically satisfied without listing them all by name.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const stub = () => React.createElement('span', { 'data-testid': 'icon-stub' });
  // Replace every named export that is a component with the stub
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

// ── Import components AFTER mocks ─────────────────────────────────────────────
import { SimpleClaimForm } from '../SimpleClaimForm';
import { HospitalClaimForm } from '../HospitalClaimForm';
import { RecordsFlatForm } from '../RecordsFlatForm';
import { RecordsComputedView } from '../RecordsComputedView';
import { LifecycleAdminForm } from '../LifecycleAdminForm';
import {
  pickTemplate,
  RecordsDependentForm,
} from '../index';

// ── Plan fixtures ──────────────────────────────────────────────────────────────
import {
  BENEFIT_PLAN_REGISTRY,
  getPlan,
} from '@/data/benefits/plan-registry';

const OPD_PLAN = getPlan('BE-MED-001')!;   // simple-claim, requiresReceipt=true
const IPD_REFERRAL_PLAN = getPlan('BE-MED-002')!; // hospital-claim, requiresReceipt=false
const IPD_DEPENDENT_PLAN = getPlan('BE-MED-004')!; // hospital-claim, requiresDependent=true
const FUNERAL_EMPLOYEE_PLAN = getPlan('BE-FUN-001')!; // records-flat
const FUNERAL_SPOUSE_PLAN = getPlan('BE-FUN-002')!; // records-dependent
const LIFE_INFO_PLAN = getPlan('BE-LIF-001')!; // records-computed
const LIFECYCLE_PLAN = getPlan('BE-CYC-001')!; // lifecycle-admin

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAddAttachment.mockReturnValue('att-test-id');
});

// ── 1. SimpleClaimForm: receipt + amount fields when requiresReceipt=true ─────

describe('SimpleClaimForm', () => {
  it('renders receipt no and amount fields when requiresReceipt=true', () => {
    render(<SimpleClaimForm plan={OPD_PLAN} />);

    expect(screen.getByLabelText(/เลขที่ใบเสร็จ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/วันที่ใบเสร็จ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/จำนวนเงินตามใบเสร็จ/)).toBeInTheDocument();
  });

  it('does not show the approval chain (removed per STA-76)', () => {
    render(<SimpleClaimForm plan={OPD_PLAN} />);
    // OPD plan has ['hrbp','spd','hr_admin'] but the claim form no longer
    // surfaces the internal approval routing to the employee.
    expect(screen.queryByText(/ขั้นตอนอนุมัติ/)).not.toBeInTheDocument();
    expect(screen.queryByText('HRBP')).not.toBeInTheDocument();
    expect(screen.queryByText('SPD')).not.toBeInTheDocument();
  });

  it('shows annual limit when set', () => {
    render(<SimpleClaimForm plan={OPD_PLAN} />);
    expect(screen.getByText(/วงเงินรายปี/)).toBeInTheDocument();
  });
});

// ── 2. HospitalClaimForm: receipt fields hidden when requiresReceipt=false ────

describe('HospitalClaimForm', () => {
  it('hides receipt fields when requiresReceipt=false (IPD with referral)', () => {
    render(<HospitalClaimForm plan={IPD_REFERRAL_PLAN} />);

    // Hospital name must be present
    expect(screen.getByLabelText(/ชื่อโรงพยาบาล/)).toBeInTheDocument();

    // Receipt fields must NOT be rendered
    expect(screen.queryByLabelText(/เลขที่ใบเสร็จ/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/จำนวนเงิน/)).not.toBeInTheDocument();
  });

  it('shows receipt fields when requiresReceipt=true (IPD self-paid dep)', () => {
    render(<HospitalClaimForm plan={IPD_DEPENDENT_PLAN} />);
    expect(screen.getByLabelText(/เลขที่ใบเสร็จ/)).toBeInTheDocument();
  });

  // ── 3. HospitalClaimForm: dependent picker shown when requiresDependent=true

  it('shows dependent picker when requiresDependent=true', () => {
    render(<HospitalClaimForm plan={IPD_DEPENDENT_PLAN} />);
    // The select has a label containing "ผู้รับสิทธิ์"
    expect(screen.getByLabelText(/ผู้รับสิทธิ์/)).toBeInTheDocument();
  });

  it('hides dependent picker when requiresDependent=false', () => {
    render(<HospitalClaimForm plan={IPD_REFERRAL_PLAN} />);
    expect(screen.queryByLabelText(/ผู้รับสิทธิ์/)).not.toBeInTheDocument();
  });

  // STA-119 FIX #2 — HospitalClaimForm renders the SAME config-driven
  // conditional groups as SimpleClaimForm for the same (medical) bucket.
  // hospitalName is intentionally excluded from conditionals: HospitalClaimForm
  // owns that field natively ("ชื่อโรงพยาบาล") and maps it into dynamicFields at submit.
  it('renders the config-driven medical conditional groups (parity with SimpleClaimForm)', () => {
    render(<HospitalClaimForm plan={IPD_REFERRAL_PLAN} />);
    // medical bucket → Medical/Dental, Type of Hospital, patient-transfer, Disease Details.
    // OPD/IPD is owned by the native Admission-type control here (not the shared select).
    expect(screen.getByLabelText(/การแพทย์ \/ ทันตกรรม/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ประเภทการรักษา/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ประเภทสถานพยาบาล/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ใช้เอกสารส่งตัวหรือไม่/)).toBeInTheDocument();
    expect(screen.getByLabelText(/รายละเอียดอาการ\/โรค/)).toBeInTheDocument();
  });

  // STA-145 Phase B — admitted dates show on IPD (bridged from the native Admission
  // type into the conditional values). Regression guard: previously inert here.
  it('shows Admitted start/end dates on the default IPD admission', () => {
    render(<HospitalClaimForm plan={IPD_REFERRAL_PLAN} />);
    expect(screen.getByLabelText(/วันที่เริ่มเข้ารักษา/)).toBeInTheDocument();
    expect(screen.getByLabelText(/วันที่สิ้นสุดการรักษา/)).toBeInTheDocument();
  });

  it('hides Admitted dates when admission is switched to OPD', () => {
    render(<HospitalClaimForm plan={IPD_REFERRAL_PLAN} />);
    const admission = screen.getByLabelText(/ประเภทการรักษา/) as HTMLSelectElement;
    fireEvent.change(admission, { target: { value: 'opd' } });
    expect(screen.queryByLabelText(/วันที่เริ่มเข้ารักษา/)).not.toBeInTheDocument();
  });

  // FIX [MEDIUM] — exactly ONE hospital-name input (no duplicate from conditional set).
  it('renders exactly one hospital-name field (native field; conditional hospitalName suppressed)', () => {
    render(<HospitalClaimForm plan={IPD_REFERRAL_PLAN} />);
    // Native field label is "ชื่อโรงพยาบาล"; conditional label would be "ชื่อสถานพยาบาล".
    // Both patterns must match exactly one element total across the form.
    const nativeField = screen.getByLabelText(/ชื่อโรงพยาบาล/);
    expect(nativeField).toBeInTheDocument();
    // The conditional "ชื่อสถานพยาบาล" must NOT appear (it is filtered out).
    expect(screen.queryByLabelText(/ชื่อสถานพยาบาล/)).not.toBeInTheDocument();
  });

  it('renders the same medical conditional field set as SimpleClaimForm for the same bucket', () => {
    // hospitalName + OPD/IPD are owned natively by HospitalClaimForm; SimpleClaimForm
    // renders them via the shared renderer. The remaining conditional labels are identical.
    const sharedConditionalLabels = [
      /การแพทย์ \/ ทันตกรรม/,
      /ประเภทสถานพยาบาล/,
      /ใช้เอกสารส่งตัวหรือไม่/,
      /รายละเอียดอาการ\/โรค/,
    ];
    const { unmount } = render(<SimpleClaimForm plan={getPlan('BE-MED-001')!} />);
    for (const lbl of sharedConditionalLabels) {
      expect(screen.getByLabelText(lbl)).toBeInTheDocument();
    }
    unmount();
    render(<HospitalClaimForm plan={IPD_REFERRAL_PLAN} />);
    for (const lbl of sharedConditionalLabels) {
      expect(screen.getByLabelText(lbl)).toBeInTheDocument();
    }
  });
});

// ── STA-119 FIX #3 — gasoline Fleet-Card "(Info only)" rows are disabled ──────

describe('Gasoline Claim Type — Info-only options', () => {
  const GASOLINE_PLAN = getPlan('BE-GAS-001')!; // simple-claim, category=gasoline

  it('renders Fleet-Card "(Info only)" options as disabled (non-selectable)', () => {
    render(<SimpleClaimForm plan={GASOLINE_PLAN} />);
    const select = screen.getByLabelText(/ประเภทการเบิก/) as HTMLSelectElement;
    const byValue = (id: string) =>
      Array.from(select.options).find((o) => o.value === id);

    // Fleet-Card rows are present (label visible) but disabled.
    for (const id of ['fleet_card_shell', 'fleet_card_bangchak', 'fleet_card_cpn']) {
      const opt = byValue(id);
      expect(opt, id).toBeDefined();
      expect(opt!.disabled, id).toBe(true);
    }
    // Real claim types stay selectable.
    expect(byValue('gasoline')!.disabled).toBe(false);
    expect(byValue('expressway_toll')!.disabled).toBe(false);
  });
});

// ── 4. RecordsFlatForm: no approval chain, shows "Recorded by HR" ─────────────

describe('RecordsFlatForm', () => {
  it('shows "บันทึกโดย HR" instead of an approval chain', () => {
    render(<RecordsFlatForm plan={FUNERAL_EMPLOYEE_PLAN} />);
    expect(screen.getByText('บันทึกโดย HR')).toBeInTheDocument();
  });

  it('does NOT render HRBP/SPD approval stage labels', () => {
    render(<RecordsFlatForm plan={FUNERAL_EMPLOYEE_PLAN} />);
    expect(screen.queryByText('HRBP')).not.toBeInTheDocument();
    expect(screen.queryByText('SPD')).not.toBeInTheDocument();
  });

  it('renders employee ID and event date fields', () => {
    render(<RecordsFlatForm plan={FUNERAL_EMPLOYEE_PLAN} />);
    expect(screen.getByLabelText(/รหัสพนักงาน/)).toBeInTheDocument();
    expect(screen.getByLabelText(/วันที่เหตุการณ์/)).toBeInTheDocument();
  });
});

// ── RecordsDependentForm ──────────────────────────────────────────────────────

describe('RecordsDependentForm', () => {
  it('shows dependent name and relationship fields', () => {
    render(<RecordsDependentForm plan={FUNERAL_SPOUSE_PLAN} />);
    expect(screen.getByLabelText(/ชื่อบุคคลในครอบครัว/)).toBeInTheDocument();
    // Use getAllByLabelText since the FileUploadField "หลักฐานความสัมพันธ์" label
    // also matches — assert at least the <select> is present
    const matches = screen.getAllByLabelText(/ความสัมพันธ์/);
    const selectEl = matches.find((el) => el.tagName === 'SELECT');
    expect(selectEl).toBeInTheDocument();
  });

  it('shows "บันทึกโดย HR" — no chain for records plans', () => {
    render(<RecordsDependentForm plan={FUNERAL_SPOUSE_PLAN} />);
    expect(screen.getByText('บันทึกโดย HR')).toBeInTheDocument();
  });
});

// ── 5. RecordsComputedView: read-only, no input elements ──────────────────────

describe('RecordsComputedView', () => {
  it('is read-only — renders no input, select, or textarea elements', () => {
    render(<RecordsComputedView plan={LIFE_INFO_PLAN} />);

    expect(document.querySelectorAll('input')).toHaveLength(0);
    expect(document.querySelectorAll('select')).toHaveLength(0);
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('renders coverage rows with bilingual labels in TH locale', () => {
    render(<RecordsComputedView plan={LIFE_INFO_PLAN} />);
    expect(screen.getByText('ฐานเงินเดือน')).toBeInTheDocument();
    expect(screen.getByText('ความคุ้มครองประกันชีวิต')).toBeInTheDocument();
  });

  it('renders no submit or action button', () => {
    render(<RecordsComputedView plan={LIFE_INFO_PLAN} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ── 6. LifecycleAdminForm: period + scope + Run/Validate/Cancel ───────────────

describe('LifecycleAdminForm', () => {
  it('renders period start and end fields', () => {
    render(<LifecycleAdminForm plan={LIFECYCLE_PLAN} />);
    expect(screen.getByLabelText(/วันเริ่มต้นรอบ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/วันสิ้นสุดรอบ/)).toBeInTheDocument();
  });

  it('renders scope selector', () => {
    render(<LifecycleAdminForm plan={LIFECYCLE_PLAN} />);
    expect(screen.getByLabelText(/ขอบเขต/)).toBeInTheDocument();
  });

  it('renders Run, Validate, and Cancel action buttons', () => {
    render(<LifecycleAdminForm plan={LIFECYCLE_PLAN} />);
    expect(screen.getByRole('button', { name: 'รัน' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ตรวจสอบ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument();
  });
});

// ── 7. pickTemplate: returns correct component for each template id ────────────

describe('pickTemplate', () => {
  it('returns SimpleClaimForm for simple-claim plans', () => {
    const Component = pickTemplate(OPD_PLAN);
    expect(Component).toBe(SimpleClaimForm);
  });

  it('returns HospitalClaimForm for hospital-claim plans', () => {
    const Component = pickTemplate(IPD_REFERRAL_PLAN);
    expect(Component).toBe(HospitalClaimForm);
  });

  it('returns RecordsFlatForm for records-flat plans', () => {
    const Component = pickTemplate(FUNERAL_EMPLOYEE_PLAN);
    expect(Component).toBe(RecordsFlatForm);
  });

  it('returns RecordsDependentForm for records-dependent plans', () => {
    const Component = pickTemplate(FUNERAL_SPOUSE_PLAN);
    expect(Component).toBe(RecordsDependentForm);
  });

  it('returns RecordsComputedView for records-computed plans', () => {
    const Component = pickTemplate(LIFE_INFO_PLAN);
    expect(Component).toBe(RecordsComputedView);
  });

  it('returns LifecycleAdminForm for lifecycle-admin plans', () => {
    const Component = pickTemplate(LIFECYCLE_PLAN);
    expect(Component).toBe(LifecycleAdminForm);
  });

  it('covers all 6 WorkflowTemplate ids from the plan registry', () => {
    const seenTemplates = new Set(BENEFIT_PLAN_REGISTRY.map((p) => p.template));
    const expectedTemplates = new Set([
      'simple-claim',
      'hospital-claim',
      'records-flat',
      'records-dependent',
      'records-computed',
      'lifecycle-admin',
    ]);
    expect(seenTemplates).toEqual(expectedTemplates);
  });
});

// ── STA-148 — reimbursement / start-a-claim revisions ─────────────────────────
describe('STA-148 — SimpleClaimForm revisions', () => {
  it('renders the certification notice immediately before the Attachments field', () => {
    const { container } = render(<SimpleClaimForm plan={OPD_PLAN} />);
    const cert = screen.getByText('ข้าพเจ้าขอรับรองว่าข้อมูลข้างต้นถูกต้องและครบถ้วน');
    expect(cert).toBeInTheDocument();
    const attach = screen.getByText(/เอกสารแนบ/);
    // Cert notice precedes the Attachments label in document order (req-1).
    expect(cert.compareDocumentPosition(attach) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // ...and the cert notice is NOT red — uses the pumpkin danger token (NO-RED).
    expect(container.querySelector('.text-\\[var\\(--color-danger\\)\\]')).not.toBeNull();
  });

  it('places Remark after the conditional fields and before Attachments (req-3)', () => {
    render(<SimpleClaimForm plan={OPD_PLAN} />);
    const remark = screen.getByLabelText(/หมายเหตุ/);
    const opdIpd = screen.getByLabelText(/OPD \/ IPD/); // a medical conditional field
    const attach = screen.getByText(/เอกสารแนบ/);
    // conditional (opdIpd) → remark → attachments
    expect(opdIpd.compareDocumentPosition(remark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(remark.compareDocumentPosition(attach) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens the Clinic not-allowed Modal when Type of Hospital = Clinic (req-2)', () => {
    render(<SimpleClaimForm plan={OPD_PLAN} />);
    const hospitalType = screen.getByLabelText(/ประเภทสถานพยาบาล/) as HTMLSelectElement;
    expect(screen.queryByText(/ไม่สามารถเบิกค่าใช้จ่ายจากคลินิก/)).not.toBeInTheDocument();
    fireEvent.change(hospitalType, { target: { value: 'clinic' } });
    expect(screen.getByText(/ไม่สามารถเบิกค่าใช้จ่ายจากคลินิก/)).toBeInTheDocument();
  });
});

describe('STA-148 req-4 — merged Medical Reimbursement', () => {
  it('renames BE-MED-001 to "Medical Reimbursement" (OPD suffix dropped)', () => {
    const med = getPlan('BE-MED-001')!;
    expect(med.nameEn).toBe('Medical Reimbursement');
    expect(med.nameTh).toBe('ค่ารักษาพยาบาล');
  });

  it('keeps the BE-MED-003 registry entry (excluded from chips, not deleted)', () => {
    expect(getPlan('BE-MED-003')).toBeDefined();
  });

  it('the ESS simple-claim chip set has exactly one claimable medical plan', () => {
    const medicalChips = BENEFIT_PLAN_REGISTRY.filter(
      (p) => p.template === 'simple-claim' && p.recordType === 'claimable'
        && p.category === 'medical' && p.id !== 'BE-MED-003',
    );
    expect(medicalChips.map((p) => p.id)).toEqual(['BE-MED-001']);
  });
});

// ── STA-184 — bilingual Hospital Name LOV + submit preview ────────────────────
const MOBILE_PLAN = getPlan('BE-MOB-001')!; // simple-claim, category mobile (only realMonthDate required)

describe('STA-184 — bilingual Hospital Name LOV', () => {
  it('renders each hospital option as "Thai / English" with the corrected Sikarin spelling', () => {
    render(<SimpleClaimForm plan={OPD_PLAN} />);
    const hospital = screen.getByLabelText(/ชื่อสถานพยาบาล/) as HTMLSelectElement;
    const optText = Array.from(hospital.options).map((o) => o.textContent ?? '');
    // 16 hospital options + the "— Select —" placeholder.
    expect(hospital.options).toHaveLength(17);
    expect(optText).toContain('โรงพยาบาลวิภาราม ปากเกร็ด / Vibharam Pakkred Hospital');
    // Corrected TH spelling (ศิครินทร์) shown alongside its English name.
    expect(optText.some((t) => t.includes('ศิครินทร์') && t.includes('Sikarin Hat Yai Hospital'))).toBe(true);
    // STA-184 BA update (2026-07-02) — trimmed EN, only the final "Hospital" kept.
    expect(optText).toContain('โรงพยาบาลไทยอินเตอร์ / Thai International Samui Hospital');
    expect(optText).toContain('โรงพยาบาลกรุงเทพอุดร / Bangkok Udon Hospital');
    expect(optText).toContain('โรงพยาบาลไทยอินเตอร์เนชั่นแนล เกาะพงัน / Thai International Phangan Hospital');
  });

  it('reveals the Others free-text field when Hospital Name = others', () => {
    render(<SimpleClaimForm plan={OPD_PLAN} />);
    const hospital = screen.getByLabelText(/ชื่อสถานพยาบาล/) as HTMLSelectElement;
    expect(screen.queryByLabelText(/ระบุสถานพยาบาลอื่นๆ/)).not.toBeInTheDocument();
    fireEvent.change(hospital, { target: { value: 'others' } });
    expect(screen.getByLabelText(/ระบุสถานพยาบาลอื่นๆ/)).toBeInTheDocument();
    fireEvent.change(hospital, { target: { value: 'bnh' } });
    expect(screen.queryByLabelText(/ระบุสถานพยาบาลอื่นๆ/)).not.toBeInTheDocument();
  });
});

describe('STA-184 — SimpleClaimForm submit preview (confirmBeforeSubmit)', () => {
  const fillMobileRequired = () => {
    fireEvent.change(screen.getByLabelText(/เลขที่ใบเสร็จ/), { target: { value: 'RC-184' } });
    fireEvent.change(screen.getByLabelText(/จำนวนเงินตามใบเสร็จ/), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText(/เดือนที่ขอเบิก/), { target: { value: 'may' } });
  };

  it('opens the preview modal instead of submitting when confirmBeforeSubmit is set', () => {
    const onSubmitted = vi.fn();
    render(<SimpleClaimForm plan={MOBILE_PLAN} confirmBeforeSubmit onSubmitted={onSubmitted} />);
    fillMobileRequired();
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' }));
    expect(screen.getByText('ตรวจสอบก่อนส่งคำขอ')).toBeInTheDocument();
    // Preview echoes entered values (receipt no + resolved bilingual month).
    expect(screen.getByText('RC-184')).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('dispatches the submit exactly once when the preview is confirmed', () => {
    const onSubmitted = vi.fn();
    render(<SimpleClaimForm plan={MOBILE_PLAN} confirmBeforeSubmit onSubmitted={onSubmitted} />);
    fillMobileRequired();
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันส่งคำขอ' }));
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('ตรวจสอบก่อนส่งคำขอ')).not.toBeInTheDocument();
  });

  it('closes the preview without submitting when Edit is clicked', () => {
    const onSubmitted = vi.fn();
    render(<SimpleClaimForm plan={MOBILE_PLAN} confirmBeforeSubmit onSubmitted={onSubmitted} />);
    fillMobileRequired();
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' }));
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    expect(screen.queryByText('ตรวจสอบก่อนส่งคำขอ')).not.toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('does not open the preview on invalid input', () => {
    const onSubmitted = vi.fn();
    render(<SimpleClaimForm plan={MOBILE_PLAN} confirmBeforeSubmit onSubmitted={onSubmitted} />);
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' }));
    expect(screen.queryByText('ตรวจสอบก่อนส่งคำขอ')).not.toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('submits directly (no preview) when confirmBeforeSubmit is omitted', () => {
    const onSubmitted = vi.fn();
    render(<SimpleClaimForm plan={MOBILE_PLAN} onSubmitted={onSubmitted} />);
    fillMobileRequired();
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' }));
    expect(screen.queryByText('ตรวจสอบก่อนส่งคำขอ')).not.toBeInTheDocument();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });
});
