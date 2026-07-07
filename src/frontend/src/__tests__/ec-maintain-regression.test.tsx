/**
 * ec-maintain-regression.test.tsx — STA-244 (HIGHEST-PRIORITY regression)
 *
 * Guards zero-regression on the live /profile/me edit flows after wiring the maintain
 * registry to drive AFFORDANCES. Asserts against the humi-profile SLICE (NOT
 * quick-approve):
 *   - approval section (contact modal) submit → submitChangeRequest once,
 *     pendingChanges += 1, and save() is NOT called.
 *   - direct section (emergency array) submit → submitChangeRequest once,
 *     pendingChanges += 1, AND save() IS called (dual behavior preserved).
 *
 * Harness mirrors profile-me.sta186-per-section-edit.test.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

let uuidCounter = 0;
vi.stubGlobal('crypto', { randomUUID: () => `sta244-uuid-${++uuidCounter}` });

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── next-intl mock ──────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      tabPersonal: 'ข้อมูลส่วนตัว',
      tabJob: 'การจ้างงาน',
      tabEmergency: 'ผู้ติดต่อฉุกเฉิน',
      tabDocs: 'เอกสาร',
      tabTax: 'ภาษี',
      emergencyTitle: 'ผู้ติดต่อฉุกเฉิน',
      emergencyHelp: 'ผู้ที่ติดต่อได้ในกรณีฉุกเฉิน',
      profileEdit: 'แก้ไขข้อมูล',
      profileCancelEdit: 'ยกเลิก',
      save: 'บันทึก',
      editSection: 'แก้ไขหัวข้อ',
      'changeRequest.submit': 'ส่งคำขอ',
      'changeRequest.pending': 'รออนุมัติ',
    };
    return map[key] ?? key;
  },
}));

// ── next/navigation mock (searchParams switched per test) ────────────────────────
const mockSearchParams = { current: new URLSearchParams('') };
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/profile/me'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useSearchParams: vi.fn(() => mockSearchParams.current),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    [k: string]: unknown;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

import {
  useHumiProfileStore,
  type EmergencyContactRow,
  type EducationEntry,
  type LanguageSkillEntry,
  type WorkPermitEntry,
  type CertificationEntry,
} from '@/stores/humi-profile-slice';

async function renderProfileMePage() {
  const { default: ProfileMePage } = await import('@/app/[locale]/profile/me/page');
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(<ProfileMePage />);
  });
  return result!;
}

const EMPTY_SLICE = {
  nickname: 'จงรักษ์',
  phone: '',
  personalEmail: '',
  address: '',
  emergencyContacts: [] as EmergencyContactRow[],
  addressStructured: {
    houseNo: '',
    village: '',
    soi: '',
    road: '',
    subdistrict: '',
    district: '',
    province: '',
    postalCode: '',
  },
  phonesArr: [],
  emailsArr: [],
  bank: { bankCode: '', accountNo: '', holderName: '', bookAttachmentId: null },
  dependents: [],
  // STA-244 repeatable groups (additive — []-safe)
  formalEducation: [] as EducationEntry[],
  languageSkills: [] as LanguageSkillEntry[],
  workPermits: [] as WorkPermitEntry[],
  certifications: [] as CertificationEntry[],
};

function resetStore(activeTab: 'personal' | 'compensation', seed: Partial<typeof EMPTY_SLICE> = {}) {
  localStorageMock.clear();
  useHumiProfileStore.setState({
    activeTab,
    isEditing: false,
    draft: { ...EMPTY_SLICE, ...seed },
    saved: { ...EMPTY_SLICE, ...seed },
    attachments: [],
     
    pendingChanges: [] as any,
    adminMode: false,
  });
}

beforeEach(() => {
  uuidCounter = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

// ════════════════════════════════════════════════════════════════════════════════
// AC-5 + AC-6 (approval half): an approval section (contact modal) submits a CR
// with NO save().
// ════════════════════════════════════════════════════════════════════════════════
describe('STA-244: approval section submit → CR only, no save()', () => {
  it('contact modal submit calls submitChangeRequest once (pendingChanges += 1) and does NOT call save()', async () => {
    mockSearchParams.current = new URLSearchParams('');
    resetStore('personal');
    const saveSpy = vi.spyOn(useHumiProfileStore.getState(), 'save');

    await renderProfileMePage();

    // Personal panel shows the 3 always-on section pencils (personal, marital, contact);
    // advanced is collapsed. Click contact (index 2) to open its approval modal.
    const pencils = screen.getAllByRole('button', { name: /แก้ไขหัวข้อ/ });
    expect(pencils.length).toBeGreaterThanOrEqual(3);
    await act(async () => {
      fireEvent.click(pencils[2]);
    });

    // Modal open → change the first text field (personalEmail). Effective date is
    // pre-filled by openSectionEdit, so Save is enabled immediately (contact has no
    // required doc).
    const dialog = screen.getByRole('dialog');
    const textboxes = within(dialog).getAllByRole('textbox');
    expect(textboxes.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.change(textboxes[0], { target: { value: 'changed.email@example.com' } });
    });

    const saveBtn = within(dialog).getByRole('button', { name: /^บันทึก$/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    const pending = useHumiProfileStore.getState().pendingChanges;
    expect(pending).toHaveLength(1);
    expect(pending[0].sectionKey).toBe('contact');
    expect(saveSpy).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// AC-6 (direct half): a direct section (emergency array) submits a CR AND commits
// via save() — the DUAL behavior must be preserved.
// ════════════════════════════════════════════════════════════════════════════════
describe('STA-244: direct section submit → CR AND save() (dual behavior preserved)', () => {
  it('emergency array submit calls submitChangeRequest once (pendingChanges += 1) AND save()', async () => {
    mockSearchParams.current = new URLSearchParams('tab=emergency');
    const seedRow: EmergencyContactRow = {
      id: 'ec-1',
      name: 'ผู้ติดต่อเดิม',
      relation: 'cust_refRelationship_Father',
      phones: ['0812345678'],
      primaryFlag: true,
    };
    resetStore('compensation', { emergencyContacts: [seedRow] });
    const saveSpy = vi.spyOn(useHumiProfileStore.getState(), 'save');

    await renderProfileMePage();

    // Emergency panel: open the emergency editor (first pencil) and submit — a valid
    // seed row keeps the Submit button enabled without further edits.
    const pencils = screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ });
    await act(async () => {
      fireEvent.click(pencils[0]);
    });

    const submitBtn = screen.getByRole('button', { name: /ส่งคำขอ/ });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    const pending = useHumiProfileStore.getState().pendingChanges;
    expect(pending).toHaveLength(1);
    expect(pending[0].sectionKey).toBe('emergencyContact');
    // Dual behavior: save() committed draft → saved.
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// STA-244 (new repeatable group): Formal Education is a NEW direct+dual section — it
// must submit a CR (sectionKey 'formalEducation') AND save(), with no guarded-flow
// mutation. It also proves "add unlimited entries" (no cap).
// ════════════════════════════════════════════════════════════════════════════════
describe('STA-244: repeatable section (Formal Education) submit → CR AND save()', () => {
  const validEducationRow: EducationEntry = {
    degree: 'ปริญญาตรี',
    university: 'จุฬาลงกรณ์มหาวิทยาลัย',
    faculty: 'วิศวกรรมศาสตร์',
    major: 'คอมพิวเตอร์',
    gpa: '3.50',
    graduatedDate: '2012-03-31',
    isPrimary: true,
  };

  it('Formal Education submit calls submitChangeRequest once (sectionKey formalEducation) AND save()', async () => {
    mockSearchParams.current = new URLSearchParams('');
    resetStore('personal', { formalEducation: [validEducationRow] });
    const saveSpy = vi.spyOn(useHumiProfileStore.getState(), 'save');

    await renderProfileMePage();

    // Open the Formal Education editor via its dedicated edit affordance.
    const editBtn = screen.getByRole('button', { name: /sections\.formalEducation/ });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    // A valid seed row keeps Submit enabled without further edits.
    const submitBtn = screen.getByRole('button', { name: /ส่งคำขอ/ });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    const pending = useHumiProfileStore.getState().pendingChanges;
    expect(pending).toHaveLength(1);
    expect(pending[0].sectionKey).toBe('formalEducation');
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('"+ Add" appends rows with no cap (click Add 3× → +3 rows)', async () => {
    mockSearchParams.current = new URLSearchParams('');
    resetStore('personal', { formalEducation: [validEducationRow] });

    await renderProfileMePage();

    const editBtn = screen.getByRole('button', { name: /sections\.formalEducation/ });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    expect(screen.getAllByTestId('repeatable-row')).toHaveLength(1);

    const addBtn = screen.getByTestId('repeatable-add');
    for (let i = 0; i < 3; i += 1) {
       
      await act(async () => {
        fireEvent.click(addBtn);
      });
    }

    expect(screen.getAllByTestId('repeatable-row')).toHaveLength(4);
  });
});
