// subject-registry.ts — the extensible subject list for the Bulk Import hub.
//
// The /admin/import hub renders a Step 0 picker by iterating IMPORT_SUBJECTS and
// mounts the shared ModuleImportWizard with the selected subject's config.
//
// ─── To add a subject ─────────────────────────────────────────────────────────
// Append ONE ImportSubject entry below and author its useConfig() hook (model it
// on subjects/employeeChangeConfig.tsx — it must call its own Zustand store hook
// for `commit`, so it is a hook, not a static object). For a not-yet-ready
// subject, set `disabled: true` and OMIT useConfig — it renders as a
// non-selectable "Coming soon" card. No hub edits are needed either way.

import type { LucideIcon } from 'lucide-react';
import { UserCog, HeartHandshake } from 'lucide-react';
import type { ModuleImportConfig } from '@/components/admin/import/ModuleImportWizard';
import { useEmployeeChangeImportConfig } from '@/components/admin/import/subjects/employeeChangeConfig';
import { useBenefitPlanImportConfig } from '@/components/admin/import/subjects/benefitPlanConfig';

export interface ImportSubject {
  /** stable key used by ?subject=<key> deep-links and lookups */
  key: string;
  labelTh: string;
  labelEn: string;
  descTh: string;
  descEn: string;
  icon: LucideIcon;
  /** true → non-selectable "Coming soon" card (no wizard mount) */
  disabled?: boolean;
  /** hook returning the wizard config; omitted for disabled subjects */
  useConfig?: () => ModuleImportConfig<unknown>;
}

export const IMPORT_SUBJECTS: ImportSubject[] = [
  {
    key: 'employee-change',
    labelTh: 'เปลี่ยนข้อมูลพนักงาน',
    labelEn: 'Change employee information',
    descTh: 'ปรับปรุงข้อมูลพนักงานที่มีอยู่แบบกลุ่ม — โอนย้าย ตำแหน่ง หน่วยงาน ผู้บังคับบัญชา หรือสถานที่ทำงาน',
    descEn: 'Bulk-update existing employees — transfer, position, department, manager or work location.',
    icon: UserCog,
    useConfig: useEmployeeChangeImportConfig as () => ModuleImportConfig<unknown>,
  },
  {
    key: 'benefit-plan',
    labelTh: 'เพิ่ม/ปรับสิทธิสวัสดิการ',
    labelEn: 'Add / adjust benefit',
    descTh: 'นำเข้า CSV เพื่อกำหนดหรือปรับวงเงินสิทธิสวัสดิการให้พนักงานหลายคนพร้อมกัน',
    descEn: 'Bulk-assign or adjust benefit entitlements for many employees at once.',
    icon: HeartHandshake,
    useConfig: useBenefitPlanImportConfig as () => ModuleImportConfig<unknown>,
  },
];

/** Look up a subject by its key. Returns undefined for unknown keys. */
export function getImportSubject(key: string | null | undefined): ImportSubject | undefined {
  if (!key) return undefined;
  return IMPORT_SUBJECTS.find((s) => s.key === key);
}
