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
