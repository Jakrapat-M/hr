'use client';

// admin/page.tsx — Cnext Admin Center landing
// Adopts the same vocabulary as /th/home (cnext-grain, cnext-blob,
// cnext-eyebrow, cnext-hero-title, cnext-tag, cnext-row, cnext-divider,
// cnext-card--cream, cnext-card--ink) so admins land on a page that
// feels like a sibling of the staff dashboard instead of a foreign
// admin-only surface. 5 entry groups cover BRD-EC Parts A-E.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  UserPlus,
  Settings,
  ShieldCheck,
  Database,
  Users,
  FileText,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessModule } from '@/lib/rbac';

// Each tile carries the MODULE_ACCESS key that gates its destination, so the
// landing only renders Quick-Links the current persona can actually reach
// (remove-not-hide). `path` is locale-agnostic; the locale prefix is applied
// at render time from the route param.
const ADMIN_SECTIONS = [
  {
    path: '/admin/hire',
    module: 'onboarding',
    icon: UserPlus,
    eyebrow: 'Lifecycle Actions',
    title: 'การจ้างพนักงาน',
    desc: 'รับใหม่ • จ้างซ้ำ • โอนย้าย • ออกจากงาน',
    stat: '4 workflows',
    tone: 'default' as const,
  },
  {
    path: '/admin/employees',
    module: 'profile',
    icon: Users,
    eyebrow: 'Employee Data',
    title: 'ข้อมูลพนักงาน',
    desc: 'ดูและแก้ข้อมูลพนักงาน • Employment Info',
    stat: '240K+ records',
    tone: 'cream' as const,
  },
  {
    path: '/admin/self-service',
    module: 'settings',
    icon: Settings,
    eyebrow: 'Self-Service Config',
    title: 'ตั้งค่า Self-Service',
    desc: 'Field config • Visibility • Mandatory • Quick Actions • Tiles',
    stat: '6 editors',
    tone: 'default' as const,
  },
  {
    path: '/admin/users',
    module: 'settings',
    icon: ShieldCheck,
    eyebrow: 'Users & Permissions',
    title: 'ผู้ใช้และสิทธิ์',
    desc: 'Role Groups • Data Permissions • Proxy • Audit',
    stat: '6 tools',
    tone: 'default' as const,
  },
  {
    path: '/admin/system',
    module: 'settings',
    icon: Database,
    eyebrow: 'Data Management',
    title: 'จัดการระบบ',
    desc: 'รายงาน • Integration • Security • Data migration',
    stat: '18 tools',
    tone: 'cream' as const,
  },
  {
    path: '/admin/reports',
    module: 'government-reports',
    icon: FileText,
    eyebrow: 'Reports',
    title: 'รายงาน',
    desc: 'รายงานทั้งหมด • CSV export',
    stat: 'ดูทั้งหมด',
    tone: 'default' as const,
  },
  {
    path: '/admin/foundation',
    module: 'positions',
    icon: Layers,
    eyebrow: 'EC Foundation',
    title: 'โครงสร้างองค์กร',
    desc: 'ผังองค์กร • ตำแหน่งงาน • หน่วยธุรกิจ',
    stat: '3 sections',
    tone: 'cream' as const,
  },
] as const;

const STATS = [
  { label: 'พนักงาน', value: '240K+', tone: 'ink' },
  { label: 'Workflow รอดำเนินการ', value: '0', tone: 'accent' },
  { label: 'บริษัท', value: '164', tone: 'ink' },
  { label: 'แผนก', value: '17K', tone: 'ink' },
] as const;

export default function AdminDashboardPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const roles = useAuthStore((s) => s.roles);

  // Remove-not-hide: keep only tiles whose destination module the current
  // persona can reach. The /admin route guard already admits hr_admin+, so
  // for legitimate admins every tile passes; the filter keeps the surface
  // honest if RBAC tightens or a narrower persona ever lands here.
  const visibleSections = ADMIN_SECTIONS.filter((s) =>
    canAccessModule(roles, s.module),
  );

  return (
    <div className="pb-8">
      {/* Row 1 — hero greeting (grain + blobs) + live workload tag */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div
          className="cnext-card cnext-grain"
          style={{ overflow: 'hidden', paddingRight: 'clamp(0px, 9.375vw, 150px)' }}
        >
          <div
            className="cnext-blob cnext-blob--teal hidden lg:block"
            style={{ width: 120, height: 150, right: -30, top: -30, opacity: 0.85 }}
            aria-hidden
          />
          <div
            className="cnext-blob cnext-blob--coral hidden lg:block"
            style={{ width: 80, height: 100, right: 60, bottom: -20, opacity: 0.7 }}
            aria-hidden
          />
          <div
            className="cnext-blob cnext-blob--butter hidden lg:block"
            style={{ width: 44, height: 56, right: 110, top: 80, opacity: 0.9 }}
            aria-hidden
          />
          <div className="cnext-eyebrow" style={{ marginBottom: 10 }}>
            Admin Center
          </div>
          <h1 className="cnext-hero-title" style={{ maxWidth: 460 }}>
            ศูนย์จัดการพนักงาน
            <br />
            <span className="cnext-hero-title-soft">
              จัดการข้อมูล การจ้าง และการตั้งค่าระบบ EC
            </span>
          </h1>
          <div className="cnext-row" style={{ marginTop: 22, gap: 10, flexWrap: 'wrap' }}>
            <Link
              href={`/${locale}/admin/hire`}
              className="cnext-button cnext-button--primary"
            >
              <UserPlus size={16} />
              จ้างพนักงานใหม่
            </Link>
            <Link
              href={`/${locale}/admin/employees`}
              className="cnext-button cnext-button--ghost"
            >
              <Users size={16} />
              ดูข้อมูลพนักงาน
            </Link>
          </div>
        </div>

        {/* Live stats card */}
        <div className="cnext-card">
          <div className="cnext-row" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="cnext-eyebrow">ภาพรวม</div>
              <h3 className="mt-1.5 font-display text-xl font-semibold leading-[1.2] tracking-tight text-ink">
                สถานะระบบ
              </h3>
            </div>
            <span className="cnext-tag cnext-tag--accent" style={{ marginLeft: 'auto' }}>
              Live
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4" style={{ marginTop: 18 }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="cnext-eyebrow" style={{ fontSize: 10 }}>
                  {s.label}
                </div>
                <div
                  className="mt-1 font-display text-2xl font-semibold leading-none"
                  style={{
                    color:
                      s.tone === 'accent'
                        ? 'var(--color-accent)'
                        : 'var(--color-ink)',
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
          <hr className="cnext-divider" />
          <div
            className="cnext-row"
            style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}
          >
            <Sparkles size={12} aria-hidden />
            <span>สรุปล่าสุด · {new Date().toLocaleDateString('th-TH')}</span>
          </div>
        </div>
      </div>

      {/* Row 2 — section grid */}
      <div style={{ marginTop: 20 }}>
        <div className="cnext-row" style={{ marginBottom: 12 }}>
          <div>
            <div className="cnext-eyebrow">Admin Tools</div>
            <h3 className="mt-1.5 font-display text-xl font-semibold leading-[1.2] tracking-tight text-ink">
              เครื่องมือการจัดการ
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            const cardClass =
              section.tone === 'cream' ? 'cnext-card cnext-card--cream' : 'cnext-card';
            return (
              <Link
                key={section.path}
                href={`/${locale}${section.path}`}
                className={`${cardClass} group relative transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2`}
              >
                <div className="cnext-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cnext-eyebrow">{section.eyebrow}</div>
                    <h4 className="mt-1 font-display text-base font-semibold text-ink group-hover:text-accent">
                      {section.title}
                    </h4>
                    <p className="mt-1 text-small text-ink-soft">{section.desc}</p>
                    <div
                      className="cnext-row"
                      style={{ marginTop: 10, gap: 8, fontSize: 12, color: 'var(--color-ink-muted)' }}
                    >
                      <span className="cnext-tag">{section.stat}</span>
                      <span className="cnext-spacer" />
                      <ArrowRight
                        size={14}
                        className="text-ink-muted group-hover:text-accent"
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Row 3 — recent activity (ink card, matching home.tsx week-recognition pattern) */}
      <div
        className="cnext-card cnext-card--ink"
        style={{ overflow: 'hidden', position: 'relative', marginTop: 20 }}
      >
        <div
          className="cnext-blob cnext-blob--teal"
          style={{ width: 90, height: 110, right: -20, bottom: -30, opacity: 0.55 }}
          aria-hidden
        />
        <div className="cnext-eyebrow" style={{ color: 'var(--color-accent)' }}>
          <Sparkles
            size={12}
            style={{ display: 'inline-block', verticalAlign: -2, marginRight: 4 }}
            aria-hidden
          />
          Recent Activity
        </div>
        <h3 className="mt-2 font-display text-xl font-semibold leading-[1.2] tracking-tight text-[color:var(--color-canvas-soft)]">
          กิจกรรมล่าสุด
        </h3>
        <p
          className="mt-2 text-small"
          style={{ color: 'var(--color-canvas-soft)', opacity: 0.75 }}
        >
          ยังไม่มีกิจกรรมในระบบ — เริ่มใช้งานโดยคลิกหนึ่งในเครื่องมือด้านบน
        </p>
      </div>
    </div>
  );
}
