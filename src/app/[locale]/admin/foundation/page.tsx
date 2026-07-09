'use client';

// admin/foundation/page.tsx — Foundation landing (Org setup for HRIS Admin)
// 3 tiles: Org Chart Tree, Positions, Divisions

import Link from 'next/link';
import { Network, Briefcase, Building2, Clock, HeartPulse, ArrowRight } from 'lucide-react';
import { useFoundationSummary } from '@/hooks/use-foundation';
import { AccessDenied } from '@/components/shared/access-denied';
import { useAuthStore } from '@/stores/auth-store';

type Tile = {
  href: string;
  icon: typeof Network;
  eyebrow: string;
  title: string;
  desc: string;
  // Either a live summary stat, or a static tag (config surfaces have no count).
  statKey?: 'orgUnitCount' | 'positionCount' | 'divisionCount';
  statLabel?: string;
  tag?: string;
};

const TILES: Tile[] = [
  {
    href: '/th/admin/organization',
    icon: Network,
    eyebrow: 'Organization Structure',
    title: 'ผังองค์กร',
    desc: 'ดูและจัดการโครงสร้างแผนกแบบ tree — ขยาย/ยุบตามระดับ',
    statKey: 'orgUnitCount',
    statLabel: 'หน่วยงาน',
  },
  {
    href: '/th/admin/positions',
    icon: Briefcase,
    eyebrow: 'Position Master',
    title: 'ตำแหน่งงาน',
    desc: 'รายการตำแหน่งทั้งหมด • จำนวนพนักงานตามแผน vs จริง • สถานะ',
    statKey: 'positionCount',
    statLabel: 'ตำแหน่ง',
  },
  {
    href: '/th/admin/foundation/divisions',
    icon: Building2,
    eyebrow: 'Division Setup',
    title: 'หน่วยธุรกิจ',
    desc: 'กลุ่มบริษัทและหน่วยธุรกิจระดับสูงสุด • เพิ่ม / แก้ไข',
    statKey: 'divisionCount',
    statLabel: 'หน่วยธุรกิจ',
  },
  // Config reference data — nested here (2026-06-10 IA simplification) instead of
  // standalone System-group menu leaves. Single source of truth for leave/time
  // rules and the benefit catalog.
  {
    href: '/th/admin/system/time-policy',
    icon: Clock,
    eyebrow: 'Time & Leave Policy',
    title: 'นโยบายเวลาทำงาน',
    desc: 'วันลา • เกณฑ์ใบรับรองแพทย์ • วันสะสม • เวลาเข้างานมาตรฐาน',
    tag: 'ข้อมูลตั้งค่า',
  },
  {
    href: '/th/admin/system/benefit-catalog',
    icon: HeartPulse,
    eyebrow: 'Benefit Catalog',
    title: 'แคตตาล็อกสวัสดิการ',
    desc: 'ประเภทสวัสดิการ + โควตาต่อปี • HR Admin ปรับ override ตามระดับ',
    tag: 'ข้อมูลตั้งค่า',
  },
];

export default function FoundationLandingPage() {
  const roles = useAuthStore((state) => state.roles);
  const summary = useFoundationSummary();

  // RBAC: EC Foundation is HRIS Admin (hr_manager) only — match the menu
  // (admin/layout admits hr_admin+, so deny hr_admin here in place).
  if (!roles.includes('hr_manager')) {
    return (
      <AccessDenied
        reasonTh="เฉพาะ HRIS Admin (hr_manager)"
        reason="HRIS Admin (hr_manager) only"
      />
    );
  }

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="cnext-card cnext-grain" style={{ overflow: 'hidden', marginBottom: 20 }}>
        <div
          className="cnext-blob cnext-blob--teal hidden lg:block"
          style={{ width: 100, height: 130, right: -20, top: -20, opacity: 0.7 }}
          aria-hidden
        />
        <div className="cnext-eyebrow" style={{ marginBottom: 8 }}>
          Admin · EC Foundation
        </div>
        <h1 className="cnext-hero-title" style={{ maxWidth: 500 }}>
          โครงสร้างองค์กร
          <br />
          <span className="cnext-hero-title-soft">
            จัดการแผนก ตำแหน่ง และหน่วยธุรกิจ
          </span>
        </h1>
        <div
          className="cnext-row"
          style={{ marginTop: 16, gap: 24, flexWrap: 'wrap' }}
        >
          <div>
            <div className="cnext-eyebrow" style={{ fontSize: 10 }}>หน่วยงานทั้งหมด</div>
            <div className="font-display text-2xl font-semibold text-ink">
              {summary.orgUnitCount}
            </div>
          </div>
          <div>
            <div className="cnext-eyebrow" style={{ fontSize: 10 }}>ตำแหน่ง</div>
            <div className="font-display text-2xl font-semibold text-ink">
              {summary.positionCount}
            </div>
          </div>
          <div>
            <div className="cnext-eyebrow" style={{ fontSize: 10 }}>พนักงานในระบบ</div>
            <div className="font-display text-2xl font-semibold" style={{ color: 'var(--color-accent)' }}>
              {summary.totalHeadcount.toLocaleString('th-TH')}
            </div>
          </div>
        </div>
      </div>

      {/* 3-tile grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="cnext-card group relative transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2"
            >
              <div className="cnext-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon size={20} aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cnext-eyebrow">{tile.eyebrow}</div>
                  <h2 className="mt-1 font-display text-base font-semibold text-ink group-hover:text-accent">
                    {tile.title}
                  </h2>
                  <p className="mt-1 text-small text-ink-soft">{tile.desc}</p>
                  <div className="cnext-row" style={{ marginTop: 10, gap: 8 }}>
                    <span className="cnext-tag">
                      {tile.statKey ? `${summary[tile.statKey]} ${tile.statLabel}` : tile.tag}
                    </span>
                    <span className="cnext-spacer" />
                    <ArrowRight size={14} className="text-ink-muted group-hover:text-accent" aria-hidden />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
