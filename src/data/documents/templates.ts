// Document request templates — BRD Document Request Flow
// 8 canonical templates used by /me/documents/request and /admin/documents

export type DeliveryMode = 'email' | 'print_pickup';

export interface DocumentTemplate {
  id: string;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  descriptionEn: string;
  defaultDeliveryMode: DeliveryMode;
  sla: number; // business days
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'employment-cert',
    nameTh: 'หนังสือรับรองการทำงาน',
    nameEn: 'Employment Certificate',
    descriptionTh: 'รับรองสถานภาพการจ้างงาน ตำแหน่ง และระยะเวลาการทำงาน',
    descriptionEn: 'Certifies employment status, position, and duration of employment',
    defaultDeliveryMode: 'email',
    sla: 2,
  },
  {
    id: 'payslip',
    nameTh: 'สลิปเงินเดือน',
    nameEn: 'Salary Slip',
    descriptionTh: 'ใบแสดงรายละเอียดเงินเดือนและการหักภาษีรายเดือน',
    descriptionEn: 'Monthly salary breakdown and tax deduction details',
    defaultDeliveryMode: 'email',
    sla: 1,
  },
  {
    id: 'income-cert',
    nameTh: 'หนังสือรับรองรายได้',
    nameEn: 'Income Certificate',
    descriptionTh: 'รับรองรายได้สำหรับการขอสินเชื่อ หรือใช้ยื่นกับสถาบันการเงิน',
    descriptionEn: 'Certifies income for loan applications or financial institutions',
    defaultDeliveryMode: 'print_pickup',
    sla: 3,
  },
  {
    id: 'visa-support',
    nameTh: 'หนังสือสนับสนุนวีซ่า',
    nameEn: 'Visa Support Letter',
    descriptionTh: 'หนังสือรับรองจากบริษัทเพื่อสนับสนุนการขอวีซ่า',
    descriptionEn: 'Company letter supporting visa application',
    defaultDeliveryMode: 'print_pickup',
    sla: 3,
  },
  {
    id: 'position-cert',
    nameTh: 'หนังสือรับรองตำแหน่ง',
    nameEn: 'Position Certificate',
    descriptionTh: 'รับรองตำแหน่งงานและระดับความรับผิดชอบในองค์กร',
    descriptionEn: 'Certifies job title and level of responsibility',
    defaultDeliveryMode: 'email',
    sla: 2,
  },
  {
    id: 'staff-id-copy',
    nameTh: 'สำเนาบัตร Staff',
    nameEn: 'Staff ID Card Copy',
    descriptionTh: 'สำเนาบัตรพนักงานรับรองสำเนาถูกต้องโดย HR',
    descriptionEn: 'HR-certified copy of employee ID card',
    defaultDeliveryMode: 'print_pickup',
    sla: 1,
  },
  {
    id: 'student-loan-cert',
    nameTh: 'หนังสือรับรอง พรบ. กยศ',
    nameEn: 'Student Loan Fund Certificate (OSLF)',
    descriptionTh: 'หนังสือรับรองสำหรับกองทุนเงินให้กู้ยืมเพื่อการศึกษา',
    descriptionEn: 'Certificate for Office of Student Loan Fund purposes',
    defaultDeliveryMode: 'print_pickup',
    sla: 3,
  },
  {
    id: 'other',
    nameTh: 'อื่นๆ',
    nameEn: 'Other',
    descriptionTh: 'เอกสารที่ไม่อยู่ในรายการ กรุณาระบุในช่องวัตถุประสงค์',
    descriptionEn: 'Document not in the list — please specify in the purpose field',
    defaultDeliveryMode: 'email',
    sla: 5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Curated generatable letters (SF SuccessFactors "Document Generation" model)
//
// Each letter is a TEMPLATE with bilingual bodies and {{placeholder}} tokens that
// merge against real employee fields. This is the self-service / generate-for-any
// surface — INSTANT merge → preview → download, NOT the SLA request queue above.
// ─────────────────────────────────────────────────────────────────────────────

/** Placeholder keys supported by the merge engine (mapped to employee fields). */
export type LetterPlaceholder =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'position'
  | 'department'
  | 'employeeCode'
  | 'startDate'
  | 'salary'
  | 'today'
  | 'company';

export interface GeneratableLetter {
  id: string;
  nameTh: string;
  nameEn: string;
  category: 'certificate' | 'relieving' | 'salary';
  /** Ordered placeholder keys this letter consumes. */
  placeholders: LetterPlaceholder[];
  /** Bilingual letter bodies with {{token}} markers. */
  bodyTh: string;
  bodyEn: string;
}

/** Default company name stamped into the {{company}} placeholder for the mockup. */
export const LETTER_COMPANY_TH = 'บริษัท เซ็นทรัล กรุ๊ป จำกัด';
export const LETTER_COMPANY_EN = 'Central Group Co., Ltd.';

export const GENERATABLE_LETTERS: GeneratableLetter[] = [
  {
    id: 'employment-cert',
    nameTh: 'หนังสือรับรองการทำงาน',
    nameEn: 'Certificate of Employment',
    category: 'certificate',
    placeholders: ['fullName', 'employeeCode', 'position', 'department', 'startDate', 'company', 'today'],
    bodyTh: `หนังสือรับรองการทำงาน

วันที่ {{today}}

{{company}} ขอรับรองว่า {{fullName}} (รหัสพนักงาน {{employeeCode}}) เป็นพนักงานของบริษัท
ปฏิบัติงานในตำแหน่ง {{position}} สังกัด{{department}}
เริ่มปฏิบัติงานตั้งแต่วันที่ {{startDate}} จนถึงปัจจุบัน

หนังสือฉบับนี้ออกให้เพื่อรับรองสถานภาพการเป็นพนักงาน

ลงชื่อ ......................................
       ฝ่ายทรัพยากรบุคคล
       {{company}}`,
    bodyEn: `CERTIFICATE OF EMPLOYMENT

Date: {{today}}

This is to certify that {{fullName}} (Employee Code {{employeeCode}}) is an employee of {{company}},
currently holding the position of {{position}} in the {{department}} department,
employed from {{startDate}} to the present.

This certificate is issued to confirm the said person's employment status.

Signed ......................................
       Human Resources Department
       {{company}}`,
  },
  {
    id: 'relieving-letter',
    nameTh: 'ใบผ่านงาน',
    nameEn: 'Relieving / Experience Letter',
    category: 'relieving',
    placeholders: ['fullName', 'employeeCode', 'position', 'department', 'startDate', 'company', 'today'],
    bodyTh: `ใบผ่านงาน

วันที่ {{today}}

{{company}} ขอรับรองว่า {{fullName}} (รหัสพนักงาน {{employeeCode}})
ได้ปฏิบัติงานในตำแหน่ง {{position}} สังกัด{{department}}
ตั้งแต่วันที่ {{startDate}}

ในระหว่างการปฏิบัติงานได้ตั้งใจปฏิบัติหน้าที่ด้วยความวิริยะอุตสาหะ
บริษัทขอออกใบผ่านงานฉบับนี้ไว้เป็นหลักฐาน

ลงชื่อ ......................................
       ฝ่ายทรัพยากรบุคคล
       {{company}}`,
    bodyEn: `RELIEVING / EXPERIENCE LETTER

Date: {{today}}

This is to certify that {{fullName}} (Employee Code {{employeeCode}})
worked in the position of {{position}} in the {{department}} department
from {{startDate}}.

During the tenure the said person carried out the assigned duties diligently.
This letter is issued as a record of service.

Signed ......................................
       Human Resources Department
       {{company}}`,
  },
  {
    id: 'salary-cert',
    nameTh: 'หนังสือรับรองเงินเดือน',
    nameEn: 'Salary Certificate',
    category: 'salary',
    placeholders: ['fullName', 'employeeCode', 'position', 'department', 'salary', 'company', 'today'],
    bodyTh: `หนังสือรับรองเงินเดือน

วันที่ {{today}}

{{company}} ขอรับรองว่า {{fullName}} (รหัสพนักงาน {{employeeCode}})
ปฏิบัติงานในตำแหน่ง {{position}} สังกัด{{department}}
มีรายได้ประจำเดือนเท่ากับ {{salary}}

หนังสือฉบับนี้ออกให้เพื่อใช้ประกอบการยื่นต่อสถาบันการเงินตามที่ร้องขอ

ลงชื่อ ......................................
       ฝ่ายทรัพยากรบุคคล
       {{company}}`,
    bodyEn: `SALARY CERTIFICATE

Date: {{today}}

This is to certify that {{fullName}} (Employee Code {{employeeCode}})
holds the position of {{position}} in the {{department}} department
with a monthly income of {{salary}}.

This certificate is issued for submission to financial institutions as requested.

Signed ......................................
       Human Resources Department
       {{company}}`,
  },
  {
    id: 'probation-pass',
    nameTh: 'หนังสือรับรองการผ่านทดลองงาน',
    nameEn: 'Probation Completion Certificate',
    category: 'certificate',
    placeholders: ['fullName', 'employeeCode', 'position', 'department', 'startDate', 'company', 'today'],
    bodyTh: `หนังสือรับรองการผ่านทดลองงาน

วันที่ {{today}}

{{company}} ขอรับรองว่า {{fullName}} (รหัสพนักงาน {{employeeCode}})
ตำแหน่ง {{position}} สังกัด{{department}} ซึ่งเริ่มปฏิบัติงานตั้งแต่วันที่ {{startDate}}
ได้ผ่านการประเมินผลการทดลองปฏิบัติงานเรียบร้อยแล้ว
และได้รับการบรรจุเป็นพนักงานประจำของบริษัท

ลงชื่อ ......................................
       ฝ่ายทรัพยากรบุคคล
       {{company}}`,
    bodyEn: `PROBATION COMPLETION CERTIFICATE

Date: {{today}}

This is to certify that {{fullName}} (Employee Code {{employeeCode}}),
position {{position}} in the {{department}} department, who joined on {{startDate}},
has successfully passed the probation evaluation
and has been confirmed as a permanent employee of {{company}}.

Signed ......................................
       Human Resources Department
       {{company}}`,
  },
];

export function getGeneratableLetter(id: string): GeneratableLetter | undefined {
  return GENERATABLE_LETTERS.find((l) => l.id === id);
}

export type DocRequestStatus = 'pending' | 'processing' | 'ready' | 'delivered';

export interface DocRequest {
  id: string;
  templateId: string;
  employeeId: string;
  employeeName: string;
  employeeDept: string;
  purpose: string;
  deliveryMode: DeliveryMode;
  status: DocRequestStatus;
  submittedAt: string;
  sla: number;
}

export const MOCK_DOC_REQUESTS: DocRequest[] = [
  {
    id: 'DR-2026-001',
    templateId: 'employment-cert',
    employeeId: 'EMP001',
    employeeName: 'สมชาย ใจดี',
    employeeDept: 'วิศวกรรมซอฟต์แวร์',
    purpose: 'ใช้ยื่นขอสินเชื่อธนาคาร',
    deliveryMode: 'email',
    status: 'pending',
    submittedAt: '2026-05-01T09:00:00Z',
    sla: 2,
  },
  {
    id: 'DR-2026-002',
    templateId: 'income-cert',
    employeeId: 'EMP002',
    employeeName: 'วิไลวรรณ สุขสันต์',
    employeeDept: 'การเงินและบัญชี',
    purpose: 'ยื่นขอสินเชื่อบ้าน',
    deliveryMode: 'print_pickup',
    status: 'processing',
    submittedAt: '2026-04-30T14:30:00Z',
    sla: 3,
  },
  {
    id: 'DR-2026-003',
    templateId: 'visa-support',
    employeeId: 'EMP003',
    employeeName: 'ประสิทธิ์ บุญมาก',
    employeeDept: 'ปฏิบัติการ',
    purpose: 'ขอวีซ่าท่องเที่ยวญี่ปุ่น',
    deliveryMode: 'print_pickup',
    status: 'ready',
    submittedAt: '2026-04-29T10:00:00Z',
    sla: 3,
  },
  {
    id: 'DR-2026-004',
    templateId: 'payslip',
    employeeId: 'EMP004',
    employeeName: 'อรนุช วงศ์สุวรรณ',
    employeeDept: 'ทรัพยากรบุคคล',
    purpose: 'เอกสารประกอบการยื่นภาษี',
    deliveryMode: 'email',
    status: 'delivered',
    submittedAt: '2026-04-28T08:00:00Z',
    sla: 1,
  },
  {
    id: 'DR-2026-005',
    templateId: 'position-cert',
    employeeId: 'EMP005',
    employeeName: 'กมลชนก ศรีสวัสดิ์',
    employeeDept: 'การตลาด',
    purpose: 'ยื่นประกอบใบสมัครทุนการศึกษา',
    deliveryMode: 'email',
    status: 'pending',
    submittedAt: '2026-05-01T11:00:00Z',
    sla: 2,
  },
  {
    id: 'DR-2026-006',
    templateId: 'student-loan-cert',
    employeeId: 'EMP006',
    employeeName: 'ณัฐพล เจริญสุข',
    employeeDept: 'เทคโนโลยีสารสนเทศ',
    purpose: 'ต่ออายุสัญญา กยศ',
    deliveryMode: 'print_pickup',
    status: 'processing',
    submittedAt: '2026-04-30T09:30:00Z',
    sla: 3,
  },
  {
    id: 'DR-2026-007',
    templateId: 'staff-id-copy',
    employeeId: 'EMP007',
    employeeName: 'ภาวิณี ตั้งมั่น',
    employeeDept: 'กฎหมาย',
    purpose: 'เปิดบัญชีธนาคาร',
    deliveryMode: 'print_pickup',
    status: 'pending',
    submittedAt: '2026-05-02T08:00:00Z',
    sla: 1,
  },
  {
    id: 'DR-2026-008',
    templateId: 'other',
    employeeId: 'EMP008',
    employeeName: 'ชานนท์ รุ่งเรือง',
    employeeDept: 'จัดซื้อ',
    purpose: 'ขอหนังสือรับรองการอบรมหลักสูตร ISO 9001',
    deliveryMode: 'email',
    status: 'pending',
    submittedAt: '2026-05-02T09:00:00Z',
    sla: 5,
  },
  {
    id: 'DR-2026-009',
    templateId: 'employment-cert',
    employeeId: 'EMP009',
    employeeName: 'สุภาพร ใจงาม',
    employeeDept: 'ขาย',
    purpose: 'ยื่นประกันสังคมสำหรับการรักษาพยาบาล',
    deliveryMode: 'email',
    status: 'ready',
    submittedAt: '2026-04-29T13:00:00Z',
    sla: 2,
  },
  {
    id: 'DR-2026-010',
    templateId: 'income-cert',
    employeeId: 'EMP010',
    employeeName: 'วีรชัย พงษ์ไพบูลย์',
    employeeDept: 'วิจัยและพัฒนา',
    purpose: 'สมัครสินเชื่อรถยนต์',
    deliveryMode: 'print_pickup',
    status: 'delivered',
    submittedAt: '2026-04-27T15:00:00Z',
    sla: 3,
  },
];
