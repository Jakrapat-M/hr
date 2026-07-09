/**
 * profile-me.sta186-per-section-edit.test.tsx
 * STA-186 (Linear, Urgent): the /profile/me emergency tab converges to the
 * shipped STA-82 per-section UX — one Edit pencil per section header (Emergency
 * contacts + ผู้อุปการะ/Dependents), each opening an independent section-scoped
 * editor with its own Cancel + Submit. The single global Edit/Cancel/Save bar is
 * removed.
 *
 * Enters the emergency panel via a mocked `?tab=emergency` searchParam (NOT a
 * bare setTab — the tab-sync effect would override it) plus a store activeTab of
 * `compensation` (SLICE_TO_PANEL.compensation === 'emergency').
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

// ── UUID stub ──────────────────────────────────────────────────────────────────
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `sta186-uuid-${++uuidCounter}`,
});

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── next-intl mock ────────────────────────────────────────────────────────────
// Namespace-agnostic mapper: every useTranslations('<ns>') call shares this map.
// Only the keys the assertions touch need explicit values; anything else returns
// the key verbatim, which is inert for rendering.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      // tab labels
      tabPersonal: 'ข้อมูลส่วนตัว',
      tabJob: 'การจ้างงาน',
      tabEmergency: 'ผู้ติดต่อฉุกเฉิน',
      tabDocs: 'เอกสาร',
      tabTax: 'ภาษี / ข้อมูลทางการเงิน',
      personalEyebrow: 'ข้อมูลส่วนตัว',
      tenurePrefix: 'อายุงาน',
      // emergency panel
      emergencyTitle: 'ผู้ติดต่อฉุกเฉิน',
      emergencyHelp: 'ผู้ที่ติดต่อได้ในกรณีฉุกเฉิน',
      // per-section edit affordances (STA-186 targets)
      profileEdit: 'แก้ไขข้อมูล',
      profileCancelEdit: 'ยกเลิก',
      save: 'บันทึก', // old global-bar Save label — must be absent
      // ess.changeRequest.*
      'changeRequest.submit': 'ส่งคำขอ',
      'changeRequest.pending': 'รออนุมัติ',
    };
    return map[key] ?? key;
  },
}));

// ── next/navigation mock ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/profile/me'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams('tab=emergency')),
}));

// ── next/link mock ────────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ href, children, className, ...props }: { href: string; children: React.ReactNode; className?: string; [k: string]: unknown }) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

import { useHumiProfileStore, type EmergencyContactRow } from '@/stores/humi-profile-slice';
import type { HumiDependent } from '@/lib/humi-mock-data';

async function renderProfileMePage() {
  const { default: ProfileMePage } = await import('@/app/[locale]/profile/me/page');
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(<ProfileMePage />);
  });
  return result!;
}

const EMPTY_SLICE = {
  nickname: 'จงรักษ์', phone: '', personalEmail: '', address: '',
  emergencyContacts: [],
  addressStructured: { houseNo: '', village: '', soi: '', road: '', subdistrict: '', district: '', province: '', postalCode: '' },
  phonesArr: [], emailsArr: [],
  bank: { bankCode: '', accountNo: '', holderName: '', bookAttachmentId: null },
  dependents: [],
};

function resetStore(pendingChanges: unknown[] = []) {
  localStorageMock.clear();
  useHumiProfileStore.setState({
    activeTab: 'compensation', // → SLICE_TO_PANEL.compensation === 'emergency' panel
    isEditing: false,
    draft: { ...EMPTY_SLICE },
    saved: { ...EMPTY_SLICE },
    attachments: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingChanges: pendingChanges as any,
    adminMode: false,
  });
}

// Fixture with ONE row per array-editor slice so the section-scoped Cancel
// (updateDraft(slice) → snapshot) can be proven to revert its own slice while
// leaving the sibling slice's IN-PROGRESS, UNSAVED draft edit untouched — the
// exact failure mode that using store cancelEdit() (whole-draft revert) would
// reintroduce (plan §9 risk #1 / #7 concurrent-open edge).
const ORIGINAL_EC_NAME = 'เดิมชื่อผู้ติดต่อ';
const EMERGENCY_FIXTURE: EmergencyContactRow[] = [
  { id: 'ec-fixture-1', name: ORIGINAL_EC_NAME, relation: 'cust_refRelationship_Father', phones: ['0812345678'], primaryFlag: true },
];
const ORIGINAL_DEP_NAME = 'บุตรคนที่หนึ่ง';
const DEPENDENT_FIXTURE: HumiDependent[] = [
  {
    id: 'dep-fixture-1',
    fullNameTh: ORIGINAL_DEP_NAME,
    fullNameEn: 'Child One',
    relation: 'child',
    dateOfBirth: '2015-01-01',
    hasInsurance: true,
    isCentralEmployee: false,
  },
];

function seedRevertFixture() {
  localStorageMock.clear();
  useHumiProfileStore.setState({
    activeTab: 'compensation',
    isEditing: false,
    draft: { ...EMPTY_SLICE, emergencyContacts: EMERGENCY_FIXTURE, dependents: DEPENDENT_FIXTURE },
    saved: { ...EMPTY_SLICE, emergencyContacts: EMERGENCY_FIXTURE, dependents: DEPENDENT_FIXTURE },
    attachments: [],
    pendingChanges: [],
    adminMode: false,
  });
}

beforeEach(() => {
  uuidCounter = 0;
  resetStore();
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
  resetStore();
});

// ════════════════════════════════════════════════════════════════════════════
// AC-1 + AC-2/AC-3: exactly 2 per-section pencils, no global bar
// ════════════════════════════════════════════════════════════════════════════

describe('STA-186: emergency tab per-section edit pencils', () => {
  it('renders exactly 2 per-section Edit pencils and no global Edit/Cancel/Save bar', async () => {
    await renderProfileMePage();
    const pencils = screen.getAllByRole('button', { name: /แก้ไขข้อมูล|Edit profile/i });
    expect(pencils).toHaveLength(2);
    // Old global bar Save/Cancel/Submit are absent in the read-only default state.
    expect(screen.queryByRole('button', { name: /^บันทึก$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /ส่งคำขอ/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^ยกเลิก$/ })).toBeNull();
  });

  it('emergency pencil opens ITS editor while dependents stays read-only', async () => {
    await renderProfileMePage();
    const pencils = screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ });
    await act(async () => {
      fireEvent.click(pencils[0]); // emergency section (rendered first)
    });
    // Editor open → its Cancel + Submit footer present; opening section's pencil hidden.
    expect(screen.getByRole('button', { name: /ส่งคำขอ/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ยกเลิก$/ })).toBeInTheDocument();
    // Dependents remains read-only → its pencil still present; only 1 pencil left.
    const remaining = screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ });
    expect(remaining).toHaveLength(1);
  });

  it('dependents pencil opens independently (does not open the emergency editor)', async () => {
    await renderProfileMePage();
    const pencils = screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ });
    await act(async () => {
      fireEvent.click(pencils[1]); // dependents section (rendered second)
    });
    // Exactly one editor open (one Submit footer); emergency pencil still present.
    expect(screen.getAllByRole('button', { name: /ส่งคำขอ/ })).toHaveLength(1);
    const remaining = screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ });
    expect(remaining).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AC-5: PendingSectionBadge per section
// ════════════════════════════════════════════════════════════════════════════

describe('STA-186: PendingSectionBadge per section', () => {
  it('renders a pending badge on both emergency and dependents headers', async () => {
    resetStore([
      {
        id: 'pc-em', field: 'emergencyContacts', oldValue: '[]', newValue: '[]',
        effectiveDate: '2026-08-01', status: 'pending', sectionKey: 'emergencyContact',
        attachmentIds: [], submittedAt: '2026-07-02',
      },
      {
        id: 'pc-dep', field: 'dependents', oldValue: '[]', newValue: '[]',
        effectiveDate: '2026-08-01', status: 'pending', sectionKey: 'dependents',
        attachmentIds: [], submittedAt: '2026-07-02',
      },
    ]);
    await renderProfileMePage();
    expect(screen.getAllByText(/รออนุมัติ/)).toHaveLength(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AC-4 / plan §9 risk #1: per-section Cancel reverts ONLY its own slice —
// never the whole shared draft (which would silently discard an in-progress,
// unsaved edit in the OTHER section). This is what would break if a future
// change swapped the section-scoped `updateDraft({ slice: snapshot })` revert
// for the store's whole-draft `cancelEdit()`.
// ════════════════════════════════════════════════════════════════════════════

describe('STA-186: per-section Cancel reverts only its own slice', () => {
  it('reverts the edited emergency-contact field on Cancel, while an unsaved dependents edit survives untouched', async () => {
    seedRevertFixture();
    await renderProfileMePage();

    // 1) Open Dependents, make an UNSAVED edit (not submitted) — this is the
    //    sibling-slice state that must survive the emergency Cancel below.
    const initialPencils = screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ });
    expect(initialPencils).toHaveLength(2);
    await act(async () => {
      fireEvent.click(initialPencils[1]); // dependents pencil (rendered second)
    });
    // regex — FormField appends a required "*" to the label's accessible text
    const depNameInput = screen.getByLabelText(/^ชื่อ-นามสกุล \(ภาษาไทย\)/) as HTMLInputElement;
    expect(depNameInput.value).toBe(ORIGINAL_DEP_NAME);
    const UNSAVED_DEP_NAME = 'ชื่อผู้อุปการะที่ยังไม่บันทึก';
    await act(async () => {
      fireEvent.change(depNameInput, { target: { value: UNSAVED_DEP_NAME } });
    });
    expect(useHumiProfileStore.getState().draft.dependents?.[0]?.fullNameTh).toBe(
      UNSAVED_DEP_NAME,
    );

    // 2) Open Emergency (collapses Dependents per the one-open-at-a-time guard —
    //    a rendering-only close, NOT a cancel) and edit its name field too.
    const pencilsAfterDepEdit = screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ });
    expect(pencilsAfterDepEdit).toHaveLength(1); // only emergency pencil (dependents is open)
    await act(async () => {
      fireEvent.click(pencilsAfterDepEdit[0]);
    });
    // Opening Emergency only reseeds the emergencyContacts slice (plan §9
    // "seed-from-saved on open" mitigation) — the dependents draft edit must
    // NOT be discarded merely by collapsing its section.
    expect(useHumiProfileStore.getState().draft.dependents?.[0]?.fullNameTh).toBe(
      UNSAVED_DEP_NAME,
    );

    const ecNameInput = screen.getByLabelText(/^emergencyContact\.name/) as HTMLInputElement;
    expect(ecNameInput.value).toBe(ORIGINAL_EC_NAME);
    const UNSAVED_EC_NAME = 'ชื่อผู้ติดต่อที่ยังไม่บันทึก';
    await act(async () => {
      fireEvent.change(ecNameInput, { target: { value: UNSAVED_EC_NAME } });
    });
    expect(ecNameInput.value).toBe(UNSAVED_EC_NAME);

    // 3) Cancel the emergency section only.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^ยกเลิก$/ }));
    });

    // Section collapses back to read-only: both pencils restored.
    expect(screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ })).toHaveLength(2);

    // 4) Inspect the store DIRECTLY (not via UI re-open — re-opening a section
    //    always reseeds ITS OWN slice from `saved` by design, which would mask
    //    whether Cancel behaved correctly). Two things must both be true:
    //    (a) the emergencyContacts draft slice IS reverted to its open-time
    //        snapshot (own-slice Cancel worked), AND
    //    (b) the dependents draft slice — still holding the UNSAVED edit from
    //        step 1 — is COMPLETELY UNTOUCHED. (b) is the assertion that would
    //        FAIL if cancelEmergencyEdit() were ever changed to call the
    //        store's whole-draft cancelEdit() instead of the section-scoped
    //        updateDraft({ emergencyContacts: snapshot }).
    const stateAfterCancel = useHumiProfileStore.getState();
    expect(stateAfterCancel.draft.emergencyContacts[0]?.name).toBe(ORIGINAL_EC_NAME);
    expect(stateAfterCancel.draft.dependents?.[0]?.fullNameTh).toBe(UNSAVED_DEP_NAME);

    // 5) UI-level corroboration: re-opening Emergency shows the reverted value.
    const pencilsAfterCancel = screen.getAllByRole('button', { name: /แก้ไขข้อมูล/ });
    await act(async () => {
      fireEvent.click(pencilsAfterCancel[0]); // emergency pencil
    });
    const ecNameAfterCancel = screen.getByLabelText(/^emergencyContact\.name/) as HTMLInputElement;
    expect(ecNameAfterCancel.value).toBe(ORIGINAL_EC_NAME);
  });
});
