// cnext-command-registry.ts
// Static list of 11 navigable Cnext routes for the ⌘K command palette.
// Excludes login (auth-managed). Source: NAV in Sidebar.tsx + route map.

import { BENEFITS_HUB_ROUTE } from '@/lib/benefit-routes';

export interface CnextCommand {
  id: string;
  label: string;
  route: string;
  /** Optional group label for display */
  group?: string;
}

export const CNEXT_COMMANDS: CnextCommand[] = [
  { id: 'home',               label: 'หน้าหลัก',              route: '/home',               group: 'พื้นที่ทำงานของฉัน' },
  { id: 'profile',            label: 'โปรไฟล์ของฉัน',         route: '/profile/me',         group: 'พื้นที่ทำงานของฉัน' },
  { id: 'timeoff',            label: 'ลางาน',                  route: '/timeoff',            group: 'พื้นที่ทำงานของฉัน' },
  { id: 'benefits',           label: 'สวัสดิการ',              route: BENEFITS_HUB_ROUTE,    group: 'พื้นที่ทำงานของฉัน' },
  { id: 'requests',           label: 'คำร้องและแบบฟอร์ม',      route: '/requests',           group: 'พื้นที่ทำงานของฉัน' },
  { id: 'goals',              label: 'เป้าหมายและผลงาน',       route: '/goals',              group: 'บุคลากร' },
  { id: 'learning-directory', label: 'การเรียนรู้',             route: '/learning-directory', group: 'บุคลากร' },
  { id: 'org-chart',          label: 'ผังองค์กร',              route: '/org-chart',          group: 'บุคลากร' },
  { id: 'announcements',      label: 'ประกาศ',                 route: '/announcements',      group: 'บริษัท' },
  { id: 'integrations',       label: 'จัดการระบบ',             route: '/integrations',       group: 'บริษัท' },
  { id: 'payslip',            label: 'สลิปเงินเดือน',          route: '/payslip',            group: 'พื้นที่ทำงานของฉัน' },
];

/** Filter commands by query string (case-insensitive, searches label) */
export function filterCommands(query: string): CnextCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return CNEXT_COMMANDS;
  return CNEXT_COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
}
