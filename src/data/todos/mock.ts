// Mock to-do items for the Topbar TodoBell. Mirrors the shape of
// @/data/notifications/mock.ts — static demo data, no backend.
// hrefs are LOCALE-RELATIVE (no /th or /en prefix) — TodoBell prepends the
// active locale so every row deep-links in the locale the user is browsing.
// Each href points at a real action page (deep-link), not just a list page.

export interface TodoItem {
  id: string;
  titleTh: string;
  titleEn: string;
  /** Locale-relative path (no leading /th|/en); TodoBell prepends the locale. */
  href: string;
  done: boolean;
  dueAt?: string;
  priority?: 'high' | 'normal';
}

export const MOCK_TODOS: TodoItem[] = [
  {
    // Termination/resignation approval — deep-links straight to the offboarding
    // action page (matches the seeded pending_manager request TR-…-X1KM).
    id: 'TD-000',
    titleTh: 'อนุมัติคำขอลาออกของ ประเสริฐ วัฒนชัย',
    titleEn: 'Approve resignation request from Prasert Wattanachai',
    href: '/workflows/resignation/TR-20260424-0800-X1KM',
    done: false,
    dueAt: '2026-05-24T09:00:00Z',
    priority: 'high',
  },
  {
    id: 'TD-001',
    titleTh: 'อนุมัติคำขอลาพักร้อนของ สมชาย ใจดี',
    titleEn: 'Approve annual-leave request from Somchai Jaidee',
    href: '/quick-approve',
    done: false,
    dueAt: '2026-05-26T09:00:00Z',
    priority: 'high',
  },
  {
    id: 'TD-002',
    titleTh: 'ตรวจเอกสารทดลองงานของ อนุชา พงษ์ไพร',
    titleEn: 'Review probation documents for Anucha Phongphai',
    href: '/ess/workflows',
    done: false,
    dueAt: '2026-05-27T17:00:00Z',
    priority: 'normal',
  },
  {
    id: 'TD-003',
    titleTh: 'ยืนยันรอบจ่ายเงินเดือนเดือนพฤษภาคม',
    titleEn: 'Confirm May payroll round',
    href: '/payroll',
    done: false,
    dueAt: '2026-05-28T12:00:00Z',
    priority: 'high',
  },
  {
    id: 'TD-004',
    titleTh: 'ลงทะเบียนสวัสดิการประจำปีให้ครบ',
    titleEn: 'Complete annual benefits enrollment',
    href: '/benefits-hub',
    done: false,
    dueAt: '2026-05-31T23:59:00Z',
    priority: 'normal',
  },
  {
    id: 'TD-005',
    titleTh: 'รับทราบประกาศนโยบายการลาฉบับใหม่',
    titleEn: 'Acknowledge the new leave-policy announcement',
    href: '/announcements',
    done: false,
    priority: 'normal',
  },
  {
    id: 'TD-006',
    titleTh: 'อัปเดตเป้าหมายผลงานไตรมาสนี้',
    titleEn: 'Update this quarter performance goals',
    href: '/goals',
    done: true,
    priority: 'normal',
  },
];
