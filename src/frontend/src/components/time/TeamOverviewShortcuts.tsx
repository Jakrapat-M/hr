'use client';

// TeamOverviewShortcuts — STA-249 (Time · Team Overview).
// The shortcuts surface for the manager Team Overview page: a row of QUICK-JUMP
// buttons at the top that smooth-scroll to each grouping, plus four grouped
// HUMI cards (Dashboard / Submit on Behalf / Schedule / Reports). Each item is
// a locale-preserving Link to its real route, or — when no route exists yet — a
// disabled "เร็วๆ นี้ / Coming soon" chip (never a dead link, never a ticket
// number). Route targets are verified against src/app/[locale]/ at build time of
// this plan; a `href: null` item is the intentional coming-soon fallback.

import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  Inbox,
  CalendarRange,
  CalendarPlus,
  Timer,
  PencilLine,
  CalendarCheck,
  Users,
  CalendarClock,
  BarChart3,
  LayoutDashboard,
  Send,
  CalendarDays,
  FileBarChart,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/humi';
import { cn } from '@/lib/utils';

type ShortcutItem = {
  id: string;
  icon: LucideIcon;
  labelTh: string;
  labelEn: string;
  /** Locale-relative route (prefixed with `/${locale}` at render), or null for
   *  a route that does not exist yet → renders a "coming soon" chip. */
  href: string | null;
};

type ShortcutGroup = {
  key: string;
  anchorId: string;
  icon: LucideIcon;
  titleTh: string;
  titleEn: string;
  items: ShortcutItem[];
};

// Route targets verified present in src/app/[locale]/ (STA-249):
//   /quick-approve /roster /timeoff /overtime /time/corrections
//   /team/shift-assign /time/shift-schedule /reports
// Holiday Assign has no route yet → coming-soon.
const GROUPS: ShortcutGroup[] = [
  {
    key: 'dashboard',
    anchorId: 'grp-dashboard',
    icon: LayoutDashboard,
    titleTh: 'แดชบอร์ด',
    titleEn: 'Dashboard',
    items: [
      { id: 'team-requests', icon: Inbox, labelTh: 'คำขอของทีม', labelEn: 'Team Requests', href: '/quick-approve' },
      { id: 'team-timesheet', icon: CalendarRange, labelTh: 'ตารางเวลาทีม', labelEn: 'Team Timesheet', href: '/roster' },
    ],
  },
  {
    key: 'submit-on-behalf',
    anchorId: 'grp-submit-on-behalf',
    icon: Send,
    titleTh: 'ยื่นแทนพนักงาน',
    titleEn: 'Submit on Behalf',
    items: [
      { id: 'leave-request', icon: CalendarPlus, labelTh: 'ขอลาหยุด', labelEn: 'Leave Request', href: '/timeoff' },
      { id: 'ot-plan', icon: Timer, labelTh: 'วางแผน OT', labelEn: 'OT Plan', href: '/overtime' },
      { id: 'time-correction', icon: PencilLine, labelTh: 'แก้ไขเวลา', labelEn: 'Time Correction', href: '/time/corrections' },
      { id: 'holiday-assign', icon: CalendarCheck, labelTh: 'กำหนดวันหยุด', labelEn: 'Holiday Assign', href: null },
    ],
  },
  {
    key: 'schedule',
    anchorId: 'grp-schedule',
    icon: CalendarDays,
    titleTh: 'ตารางงาน',
    titleEn: 'Schedule',
    items: [
      { id: 'shift-assignments', icon: Users, labelTh: 'มอบหมายกะ', labelEn: 'Shift Assignments', href: '/team/shift-assign' },
      { id: 'work-schedule', icon: CalendarClock, labelTh: 'ตารางการทำงาน', labelEn: 'Work Schedule', href: '/time/shift-schedule' },
    ],
  },
  {
    key: 'reports',
    anchorId: 'grp-reports',
    icon: FileBarChart,
    titleTh: 'รายงาน',
    titleEn: 'Reports',
    items: [
      { id: 'report', icon: BarChart3, labelTh: 'รายงาน', labelEn: 'Report', href: '/reports' },
    ],
  },
];

function scrollToAnchor(anchorId: string) {
  if (typeof document === 'undefined') return;
  document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function TeamOverviewShortcuts() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  return (
    <section
      data-testid="team-overview-shortcuts"
      aria-label={isTh ? 'ทางลัด' : 'Shortcuts'}
      className="flex flex-col gap-4"
    >
      {/* Quick-jump buttons — smooth-scroll to each grouping. */}
      <nav
        data-testid="shortcut-quickjump"
        aria-label={isTh ? 'ทางลัดไปยังหมวด' : 'Jump to section'}
        className="flex flex-wrap gap-2"
      >
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            data-testid={`quickjump-${g.key}`}
            onClick={() => scrollToAnchor(g.anchorId)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-1.5 text-small font-medium text-ink-soft transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
          >
            <g.icon size={15} aria-hidden />
            {isTh ? g.titleTh : g.titleEn}
          </button>
        ))}
      </nav>

      {/* Grouping cards. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {GROUPS.map((g) => (
          <div key={g.key} id={g.anchorId} data-testid={`shortcut-group-${g.key}`} className="scroll-mt-24">
            <Card variant="raised" size="md">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent"
                    aria-hidden
                  >
                    <g.icon size={16} />
                  </span>
                  <h3 className="text-small font-semibold text-ink">{isTh ? g.titleTh : g.titleEn}</h3>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {g.items.map((item) => {
                    const label = isTh ? item.labelTh : item.labelEn;
                    if (!item.href) {
                      return (
                        <li key={item.id}>
                          <span
                            data-testid={`shortcut-item-${item.id}`}
                            aria-disabled="true"
                            className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-dashed border-hairline bg-canvas-soft px-3 py-2 text-small text-ink-muted"
                          >
                            <span className="inline-flex items-center gap-2">
                              <item.icon size={15} aria-hidden />
                              {label}
                            </span>
                            <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-faint">
                              {isTh ? 'เร็วๆ นี้' : 'Coming soon'}
                            </span>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/${locale}${item.href}`}
                          data-testid={`shortcut-item-${item.id}`}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-small font-medium text-ink-soft',
                            'transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft',
                          )}
                        >
                          <span className="inline-flex items-center gap-2">
                            <item.icon size={15} aria-hidden />
                            {label}
                          </span>
                          <ChevronRight size={15} className="shrink-0 text-ink-faint" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
