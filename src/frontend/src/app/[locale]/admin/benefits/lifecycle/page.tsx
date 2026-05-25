'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardEyebrow, Button } from '@/components/humi';
import { Capability } from '@/components/humi';
import { LifecycleAdminForm } from '@/components/benefits/templates/LifecycleAdminForm';
import { getPlan } from '@/data/benefits/plan-registry';
import { mockProgress } from '@/lib/mock-async';

// ── Benefit Lifecycle — วงจรสวัสดิการ — 4-tab admin surface ─────────────────
// Tabs: On-board (BE-CYC-002) / Change (BE-CYC-003) / Off-board (BE-CYC-004)
//       / Annual Enrollment (BE-CYC-001)
// Payment Cycle (BE-CYC-005) moved to /admin/benefits/payment (PR-E).

const TABS = [
  { id: 'onboard',  planId: 'BE-CYC-002', labelTh: 'รับเข้างาน',       labelEn: 'On-boarding' },
  { id: 'change',   planId: 'BE-CYC-003', labelTh: 'เปลี่ยนแปลง',      labelEn: 'Change' },
  { id: 'offboard', planId: 'BE-CYC-004', labelTh: 'ลาออก',             labelEn: 'Off-boarding' },
  { id: 'annual',   planId: 'BE-CYC-001', labelTh: 'ลงทะเบียนประจำปี', labelEn: 'Annual Enrollment' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function BenefitLifecyclePage() {
  const t = useTranslations('admin_benefits_manage');
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [activeTab, setActiveTab] = useState<TabId>('onboard');

  // "Run All" — mock orchestration of the 4 lifecycle operations. No backend
  // this phase; advances a visible progress bar + completion banner.
  const [running, setRunning] = useState(false);
  const [runStep, setRunStep] = useState(0);
  const [runDone, setRunDone] = useState(false);

  const handleRunAll = async () => {
    setRunDone(false);
    setRunning(true);
    setRunStep(0);
    await mockProgress(TABS.length, (s) => setRunStep(s), 500);
    setRunning(false);
    setRunDone(true);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>{isTh ? 'สวัสดิการ' : 'Benefits'}</CardEyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {isTh ? 'วงจรสวัสดิการ' : 'Benefit Lifecycle'}
          </h1>
          <p className="mt-2 text-small text-ink-muted">
            {isTh
              ? 'จัดการวงจรสวัสดิการตามเหตุการณ์ในชีวิตการทำงาน'
              : 'Manage benefit lifecycle events for employees'}
          </p>
        </div>
        <Capability action="editFoundation" fallback={
          <Button variant="secondary" disabled>{t('runAllDisabled')}</Button>
        }>
          <Button
            variant="secondary"
            onClick={handleRunAll}
            disabled={running}
            className="flex items-center gap-2"
          >
            {running && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {running ? (isTh ? 'กำลังรัน…' : 'Running…') : t('runAll')}
          </Button>
        </Capability>
      </header>

      {/* Run All — progress + completion feedback */}
      {(running || runDone) && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-small">
            <span className="font-medium text-ink">
              {runDone
                ? (isTh ? 'รันวงจรสวัสดิการครบทุกขั้นตอนแล้ว' : 'All lifecycle operations completed')
                : isTh
                  ? `กำลังรัน ${TABS[runStep - 1]?.labelTh ?? ''}…`
                  : `Running ${TABS[runStep - 1]?.labelEn ?? ''}…`}
            </span>
            <span className="text-ink-muted tabular-nums">{runStep}/{TABS.length}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full border border-hairline bg-surface">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(runStep / TABS.length) * 100}%` }}
            />
          </div>
          {runDone && (
            <div className="flex items-center gap-2 pt-1 text-small text-success-ink">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
              {isTh
                ? 'รันรับเข้างาน, เปลี่ยนแปลง, ลาออก และลงทะเบียนประจำปีเรียบร้อย'
                : 'On-boarding, change, off-boarding, and annual enrollment all run'}
            </div>
          )}
        </div>
      )}

      {/* Tab nav */}
      <div role="tablist" aria-label={t('tabsLabel')} className="flex gap-1 overflow-x-auto rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-1">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 whitespace-nowrap rounded-[var(--radius-sm)] px-4 py-2 text-small font-medium transition-colors duration-[var(--dur-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                isActive
                  ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                  : 'text-ink-muted hover:bg-surface/60 hover:text-ink',
              ].join(' ')}
            >
              {isTh ? tab.labelTh : tab.labelEn}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {TABS.map((tab) => {
        const plan = getPlan(tab.planId);
        if (!plan) return null;
        return (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={tab.id !== activeTab}
          >
            <LifecycleAdminForm plan={plan} />
          </div>
        );
      })}

      {/* Scope legend */}
      <Card variant="raised" size="md">
        <CardEyebrow>{t('legendEyebrow')}</CardEyebrow>
        <p className="font-semibold text-ink">{t('legendTitle')}</p>
        <ul className="mt-3 space-y-2 text-small text-ink-muted">
          <li>
            <span className="font-medium text-ink">BE-CYC-002</span>
            {' — '}
            {isTh ? 'เปิดสิทธิ์สวัสดิการสำหรับพนักงานเข้าใหม่' : 'Opens benefit entitlements for new hires'}
          </li>
          <li>
            <span className="font-medium text-ink">BE-CYC-003</span>
            {' — '}
            {isTh ? 'ปรับสิทธิ์สวัสดิการเมื่อมีการเปลี่ยนแปลงสถานะ' : 'Adjusts entitlements on status changes'}
          </li>
          <li>
            <span className="font-medium text-ink">BE-CYC-004</span>
            {' — '}
            {isTh ? 'ปิดสิทธิ์สวัสดิการเมื่อพนักงานลาออก' : 'Closes entitlements on employee termination'}
          </li>
          <li>
            <span className="font-medium text-ink">BE-CYC-001</span>
            {' — '}
            {isTh ? 'รอบลงทะเบียนสวัสดิการประจำปี' : 'Annual benefit enrollment window'}
          </li>
        </ul>
      </Card>

    </div>
  );
}
