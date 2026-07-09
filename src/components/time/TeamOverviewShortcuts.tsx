'use client';

// TeamOverviewShortcuts — STA-249, restructured by STA-255.
// The shortcuts surface for the manager Time-management page. STA-255 removed
// the top quick-jump button row and the OT Plan tile, and re-idiomed the four
// groupings to the /time-hub grouped-tile pattern (TimeTileGrid: uppercase
// eyebrow headings + responsive icon-card grid). Every tile is a
// locale-preserving Link to its real route, or — when no route exists yet — a
// disabled "เร็วๆ นี้ / Coming soon" tile (never a dead link).

import { useLocale } from 'next-intl';
import {
  Inbox,
  CalendarRange,
  CalendarPlus,
  PencilLine,
  CalendarCheck,
  Users,
  CalendarClock,
  BarChart3,
} from 'lucide-react';
import { TimeTileGrid, type TimeTileGroupDef } from '@/components/time/TimeTileGrid';

// Route targets verified present in src/app/[locale]/:
//   /quick-approve /roster /timeoff /time/corrections
//   /team/shift-assign /time/shift-schedule /reports
// Holiday Assign has no route yet → coming-soon. OT Plan removed (STA-255).
const GROUPS: TimeTileGroupDef[] = [
  {
    key: 'dashboard',
    labelTh: 'แดชบอร์ด',
    labelEn: 'Dashboard',
    tiles: [
      {
        key: 'team-requests',
        icon: Inbox,
        titleTh: 'คำขอของทีม',
        titleEn: 'Team Requests',
        descTh: 'อนุมัติคำขอทั้งหมดของทีม',
        descEn: 'Approve all team requests',
        href: 'quick-approve',
      },
      {
        key: 'team-timesheet',
        icon: CalendarRange,
        titleTh: 'ตารางเวลาทีม',
        titleEn: 'Team Timesheet',
        descTh: 'ดูตารางกะรายสัปดาห์',
        descEn: 'Weekly team roster',
        href: 'roster',
      },
    ],
  },
  {
    key: 'submit-on-behalf',
    labelTh: 'ยื่นแทนพนักงาน',
    labelEn: 'Submit on Behalf',
    tiles: [
      {
        key: 'leave-request',
        icon: CalendarPlus,
        titleTh: 'ขอลาหยุด',
        titleEn: 'Leave Request',
        descTh: 'ยื่นใบลาแทนพนักงาน',
        descEn: 'File leave for staff',
        href: 'timeoff',
      },
      {
        key: 'time-correction',
        icon: PencilLine,
        titleTh: 'แก้ไขเวลา',
        titleEn: 'Time Correction',
        descTh: 'แก้เวลาที่บันทึกผิด',
        descEn: 'Fix punch records',
        href: 'time/corrections',
      },
      {
        key: 'holiday-assign',
        icon: CalendarCheck,
        titleTh: 'กำหนดวันหยุด',
        titleEn: 'Holiday Assign',
        descTh: 'กำหนดวันหยุดให้ทีม',
        descEn: 'Assign team holidays',
        href: null,
      },
    ],
  },
  {
    key: 'schedule',
    labelTh: 'ตารางงาน',
    labelEn: 'Schedule',
    tiles: [
      {
        key: 'shift-assignments',
        icon: Users,
        titleTh: 'มอบหมายกะ',
        titleEn: 'Shift Assignments',
        descTh: 'จัดกะให้พนักงาน',
        descEn: 'Assign shifts to staff',
        href: 'team/shift-assign',
      },
      {
        key: 'work-schedule',
        icon: CalendarClock,
        titleTh: 'ตารางการทำงาน',
        titleEn: 'Work Schedule',
        descTh: 'ดูตารางกะมาตรฐาน',
        descEn: 'Shift schedule templates',
        href: 'time/shift-schedule',
      },
    ],
  },
  {
    key: 'reports',
    labelTh: 'รายงาน',
    labelEn: 'Reports',
    tiles: [
      {
        key: 'report',
        icon: BarChart3,
        titleTh: 'รายงาน',
        titleEn: 'Report',
        descTh: 'รายงานการเข้างานของทีม',
        descEn: 'Team attendance reports',
        href: 'reports',
      },
    ],
  },
];

export function TeamOverviewShortcuts() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  return (
    <section
      data-testid="team-overview-shortcuts"
      aria-label={isTh ? 'ทางลัด' : 'Shortcuts'}
      className="flex flex-col gap-4"
    >
      <TimeTileGrid groups={GROUPS} locale={locale} isTh={isTh} />
    </section>
  );
}
