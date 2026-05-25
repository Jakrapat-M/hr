// Mock to-do items for the Topbar TodoBell. Mirrors the shape of
// @/data/notifications/mock.ts — static demo data, no backend.
// hrefs point at existing routes so every row is clickable end-to-end.

export interface TodoItem {
  id: string;
  titleTh: string;
  titleEn: string;
  href: string;
  done: boolean;
  dueAt?: string;
  priority?: 'high' | 'normal';
}

export const MOCK_TODOS: TodoItem[] = [
  {
    id: 'TD-001',
    titleTh: 'อนุมัติคำขอลาพักร้อนของ สมชาย ใจดี',
    titleEn: 'Approve annual-leave request from Somchai Jaidee',
    href: '/th/quick-approve',
    done: false,
    dueAt: '2026-05-26T09:00:00Z',
    priority: 'high',
  },
  {
    id: 'TD-002',
    titleTh: 'ตรวจเอกสารทดลองงานของ อนุชา พงษ์ไพร',
    titleEn: 'Review probation documents for Anucha Phongphai',
    href: '/th/ess/workflows',
    done: false,
    dueAt: '2026-05-27T17:00:00Z',
    priority: 'normal',
  },
  {
    id: 'TD-003',
    titleTh: 'ยืนยันรอบจ่ายเงินเดือนเดือนพฤษภาคม',
    titleEn: 'Confirm May payroll round',
    href: '/th/payroll',
    done: false,
    dueAt: '2026-05-28T12:00:00Z',
    priority: 'high',
  },
  {
    id: 'TD-004',
    titleTh: 'ลงทะเบียนสวัสดิการประจำปีให้ครบ',
    titleEn: 'Complete annual benefits enrollment',
    href: '/th/benefits-hub',
    done: false,
    dueAt: '2026-05-31T23:59:00Z',
    priority: 'normal',
  },
  {
    id: 'TD-005',
    titleTh: 'รับทราบประกาศนโยบายการลาฉบับใหม่',
    titleEn: 'Acknowledge the new leave-policy announcement',
    href: '/th/announcements',
    done: false,
    priority: 'normal',
  },
  {
    id: 'TD-006',
    titleTh: 'อัปเดตเป้าหมายผลงานไตรมาสนี้',
    titleEn: 'Update this quarter performance goals',
    href: '/th/goals',
    done: true,
    priority: 'normal',
  },
];
