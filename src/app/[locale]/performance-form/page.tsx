'use client';

// performance-form/page.tsx — honest external-system placeholder.
//
// Performance Management is an EXTERNAL system (see project memory): it is NOT
// implemented inside this HRMS. We keep the menu leaf (do not remove it), but
// render an explicit, honest EmptyState that says so in both TH/EN instead of
// faking a "coming soon" form. Bilingual copy is passed as EmptyState props
// (the canonical TH/EN-at-call-site convention used across the app).

import { ExternalLink } from 'lucide-react';
import { EmptyState } from '@/components/cnext';

export default function PerformanceFormPage() {
  return (
    <div className="mx-auto w-full max-w-2xl py-6">
      <EmptyState
        icon={ExternalLink}
        titleTh="การประเมินผลงานอยู่ในระบบภายนอก"
        titleEn="Performance management lives in an external system"
        descTh="โมดูลประเมินผลงานไม่ได้เป็นส่วนหนึ่งของระบบ HR นี้ — ใช้งานผ่านระบบประเมินผลงานขององค์กรโดยตรง หน้านี้เป็นเพียงทางลัดในเมนูเท่านั้น"
        descEn="The performance review module is not part of this HR system. It runs in the organization's dedicated performance platform. This page is only a menu shortcut, not a form."
      />
    </div>
  );
}
