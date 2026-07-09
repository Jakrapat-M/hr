// employee-personal-resolver.ts — STA-181 admin VIEW-page field parity.
//
// Provides the ~12 PERSONAL sections that the employee sees on /profile/me but
// that the S2 MockEmployee record does NOT carry (marital, bank, emergency,
// dependents, structured contact/address, advanced-personal, work history,
// certs, assessments, memberships, projects, documents).
//
// FIX M2 (ralplan consensus): this data is served from its OWN seeded by-id map
// — NOT the live persisted `useHumiProfileStore` (a single-user localStorage
// store whose draft would leak the logged-in HR's own edits into every other
// employee's admin view). Shapes mirror `humi-profile-slice` so the admin read
// -only display can reuse the same field structure the employee sees.
//
// Un-seeded ids resolve to an EMPTY personal record → the admin view renders
// "—" placeholders (no fabricated data).

import type {
  BankDetails,
  EmergencyContactRow,
  Address8,
  PhoneEntry,
  EmailEntry,
} from '@/stores/humi-profile-slice'
import type { HumiDependent } from '@/lib/humi-mock-data'

/** A career/history row shared by the P2 list sections. */
export interface PersonalHistoryRow {
  id: string
  primary: string          // main label (company / cert name / org / project / doc name)
  secondary?: string       // role / issuer / score
  meta?: string            // period / year / date / type
}

/** Slice-shaped personal record for one employee (admin read-only parity view). */
export interface EmployeePersonal {
  // ── P1 personal core ────────────────────────────────────────────────
  maritalStatus?: string          // e.g. 'สมรส' | 'โสด' | 'หย่า'
  maritalStatusSince?: string      // ISO yyyy-MM-dd
  spouseName?: string              // shown only when married
  bank: BankDetails
  emergencyContacts: EmergencyContactRow[]
  dependents: HumiDependent[]
  address?: Address8
  phones: PhoneEntry[]
  emails: EmailEntry[]
  // Advanced personal
  bloodType?: string
  militaryStatus?: string
  disability?: string
  nationalId?: string              // sensitive → masked at render
  // ── P2 career / history ─────────────────────────────────────────────
  workExperience: PersonalHistoryRow[]
  certifications: PersonalHistoryRow[]
  assessments: PersonalHistoryRow[]   // performance / assessment — HR-only at render
  memberships: PersonalHistoryRow[]
  projects: PersonalHistoryRow[]
  documents: PersonalHistoryRow[]
}

const EMPTY_BANK: BankDetails = { bankCode: '', accountNo: '', holderName: '', bookAttachmentId: null }

/** Empty record — used for un-seeded ids (renders "—" everywhere). */
function emptyPersonal(): EmployeePersonal {
  return {
    bank: { ...EMPTY_BANK },
    emergencyContacts: [],
    dependents: [],
    phones: [],
    emails: [],
    workExperience: [],
    certifications: [],
    assessments: [],
    memberships: [],
    projects: [],
    documents: [],
  }
}

// ── Seeded demo records (the ids the deck steps through) ───────────────────────
const SEED: Record<string, EmployeePersonal> = {
  'EMP-0001': {
    maritalStatus: 'สมรส',
    maritalStatusSince: '2016-11-20',
    spouseName: 'ปณิดา ทานากะ',
    bank: { bankCode: 'KBANK', accountNo: '1234567890', holderName: 'สมชาย ทานากะ', bookAttachmentId: null },
    emergencyContacts: [
      { id: 'ec-1', name: 'ปณิดา ทานากะ', relation: 'คู่สมรส', phones: ['+66 (02) 555-0233'], primaryFlag: true },
      { id: 'ec-2', name: 'อัมพร ทานากะ', relation: 'มารดา', phones: ['+66 (02) 555-1144'] },
    ],
    dependents: [
      { id: 'dep-1', fullNameTh: 'ปณิดา ทานากะ', fullNameEn: 'Panida Tanaka', relation: 'spouse', dateOfBirth: '1992-06-12', nationalId: '1-1099-22444-66-3', hasInsurance: true, isCentralEmployee: false },
      { id: 'dep-2', fullNameTh: 'ไอริส ทานากะ', fullNameEn: 'Iris Tanaka', relation: 'child', dateOfBirth: '2017-08-04', hasInsurance: true, isCentralEmployee: false },
    ],
    address: {
      houseNo: '241', village: '', soi: 'สุขุมวิท 22', road: 'สุขุมวิท',
      subdistrict: 'คลองตัน', district: 'คลองเตย', province: 'กรุงเทพฯ', postalCode: '10110',
    },
    phones: [{ value: '+66 (02) 555-0188', primary: true, label: 'มือถือ' }, { value: '+66 (02) 555-0233', primary: false, label: 'บ้าน' }],
    emails: [{ value: 'somchai.tanaka@proton.me', primary: true }],
    bloodType: 'O',
    militaryStatus: 'ผ่านการเกณฑ์ทหารแล้ว',
    disability: 'ไม่มี',
    nationalId: '1101700203451',
    workExperience: [
      { id: 'we-1', primary: 'Central Retail Corporation', secondary: 'Senior Analyst', meta: '2016 – ปัจจุบัน' },
      { id: 'we-2', primary: 'SCG Chemicals', secondary: 'Analyst', meta: '2013 – 2016' },
    ],
    certifications: [
      { id: 'ce-1', primary: 'CFA Level II', secondary: 'CFA Institute', meta: '2018' },
      { id: 'ce-2', primary: 'PMP', secondary: 'PMI', meta: '2020' },
    ],
    assessments: [
      { id: 'as-1', primary: 'ประเมินผลประจำปี 2025', secondary: 'Exceeds', meta: '2025-12' },
      { id: 'as-2', primary: 'Promotability review', secondary: 'Ready in 1 year', meta: '2025-06' },
    ],
    memberships: [
      { id: 'mb-1', primary: 'สมาคมนักวิเคราะห์การลงทุน', secondary: 'สมาชิกสามัญ', meta: '2019 – ปัจจุบัน' },
    ],
    projects: [
      { id: 'pr-1', primary: 'Omnichannel Migration', secondary: 'Workstream lead', meta: '2024' },
    ],
    documents: [
      { id: 'doc-1', primary: 'สัญญาจ้างงาน', secondary: 'PDF', meta: '2016-11-01' },
      { id: 'doc-2', primary: 'หนังสือรับรองเงินเดือน', secondary: 'PDF', meta: '2025-01-15' },
    ],
  },
  'EMP-0002': {
    maritalStatus: 'โสด',
    bank: { bankCode: 'SCB', accountNo: '9876543210', holderName: 'วิภา ศรีสุข', bookAttachmentId: null },
    emergencyContacts: [
      { id: 'ec-1', name: 'ประเสริฐ ศรีสุข', relation: 'บิดา', phones: ['+66 (02) 555-7788'], primaryFlag: true },
    ],
    dependents: [
      { id: 'dep-1', fullNameTh: 'ประเสริฐ ศรีสุข', fullNameEn: 'Prasert Srisuk', relation: 'father', dateOfBirth: '1960-03-08', hasInsurance: false, isCentralEmployee: false },
    ],
    address: {
      houseNo: '88/12', village: 'หมู่บ้านสีวลี', soi: '', road: 'รัตนาธิเบศร์',
      subdistrict: 'บางกระสอ', district: 'เมืองนนทบุรี', province: 'นนทบุรี', postalCode: '11000',
    },
    phones: [{ value: '+66 (08) 123-4567', primary: true, label: 'มือถือ' }],
    emails: [{ value: 'wipa.srisuk@proton.me', primary: true }],
    bloodType: 'A',
    militaryStatus: 'ไม่ต้องเกณฑ์ (หญิง)',
    disability: 'ไม่มี',
    nationalId: '1102003456789',
    workExperience: [
      { id: 'we-1', primary: 'Central Retail Corporation', secondary: 'HR Officer', meta: '2019 – ปัจจุบัน' },
    ],
    certifications: [
      { id: 'ce-1', primary: 'HRM Certificate', secondary: 'PMAT', meta: '2021' },
    ],
    assessments: [
      { id: 'as-1', primary: 'ประเมินผลประจำปี 2025', secondary: 'Meets', meta: '2025-12' },
    ],
    memberships: [],
    projects: [
      { id: 'pr-1', primary: 'ESS Rollout', secondary: 'Coordinator', meta: '2025' },
    ],
    documents: [
      { id: 'doc-1', primary: 'สัญญาจ้างงาน', secondary: 'PDF', meta: '2019-05-01' },
    ],
  },
  'EMP-0005': {
    maritalStatus: 'สมรส',
    maritalStatusSince: '2011-02-14',
    spouseName: 'กมลรัตน์ ภักดี',
    bank: { bankCode: 'BBL', accountNo: '5551234098', holderName: 'ประเสริฐ ภักดี', bookAttachmentId: null },
    emergencyContacts: [
      { id: 'ec-1', name: 'กมลรัตน์ ภักดี', relation: 'คู่สมรส', phones: ['+66 (08) 987-6543'], primaryFlag: true },
      { id: 'ec-2', name: 'สุรชัย ภักดี', relation: 'พี่น้อง', phones: ['+66 (08) 111-2222'] },
    ],
    dependents: [
      { id: 'dep-1', fullNameTh: 'กมลรัตน์ ภักดี', fullNameEn: 'Kamolrat Phakdee', relation: 'spouse', dateOfBirth: '1985-09-30', hasInsurance: true, isCentralEmployee: true },
      { id: 'dep-2', fullNameTh: 'ด.ช. ภูมิ ภักดี', fullNameEn: 'Phum Phakdee', relation: 'child', dateOfBirth: '2013-04-18', hasInsurance: true, isCentralEmployee: false },
    ],
    address: {
      houseNo: '15', village: '', soi: 'ลาดพร้าว 71', road: 'ลาดพร้าว',
      subdistrict: 'สะพานสอง', district: 'วังทองหลาง', province: 'กรุงเทพฯ', postalCode: '10310',
    },
    phones: [{ value: '+66 (08) 555-4321', primary: true, label: 'มือถือ' }],
    emails: [{ value: 'prasert.phakdee@proton.me', primary: true }],
    bloodType: 'B',
    militaryStatus: 'ได้รับการยกเว้น',
    disability: 'ไม่มี',
    nationalId: '1103300998877',
    workExperience: [
      { id: 'we-1', primary: 'Central Retail Corporation', secondary: 'Store Manager', meta: '2011 – ปัจจุบัน' },
      { id: 'we-2', primary: 'Tesco Lotus', secondary: 'Assistant Manager', meta: '2008 – 2011' },
    ],
    certifications: [
      { id: 'ce-1', primary: 'Retail Management Diploma', secondary: 'CRC Academy', meta: '2015' },
    ],
    assessments: [
      { id: 'as-1', primary: 'ประเมินผลประจำปี 2025', secondary: 'Exceeds', meta: '2025-12' },
    ],
    memberships: [],
    projects: [],
    documents: [
      { id: 'doc-1', primary: 'สัญญาจ้างงาน', secondary: 'PDF', meta: '2011-02-01' },
    ],
  },
}

/**
 * Resolve the slice-shaped personal record for an employee id.
 * Seeded demo ids return realistic data; every other id returns an empty
 * record so the admin view renders "—" without fabricating fields.
 */
export function getEmployeePersonalById(employeeId: string): EmployeePersonal {
  return SEED[employeeId] ?? emptyPersonal()
}
