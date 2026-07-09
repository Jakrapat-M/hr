'use client';

// /time/shift-schedule — Shift Schedule Flow (wiki §7.2): the default shift comes
// from the Working Hour Template (Table 1 Rule → templateForEmployee); a manager can
// OVERRIDE per person or MASS-ASSIGN a template to many, the result is VALIDATED
// (DWS red/green/yellow), then saved with an EFFECTIVE DATE and the employee is
// notified. Mockup: in-memory, manager-gated, no backend.

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, CalendarCheck, Users } from 'lucide-react';
import { Card, CardTitle, Button } from '@/components/humi';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';
import {
  SCHEDULE_TEMPLATES,
  templateForEmployee,
  scheduleFromTemplate,
  type ScheduleTemplate,
} from '@/lib/time/schedule-template';
import { validateDwsPeriod } from '@/lib/time/dws-validation';

const DEMO_TEAM: { id: string; nameTh: string; nameEn: string }[] = [
  { id: 'EMP101', nameTh: 'ก้องภพ สาขาสีลม', nameEn: 'Kongphop (Silom)' },
  { id: 'EMP102', nameTh: 'นภา สำนักงานใหญ่', nameEn: 'Napha (HO)' },
  { id: 'EMP103', nameTh: 'วิภา สาขาลาดพร้าว', nameEn: 'Wipha (Ladprao)' },
  { id: 'EMP104', nameTh: 'ธีรพงษ์ สาขาบางนา', nameEn: 'Teerapong (Bangna)' },
  { id: 'EMP105', nameTh: 'อรุณี สำนักงานใหญ่', nameEn: 'Arunee (HO)' },
];

const TEMPLATE_KEYS = Object.keys(SCHEDULE_TEMPLATES);

export default function ShiftSchedulePage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const isTh = locale === 'th';
  const roles = useAuthStore((s) => s.roles);
  const canReview = hasAnyRole(roles, ['manager', 'hrbp', 'spd', 'hr_admin', 'hr_manager']);

  // Per-employee assigned template key (default = Table 1 Rule resolution).
  const [assigned, setAssigned] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const e of DEMO_TEAM) {
      const def = templateForEmployee(e.id);
      init[e.id] = TEMPLATE_KEYS.find((k) => SCHEDULE_TEMPLATES[k].id === def.id) ?? TEMPLATE_KEYS[0];
    }
    return init;
  });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [massTemplate, setMassTemplate] = useState<string>(TEMPLATE_KEYS[0]);
  const [effectiveDate, setEffectiveDate] = useState('2026-06-21');
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 3000); };

  const toggle = (id: string) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setChecked((s) => (s.size === DEMO_TEAM.length ? new Set() : new Set(DEMO_TEAM.map((e) => e.id))));

  const massAssign = () => {
    if (checked.size === 0) { flash(isTh ? 'เลือกพนักงานก่อน' : 'Select employees first'); return; }
    setAssigned((a) => { const n = { ...a }; for (const id of checked) n[id] = massTemplate; return n; });
    flash(isTh ? `กำหนดกะให้ ${checked.size} คนแล้ว` : `Assigned to ${checked.size} employee(s)`);
  };

  const saveAndNotify = () => {
    flash(isTh ? `บันทึกตารางกะ (มีผล ${effectiveDate}) และแจ้งพนักงานแล้ว` : `Schedule saved (effective ${effectiveDate}) and employees notified`);
  };

  function validationFor(templateKey: string): { ok: boolean; red: number; yellow: number } {
    const tmpl: ScheduleTemplate = SCHEDULE_TEMPLATES[templateKey];
    const v = validateDwsPeriod(scheduleFromTemplate(tmpl));
    return { ok: v.red === 0 && v.yellow === 0, red: v.red, yellow: v.yellow };
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <nav className="flex items-center gap-1 text-xs text-ink-muted" aria-label="breadcrumb">
        <Link href={`/${locale}/time`} className="hover:text-ink transition">{isTh ? 'เวลางาน' : 'Time'}</Link>
        <span aria-hidden>›</span>
        <span className="text-ink font-medium">{isTh ? 'ตารางกะทีม' : 'Team shift schedule'}</span>
      </nav>

      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-0.5">{isTh ? 'สำหรับผู้จัดการ' : 'For managers'}</p>
        <h1 className="text-2xl font-bold text-ink">{isTh ? 'ตารางกะทีม' : 'Team shift schedule'}</h1>
        <p className="text-sm text-ink-muted mt-1">{isTh ? 'กะเริ่มต้นมาจากรูปแบบเวลาทำงาน · ปรับรายคนหรือกำหนดเป็นกลุ่ม แล้วตรวจสอบและบันทึก' : 'Shifts default from the working pattern · override per person or in bulk, then validate and save.'}</p>
      </header>

      {!canReview ? (
        <Card><div className="flex flex-col items-center gap-2 py-10 text-center"><Users className="text-ink-faint" size={28} aria-hidden /><p className="text-body text-ink-muted">{isTh ? 'เฉพาะผู้จัดการ/HR เท่านั้น' : 'Managers / HR only'}</p></div></Card>
      ) : (
        <>
          {/* Mass-assign bar */}
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">{isTh ? 'กำหนดกะ (กลุ่ม)' : 'Assign template (bulk)'}</span>
                <select value={massTemplate} onChange={(e) => setMassTemplate(e.target.value)} className="rounded border border-hairline bg-surface px-3 py-2 text-sm text-ink">
                  {TEMPLATE_KEYS.map((k) => <option key={k} value={k}>{isTh ? SCHEDULE_TEMPLATES[k].nameTh : SCHEDULE_TEMPLATES[k].nameEn}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">{isTh ? 'วันที่มีผล' : 'Effective date'}</span>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="rounded border border-hairline bg-surface px-3 py-2 text-sm text-ink" />
              </label>
              <Button variant="secondary" size="sm" onClick={massAssign}><CalendarCheck size={14} className="mr-1" />{isTh ? `กำหนดให้ที่เลือก (${checked.size})` : `Assign selected (${checked.size})`}</Button>
              <div className="flex-1" />
              <Button variant="primary" size="sm" onClick={saveAndNotify}>{isTh ? 'บันทึก + แจ้งพนักงาน' : 'Save + notify'}</Button>
            </div>
          </Card>

          {/* Team table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-ink-muted">
                    <th className="py-3 px-3"><input type="checkbox" checked={checked.size === DEMO_TEAM.length} onChange={toggleAll} aria-label={isTh ? 'เลือกทั้งหมด' : 'Select all'} /></th>
                    <th className="py-3 px-3 font-semibold">{isTh ? 'พนักงาน' : 'Employee'}</th>
                    <th className="py-3 px-3 font-semibold">{isTh ? 'รูปแบบกะ' : 'Shift pattern'}</th>
                    <th className="py-3 px-3 font-semibold">{isTh ? 'ตรวจ DWS' : 'DWS check'}</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_TEAM.map((e) => {
                    const tplKey = assigned[e.id];
                    const v = validationFor(tplKey);
                    return (
                      <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-canvas-soft">
                        <td className="py-2 px-3"><input type="checkbox" checked={checked.has(e.id)} onChange={() => toggle(e.id)} aria-label={isTh ? e.nameTh : e.nameEn} /></td>
                        <td className="py-2 px-3 text-ink">{isTh ? e.nameTh : e.nameEn} <span className="text-ink-faint">· {e.id}</span></td>
                        <td className="py-2 px-3">
                          <select value={tplKey} onChange={(ev) => setAssigned((a) => ({ ...a, [e.id]: ev.target.value }))} className="rounded border border-hairline bg-surface px-2 py-1 text-sm text-ink">
                            {TEMPLATE_KEYS.map((k) => <option key={k} value={k}>{isTh ? SCHEDULE_TEMPLATES[k].nameTh : SCHEDULE_TEMPLATES[k].nameEn}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          {v.ok ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"><Check size={12} aria-hidden />{isTh ? 'ผ่าน' : 'Valid'}</span>
                          ) : (
                            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">{isTh ? `เตือน ${v.red + v.yellow}` : `${v.red + v.yellow} warning(s)`}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {toast && (
        <div role="status" aria-live="polite" className={cn('fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3', 'bg-ink text-canvas shadow-[var(--shadow-lg)] text-body font-medium')}>
          <Check size={16} aria-hidden /> {toast}
        </div>
      )}
    </div>
  );
}
