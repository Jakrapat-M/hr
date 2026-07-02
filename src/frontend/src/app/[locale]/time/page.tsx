'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Clock, CalendarOff, Timer, ClipboardList, PencilLine, CalendarDays, LogIn, ListChecks } from 'lucide-react';
import { Card, CardTitle, DemoValuesDisclaimer } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';

const TILES = [
  {
    key: 'clock',
    icon: LogIn,
    titleEn: 'Clock In / Out',
    titleTh: 'ลงเวลาเข้า-ออก',
    descEn: 'Punch in and out for today',
    descTh: 'ลงเวลาเข้า-ออกงานสำหรับวันนี้',
    href: 'time/clock',
  },
  {
    key: 'timesheet',
    icon: Clock,
    titleEn: 'Timesheet',
    titleTh: 'บันทึกเวลางาน',
    descEn: 'Log weekly hours per project',
    descTh: 'บันทึกชั่วโมงทำงานรายสัปดาห์ตามโครงการ',
    href: 'time/timesheet',
  },
  {
    key: 'time-off',
    icon: CalendarOff,
    titleEn: 'Time Off',
    titleTh: 'การลา',
    descEn: 'Request and track leave',
    descTh: 'ยื่นคำขอลาและติดตามสถานะ',
    href: 'timeoff',
  },
  {
    key: 'overtime',
    icon: Timer,
    titleEn: 'Overtime',
    titleTh: 'ล่วงเวลา',
    descEn: 'Submit OT requests (Thai Labor Law)',
    descTh: 'ยื่นขอทำงานล่วงเวลาตามกฎหมายแรงงานไทย',
    href: 'overtime',
  },
  {
    key: 'corrections',
    icon: PencilLine,
    titleEn: 'Time Correction',
    titleTh: 'แก้ไขเวลา',
    descEn: 'Fix a mis-recorded clock-in / clock-out',
    descTh: 'ขอแก้ไขเวลาเข้า-ออกงานที่บันทึกผิดพลาด',
    href: 'time/corrections',
  },
  {
    key: 'my-requests',
    icon: ListChecks,
    titleEn: 'My Request',
    titleTh: 'คำขอของฉัน',
    descEn: 'Track your leave, overtime & time-correction requests',
    descTh: 'ติดตามคำขอลา ล่วงเวลา และแก้ไขเวลาของคุณ',
    href: 'time/my-requests',
  },
];

// Manager/HR-only tiles (remove-not-hide). Both the approval inbox and the
// timesheet-review surface require reviewer rights; their routes guard
// server-side (/quick-approve → canAccessModule, /time/review → reviewer roles),
// so rendering these tiles to an employee would dead-end them in AccessDenied.
// They live here — gated by `canReview` — never in the self-service TILES list.
const MANAGER_TILES = [
  {
    key: 'timesheet-review',
    icon: ClipboardList,
    titleEn: 'Timesheet Review',
    titleTh: 'ตรวจสอบใบบันทึกเวลา',
    descEn: 'Read-only view of timesheets submitted by your team',
    descTh: 'มุมมองแบบอ่านอย่างเดียวของใบบันทึกเวลาที่ทีมส่ง',
    href: 'time/review',
  },
  {
    key: 'shift-schedule',
    icon: CalendarDays,
    titleEn: 'Team Shift Schedule',
    titleTh: 'ตารางกะทีม',
    descEn: 'Assign and validate team shifts from the working pattern',
    descTh: 'กำหนดและตรวจสอบตารางกะของทีมจากรูปแบบเวลาทำงาน',
    href: 'time/shift-schedule',
  },
] as const;

export default function TimeLandingPage() {
  const params = useParams();
  const locale = params?.locale as string ?? 'th';
  const isTh = locale === 'th';

  const roles = useAuthStore((s) => s.roles);
  const canReview = hasAnyRole(roles, ['manager', 'hrbp', 'spd', 'hr_admin', 'hr_manager']);

  return (
    <div className="p-6 space-y-8">
      {/* Hero */}
      <div className="rounded-[var(--radius-md)] bg-canvas-soft border border-hairline p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1">
          {isTh ? 'เวลาและการเข้างาน' : 'Time & Attendance'}
        </p>
        <h1 className="text-2xl font-bold text-ink">
          {isTh ? 'โมดูลเวลางาน' : 'Time Module'}
        </h1>
        <p className="mt-2 text-sm text-ink-muted max-w-xl">
          {isTh
            ? 'บันทึกเวลางาน ยื่นคำขอลา และขอทำงานล่วงเวลา — ครบถ้วนในที่เดียว'
            : 'Log hours, request leave, and submit overtime — all in one place.'}
        </p>
      </div>

      <DemoValuesDisclaimer />

      {/* Employee surface — self time view (open to everyone) */}
      <section aria-labelledby="time-self-heading" className="space-y-3">
        <h2 id="time-self-heading" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          {isTh ? 'ของฉัน' : 'My Time'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TILES.map((tile) => (
            <TimeTile key={tile.key} tile={tile} locale={locale} isTh={isTh} />
          ))}
        </div>
      </section>

      {/* Manager/HR surface — approvals + review (remove-not-hide). The routes
          themselves also guard server-side; we simply never render a dead-end
          tile for non-reviewers. */}
      {canReview && (
        <section aria-labelledby="time-review-heading" className="space-y-3">
          <h2 id="time-review-heading" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {isTh ? 'สำหรับผู้จัดการ' : 'For Managers'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MANAGER_TILES.map((tile) => (
              <TimeTile key={tile.key} tile={tile} locale={locale} isTh={isTh} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TimeTile({
  tile,
  locale,
  isTh,
}: {
  tile: {
    key: string;
    icon: typeof Clock;
    titleEn: string;
    titleTh: string;
    descEn: string;
    descTh: string;
    href: string;
  };
  locale: string;
  isTh: boolean;
}) {
  const { icon: Icon, titleEn, titleTh, descEn, descTh, href } = tile;
  return (
    <Link href={`/${locale}/${href}`} className="group block no-underline">
      <Card className="h-full hover:shadow-[var(--shadow-card)] transition-shadow">
        <div className="flex items-start gap-4 p-5">
          <span
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 48,
              height: 48,
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
            }}
          >
            <Icon size={22} aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base font-semibold group-hover:text-accent transition-colors">
              {isTh ? titleTh : titleEn}
            </CardTitle>
            <p className="mt-1 text-sm text-ink-muted">{isTh ? descTh : descEn}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
