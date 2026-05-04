'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Card, CardEyebrow, FormField, buttonVariants } from '@/components/humi';
import { pickTemplate } from '@/components/benefits/templates';
import { getEmployeeClaimablePlans, getPlan } from '@/data/benefits/plan-registry';
import { benefitsHubRoute } from '@/lib/benefit-routes';

export default function ClaimPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [planId, setPlanId] = useState(searchParams.get('planId') ?? '');

  const claimablePlans = useMemo(() => getEmployeeClaimablePlans(), []);

  const selectedPlan = planId ? (getPlan(planId) ?? null) : null;
  const FormComponent = selectedPlan ? pickTemplate(selectedPlan) : null;

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (planId) params.set('planId', planId); else params.delete('planId');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>{isTh ? 'สวัสดิการ · เบิกสวัสดิการ' : 'Benefits · Submit a claim'}</CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            {isTh ? 'เบิกสวัสดิการ' : 'Submit a Claim'}
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            {isTh
              ? 'เลือกประเภทสวัสดิการที่ต้องการเบิก แล้วกรอกแบบฟอร์ม — รองรับการแชร์ลิงก์ตรงไปยังประเภทที่เลือก'
              : 'Choose the benefit you want to claim, then fill in the form. Direct links by plan id are supported.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={benefitsHubRoute(locale)} className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeft size={14} aria-hidden />
            {isTh ? 'กลับ Benefits Hub' : 'Back to Benefits Hub'}
          </Link>
          <Link href={`/${locale}/requests`} className={buttonVariants({ variant: 'secondary' })}>
            <ClipboardList size={14} aria-hidden />
            {isTh ? 'ติดตามคำขอ' : 'Track requests'}
          </Link>
        </div>
      </header>

      <Card size="md" className="p-5">
        <CardEyebrow>{isTh ? 'เลือกประเภทเบิก' : 'Choose claim type'}</CardEyebrow>
        <div className="mt-3">
          <FormField id="claim-plan-picker" label={isTh ? 'ประเภทสวัสดิการ' : 'Benefit type'} required>
            {(controlProps) => (
              <select
                {...controlProps}
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas focus:border-accent"
              >
                <option value="">{isTh ? '— เลือกประเภท —' : '— Select a type —'}</option>
                {claimablePlans.map((p) => (
                  <option key={p.id} value={p.id}>{isTh ? p.nameTh : p.nameEn}</option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      </Card>

      {selectedPlan && FormComponent ? (
        <FormComponent plan={selectedPlan} onSubmitted={(id) => console.log('submitted workflow', id)} />
      ) : (
        <p className="rounded-md border border-hairline bg-canvas-soft p-6 text-center text-small text-ink-muted">
          {isTh
            ? 'กรุณาเลือกประเภทสวัสดิการที่ต้องการเบิกจากตัวเลือกด้านบน'
            : 'Please select a benefit type above to start a claim.'}
        </p>
      )}
    </div>
  );
}
