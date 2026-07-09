'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Clock, CalendarOff, Timer, PencilLine, LogIn, ListChecks, BarChart3 } from 'lucide-react';
import { Card, CardTitle, DemoValuesDisclaimer } from '@/components/cnext';
import { useAuthStore } from '@/stores/auth-store';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useOvertimeRequests } from '@/stores/overtime-requests';
import { useTimeCorrections } from '@/stores/time-corrections';
import { buildMyRequests } from '@/lib/time/my-requests';
import { demoToday } from '@/lib/time/period';
import { TimeOffBalanceCard } from '@/components/time/TimeOffBalanceCard';
import { TeamAttendanceSummary } from '@/components/time/TeamAttendanceSummary';

interface TimeTileDef {
  key: string;
  icon: typeof Clock;
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  href: string;
  /** When set, the tile shows this store-backed count as a badge. */
  badgeKey?: 'pending-requests';
}

interface TileGroup {
  key: string;
  labelEn: string;
  labelTh: string;
  tiles: TimeTileDef[];
}

// Self-service tiles, grouped by intent (Daily / Requests / Reports). Every tile
// maps to an existing employee route — no reviewer-gated surfaces live here.
const GROUPS: TileGroup[] = [
  {
    key: 'daily',
    labelEn: 'Daily',
    labelTh: 'รายวัน',
    tiles: [
      {
        key: 'clock',
        icon: LogIn,
        titleEn: 'Clock in/out',
        titleTh: 'ลงเวลาเข้า-ออก',
        descEn: 'Mark attendance',
        descTh: 'บันทึกการเข้างาน',
        href: 'time/clock',
      },
      {
        key: 'timesheet',
        icon: Clock,
        titleEn: 'My timesheet',
        titleTh: 'ตารางเวลาของฉัน',
        descEn: 'View monthly record',
        descTh: 'ดูบันทึกรายเดือน',
        href: 'time/timesheet',
      },
    ],
  },
  {
    key: 'requests',
    labelEn: 'Requests',
    labelTh: 'คำขอ',
    tiles: [
      {
        key: 'my-requests',
        icon: ListChecks,
        titleEn: 'My requests',
        titleTh: 'คำขอของฉัน',
        descEn: 'Track all requests',
        descTh: 'ติดตามคำขอทั้งหมด',
        href: 'time/my-requests',
        badgeKey: 'pending-requests',
      },
      {
        key: 'time-off',
        icon: CalendarOff,
        titleEn: 'Leave request',
        titleTh: 'ขอลา',
        descEn: 'Apply for leave',
        descTh: 'ยื่นคำขอลา',
        href: 'timeoff',
      },
      {
        key: 'overtime',
        icon: Timer,
        titleEn: 'OT request',
        titleTh: 'ขอทำโอที',
        descEn: 'Request overtime',
        descTh: 'ขอทำงานล่วงเวลา',
        href: 'overtime',
      },
      {
        key: 'corrections',
        icon: PencilLine,
        titleEn: 'Time correction',
        titleTh: 'แก้ไขเวลา',
        descEn: 'Fix missing punch',
        descTh: 'แก้ไขเวลาที่บันทึกผิด',
        href: 'time/corrections',
      },
    ],
  },
  {
    key: 'reports',
    labelEn: 'Reports',
    labelTh: 'รายงาน',
    tiles: [
      {
        key: 'report',
        icon: BarChart3,
        titleEn: 'Report',
        titleTh: 'รายงาน',
        descEn: 'Attendance history',
        descTh: 'ประวัติการเข้างาน',
        href: 'reports',
      },
    ],
  },
];

export default function TimeLandingPage() {
  const params = useParams();
  const locale = params?.locale as string ?? 'th';
  const isTh = locale === 'th';

  // Pending-request count for the "My requests" badge — unified from the same
  // three stores the /time/my-requests view reads, so the number always agrees.
  const userId = useAuthStore((s) => s.userId) ?? 'EMP001';
  const leave = useLeaveApprovals((s) => s.requests);
  const ot = useOvertimeRequests((s) => s.requests);
  const tc = useTimeCorrections((s) => s.requests);
  const pendingRequests = useMemo(
    () => buildMyRequests(userId, { leave, ot, tc }, demoToday()).filter((r) => r.status === 'pending').length,
    [userId, leave, ot, tc],
  );

  const badgeFor = (tile: TimeTileDef) =>
    tile.badgeKey === 'pending-requests' ? pendingRequests : undefined;

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

      {/* Team attendance summary — moved here from /home, STA-248 */}
      <TeamAttendanceSummary />

      {/* Self-service surface, grouped Daily / Requests / Reports (open to everyone) */}
      {GROUPS.map((group) => (
        <section key={group.key} aria-labelledby={`time-${group.key}-heading`} className="space-y-3">
          <h2
            id={`time-${group.key}-heading`}
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
          >
            {isTh ? group.labelTh : group.labelEn}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {group.tiles.map((tile) => (
              <TimeTile key={tile.key} tile={tile} locale={locale} isTh={isTh} badge={badgeFor(tile)} />
            ))}
          </div>
          {/* The Time-Off balance ledger lives here on the hub (moved off the My
              Timesheet tabs, STA-195) — inside the Reports group so it adds no
              heading that collides with the group/tile headings. */}
          {group.key === 'reports' && (
            <TimeOffBalanceCard empId={userId} isTh={isTh} />
          )}
        </section>
      ))}
    </div>
  );
}

function TimeTile({
  tile,
  locale,
  isTh,
  badge,
}: {
  tile: TimeTileDef;
  locale: string;
  isTh: boolean;
  badge?: number;
}) {
  const { icon: Icon, titleEn, titleTh, descEn, descTh, href } = tile;
  return (
    <Link href={`/${locale}/${href}`} className="group block no-underline">
      <Card className="relative h-full hover:shadow-[var(--shadow-card)] transition-shadow">
        {typeof badge === 'number' && badge > 0 && (
          <span
            className="absolute right-3 top-3 flex items-center justify-center rounded-full bg-danger text-white text-xs font-semibold"
            style={{ minWidth: 20, height: 20, padding: '0 6px' }}
            aria-label={isTh ? `${badge} คำขอที่รออนุมัติ` : `${badge} pending requests`}
          >
            {badge}
          </span>
        )}
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
