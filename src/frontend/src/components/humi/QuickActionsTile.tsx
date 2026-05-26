import Link from 'next/link';
import {
  CalendarPlus,
  FileText,
  FilePlus,
  User,
  Wallet,
  Network,
  BarChart3,
  Briefcase,
  Inbox,
  Users2,
  Clock,
  Bell,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { benefitReimbursementRoute } from '@/lib/benefit-routes';

// ════════════════════════════════════════════════════════════
// QuickActionsTile — ESS home tile, BRD #171
// Full-width single-column card with 12 baseline actions.
// props.actions overrides baseline for BRD #182 admin config.
// C10: bilingual (labelTh + labelEn). C7: reuse humi-card/humi-eyebrow — no new CSS.
// Tone tokens: teal | indigo | amber | coral
// ════════════════════════════════════════════════════════════

export type TileTone = 'teal' | 'indigo' | 'amber' | 'coral';

// RoleName CapCase — matches adminSelfService matrices.
export type RoleName = 'Employee' | 'Manager' | 'HRBP' | 'SPD' | 'Admin';

export interface QuickAction {
  icon: React.ReactNode;
  labelTh: string;
  labelEn: string;
  href: string;
  show?: RoleName[];
  tone?: TileTone;
}

export interface QuickActionsTileProps {
  actions?: QuickAction[];
  /** Section eyebrow above the grid. Defaults to "เมนูลัด" (ESS). */
  eyebrow?: string;
  /** Active locale — used to pick labelEn vs labelTh display. Defaults to 'th'. */
  locale?: string;
}

// Tone → Tailwind className pairs for badge background + text.
// amber uses bg-warning-soft/text-warning (NOT bg-warning-tint — dead class).
// indigo uses CSS var inline since Tailwind does not have built-in accent-alt-soft token.
const TONE_BG: Record<TileTone, string> = {
  teal:   'bg-accent-soft',
  indigo: 'bg-[var(--color-accent-alt-soft)]',
  amber:  'bg-warning-soft',
  coral:  'bg-warning-soft',
};
const TONE_TEXT: Record<TileTone, string> = {
  teal:   'text-accent',
  indigo: 'text-[var(--color-accent-alt)]',
  amber:  'text-warning',
  coral:  'text-warning',
};

function makeIcon(Icon: LucideIcon) {
  return <Icon size={22} aria-hidden />;
}

// All 12 ESS baseline actions.
// show?: undefined means visible to all roles.
export const DEFAULT_ESS_ACTIONS: QuickAction[] = [
  {
    icon: makeIcon(CalendarPlus),
    labelTh: 'ขอลาหยุด',
    labelEn: 'Time Off',
    href: '/th/timeoff',
    tone: 'teal',
  },
  {
    icon: makeIcon(FileText),
    labelTh: 'สลิปเงินเดือน',
    labelEn: 'Payslip',
    href: '/th/profile/me?tab=employment#pay-statements',
    tone: 'teal',
  },
  {
    icon: makeIcon(User),
    labelTh: 'ข้อมูลส่วนตัว',
    labelEn: 'My Profile',
    href: '/th/profile/me',
    tone: 'indigo',
  },
  {
    icon: makeIcon(Wallet),
    labelTh: 'เบิกสวัสดิการ',
    labelEn: 'Benefits Claim',
    href: benefitReimbursementRoute('th'),
    tone: 'teal',
  },
  {
    icon: makeIcon(FilePlus),
    labelTh: 'ขอเอกสาร',
    labelEn: 'Doc Request',
    href: '/th/me/documents/request',
    tone: 'indigo',
  },
  {
    icon: makeIcon(Clock),
    labelTh: 'บันทึกเวลา',
    labelEn: 'Time Clock',
    href: '/th/time-clock',
    tone: 'amber',
  },
  {
    icon: makeIcon(Inbox),
    labelTh: 'คำขอของฉัน',
    labelEn: 'My Requests',
    href: '/th/requests',
    tone: 'teal',
  },
  {
    icon: makeIcon(Bell),
    labelTh: 'ประกาศ',
    labelEn: 'Announcements',
    href: '/th/announcements',
    tone: 'amber',
  },
  {
    icon: makeIcon(Network),
    labelTh: 'แผนผังองค์กร',
    labelEn: 'Org Chart',
    href: '/th/org-chart',
    tone: 'indigo',
  },
  {
    icon: makeIcon(Users2),
    labelTh: 'ทำเนียบพนักงาน',
    labelEn: 'Directory',
    href: '/th/admin/employees',
    tone: 'indigo',
  },
  {
    icon: makeIcon(BarChart3),
    labelTh: 'ผลงานของฉัน',
    labelEn: 'Performance',
    href: '/th/performance',
    tone: 'coral',
    show: ['Manager', 'HRBP', 'SPD', 'Admin'],
  },
  {
    icon: makeIcon(GraduationCap),
    labelTh: 'การเรียนรู้',
    labelEn: 'Learning',
    href: '/th/learning',
    tone: 'coral',
  },
];

// Manager-tier Quick Actions — SF Employee Central pattern (Path C, autopilot
// 2026-04-26). Each tile launches a canonical page with `?scope=team` query
// param so the canonical surface filters to the manager's team. Replaces the
// 7-tab /manager-dashboard landing.
export const MANAGER_ACTIONS: QuickAction[] = [
  { icon: makeIcon(Users2),    labelTh: 'ทีมของฉัน',        labelEn: 'My Team',        href: '/th/admin/employees?scope=team', tone: 'teal'   },
  { icon: makeIcon(Network),   labelTh: 'แผนผังทีมฉัน',      labelEn: 'Team Org Chart', href: '/th/org-chart?scope=team',       tone: 'indigo' },
  { icon: makeIcon(Briefcase), labelTh: 'ตำแหน่งของทีมฉัน', labelEn: 'Team Positions', href: '/th/admin/positions?scope=team', tone: 'indigo' },
  { icon: makeIcon(BarChart3), labelTh: 'รายงานของทีมฉัน',   labelEn: 'Team Reports',   href: '/th/reports?scope=team',         tone: 'amber'  },
  { icon: makeIcon(Inbox),     labelTh: 'คำขอรออนุมัติ',     labelEn: 'Approvals',      href: '/th/quick-approve',              tone: 'coral'  },
];

export function QuickActionsTile({
  actions = DEFAULT_ESS_ACTIONS,
  eyebrow = 'เมนูลัด',
  locale = 'th',
}: QuickActionsTileProps) {
  const useTh = locale !== 'en';
  return (
    <div className="humi-card" role="region" aria-label={eyebrow}>
      <div className="humi-eyebrow" style={{ marginBottom: 14 }}>
        {eyebrow}
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
      >
        {actions.map((action) => {
          const tone: TileTone = action.tone ?? 'teal';
          const bgClass   = TONE_BG[tone];
          const textClass = TONE_TEXT[tone];
          const label     = useTh ? action.labelTh : (action.labelEn ?? action.labelTh);
          return (
            <Link
              key={`${action.labelTh}:${action.href}`}
              href={action.href}
              aria-label={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                padding: '16px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-hairline)',
                background: 'var(--color-canvas-soft)',
                color: 'var(--color-ink)',
                textDecoration: 'none',
                transition: 'box-shadow var(--dur-base)',
              }}
              className="humi-quick-action-item"
            >
              <span
                className={`${bgClass} ${textClass}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                }}
                aria-hidden
              >
                {action.icon}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'center',
                  lineHeight: 1.35,
                  color: 'var(--color-ink)',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
