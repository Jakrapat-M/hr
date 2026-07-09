// STA-27 PR-C — spd-branch-mock.ts
// Pure sync mock helpers for the SPD Branch View matrix.
// All functions are deterministic (djb2 hash-based) so the matrix is stable across renders.

/** Simple djb2 hash to get a stable number from a string */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h;
}

export interface BranchEmployee {
  id: string;
  nameTh: string;
  nameEn: string;
  position: string;
  branchCode: string;
}

// Static employee pools per branch (8-12 per branch, deterministic)
const BRANCH_EMPLOYEES: Record<string, BranchEmployee[]> = {
  'BKK-Sukhumvit': [
    { id: 'EMP-BKK-S-001', nameTh: 'สมชาย รักดี', nameEn: 'Somchai Rakdee', position: 'Senior Analyst', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-002', nameTh: 'วิภา ทองใส', nameEn: 'Wipa Thongsai', position: 'Branch Coordinator', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-003', nameTh: 'ประสิทธิ์ มั่นคง', nameEn: 'Prasit Mankong', position: 'Customer Advisor', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-004', nameTh: 'นภา จันทร์เพ็ญ', nameEn: 'Napa Janpen', position: 'Teller', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-005', nameTh: 'ธนากร สีดา', nameEn: 'Thanakon Seeda', position: 'Relationship Manager', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-006', nameTh: 'อรุณี ลาภสม', nameEn: 'Arunee Lapsom', position: 'Operations Specialist', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-007', nameTh: 'บุณฑริก สุขใส', nameEn: 'Buntarik Suksai', position: 'Branch Supervisor', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-008', nameTh: 'กิตติพงษ์ แก้วมณี', nameEn: 'Kittipong Kaewmanee', position: 'Loan Officer', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-009', nameTh: 'รัตนา สว่างใจ', nameEn: 'Rattana Sawangjai', position: 'Teller', branchCode: 'BKK-Sukhumvit' },
    { id: 'EMP-BKK-S-010', nameTh: 'เจนจิรา พุทธิมา', nameEn: 'Janejira Putthima', position: 'Customer Advisor', branchCode: 'BKK-Sukhumvit' },
  ],
  'BKK-Silom': [
    { id: 'EMP-BKK-L-001', nameTh: 'สุรศักดิ์ วงศ์ดี', nameEn: 'Surasak Wongdee', position: 'Branch Manager', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-002', nameTh: 'กาญจนา เพ็ชรไทย', nameEn: 'Kanjana Phetthai', position: 'Senior Teller', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-003', nameTh: 'ภาณุพงศ์ ศรีวิไล', nameEn: 'Panupong Srivilai', position: 'Relationship Manager', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-004', nameTh: 'อัมพร โชติกา', nameEn: 'Amporn Chotika', position: 'Loan Officer', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-005', nameTh: 'ณัฐพล ดีงาม', nameEn: 'Nattaphon Deengam', position: 'Customer Advisor', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-006', nameTh: 'ศิริลักษณ์ พานทอง', nameEn: 'Sirilak Phanthong', position: 'Operations Specialist', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-007', nameTh: 'วีระชัย ใจดี', nameEn: 'Weerachai Jaidee', position: 'Teller', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-008', nameTh: 'สุนิสา แสงจันทร์', nameEn: 'Sunisa Saengchan', position: 'Branch Coordinator', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-009', nameTh: 'ธีรวัฒน์ รุ่งโรจน์', nameEn: 'Teerawat Rungroj', position: 'Senior Analyst', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-010', nameTh: 'มาลี ชูชาติ', nameEn: 'Malee Chuchat', position: 'Customer Advisor', branchCode: 'BKK-Silom' },
    { id: 'EMP-BKK-L-011', nameTh: 'ชัยยุทธ สุนทรี', nameEn: 'Chaiyuth Suntaree', position: 'Teller', branchCode: 'BKK-Silom' },
  ],
  'CNX-Central': [
    { id: 'EMP-CNX-C-001', nameTh: 'พิชิต ยอดดอย', nameEn: 'Pichit Yoddoi', position: 'Branch Manager', branchCode: 'CNX-Central' },
    { id: 'EMP-CNX-C-002', nameTh: 'ลำดวน ล้านนา', nameEn: 'Lamduan Lanna', position: 'Senior Teller', branchCode: 'CNX-Central' },
    { id: 'EMP-CNX-C-003', nameTh: 'เกษม สิงห์คำ', nameEn: 'Kasem Singkam', position: 'Loan Officer', branchCode: 'CNX-Central' },
    { id: 'EMP-CNX-C-004', nameTh: 'รุ่งทิพย์ เชียงราย', nameEn: 'Rungtip Chiangrai', position: 'Customer Advisor', branchCode: 'CNX-Central' },
    { id: 'EMP-CNX-C-005', nameTh: 'อนุสรณ์ ไชยยา', nameEn: 'Anuson Chaiya', position: 'Relationship Manager', branchCode: 'CNX-Central' },
    { id: 'EMP-CNX-C-006', nameTh: 'ปาริชาต กาวิล', nameEn: 'Parichat Kawil', position: 'Teller', branchCode: 'CNX-Central' },
    { id: 'EMP-CNX-C-007', nameTh: 'ศักดา นาคา', nameEn: 'Sakda Naka', position: 'Operations Specialist', branchCode: 'CNX-Central' },
    { id: 'EMP-CNX-C-008', nameTh: 'จิราภรณ์ ดอกบัว', nameEn: 'Jiraporn Dokbua', position: 'Branch Coordinator', branchCode: 'CNX-Central' },
    { id: 'EMP-CNX-C-009', nameTh: 'สุพจน์ ถิ่นเหนือ', nameEn: 'Supot Thinnua', position: 'Senior Analyst', branchCode: 'CNX-Central' },
  ],
  'HKT-Patong': [
    { id: 'EMP-HKT-P-001', nameTh: 'ประวิทย์ ทะเลไทย', nameEn: 'Prawit Thalaithai', position: 'Branch Manager', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-002', nameTh: 'นงลักษณ์ ป่าตอง', nameEn: 'Nonglak Patong', position: 'Senior Teller', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-003', nameTh: 'อดิเรก ภูเก็ต', nameEn: 'Adirek Phuket', position: 'Customer Advisor', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-004', nameTh: 'วรรณา หาดสวย', nameEn: 'Wanna Hadsouay', position: 'Loan Officer', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-005', nameTh: 'ทรงพล อันดามัน', nameEn: 'Songpon Andaman', position: 'Relationship Manager', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-006', nameTh: 'สิริมา ทองหลาง', nameEn: 'Sirima Thonglang', position: 'Teller', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-007', nameTh: 'ยุทธนา คลองใหญ่', nameEn: 'Yuttana Klongyai', position: 'Operations Specialist', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-008', nameTh: 'พนิดา ฝั่งทะเล', nameEn: 'Panida Fangtale', position: 'Branch Coordinator', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-009', nameTh: 'ชลธิชา ราไวย์', nameEn: 'Chontecha Rawai', position: 'Customer Advisor', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-010', nameTh: 'มงคล ป่าคลอก', nameEn: 'Mongkol Pakhlok', position: 'Teller', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-011', nameTh: 'กัลยา กมลา', nameEn: 'Kanlaya Kamala', position: 'Senior Analyst', branchCode: 'HKT-Patong' },
    { id: 'EMP-HKT-P-012', nameTh: 'สราวุธ ในยอง', nameEn: 'Sarawut Naiyong', position: 'Loan Officer', branchCode: 'HKT-Patong' },
  ],
  // Branches outside the demo SPD's assignment — only an HR Admin "all branches"
  // view surfaces these, which is how the admin bypass is demonstrable.
  'KKN-Central': [
    { id: 'EMP-KKN-C-001', nameTh: 'บรรพต อีสานเหนือ', nameEn: 'Banphot Isannuea', position: 'Branch Manager', branchCode: 'KKN-Central' },
    { id: 'EMP-KKN-C-002', nameTh: 'จันทิมา ขอนแก่น', nameEn: 'Jantima Khonkaen', position: 'Senior Teller', branchCode: 'KKN-Central' },
    { id: 'EMP-KKN-C-003', nameTh: 'ไพโรจน์ ที่ราบสูง', nameEn: 'Pairoj Thirabsung', position: 'Loan Officer', branchCode: 'KKN-Central' },
    { id: 'EMP-KKN-C-004', nameTh: 'สุดารัตน์ มอดินแดง', nameEn: 'Sudarat Modindaeng', position: 'Customer Advisor', branchCode: 'KKN-Central' },
    { id: 'EMP-KKN-C-005', nameTh: 'อภิชาติ แก่นนคร', nameEn: 'Apichat Kaennakhon', position: 'Relationship Manager', branchCode: 'KKN-Central' },
    { id: 'EMP-KKN-C-006', nameTh: 'รัชนี ลำน้ำพอง', nameEn: 'Ratchanee Lamnamphong', position: 'Teller', branchCode: 'KKN-Central' },
    { id: 'EMP-KKN-C-007', nameTh: 'ธวัชชัย ศรีจันทร์', nameEn: 'Thawatchai Srichan', position: 'Operations Specialist', branchCode: 'KKN-Central' },
    { id: 'EMP-KKN-C-008', nameTh: 'พิมพ์ใจ หนองคาย', nameEn: 'Pimjai Nongkhai', position: 'Branch Coordinator', branchCode: 'KKN-Central' },
  ],
  'HDY-Central': [
    { id: 'EMP-HDY-C-001', nameTh: 'สมพงษ์ ใต้สุด', nameEn: 'Sompong Taisud', position: 'Branch Manager', branchCode: 'HDY-Central' },
    { id: 'EMP-HDY-C-002', nameTh: 'นารีรัตน์ หาดใหญ่', nameEn: 'Nareerat Hatyai', position: 'Senior Teller', branchCode: 'HDY-Central' },
    { id: 'EMP-HDY-C-003', nameTh: 'วิชัย สงขลา', nameEn: 'Wichai Songkhla', position: 'Loan Officer', branchCode: 'HDY-Central' },
    { id: 'EMP-HDY-C-004', nameTh: 'กนกวรรณ ทะเลสาบ', nameEn: 'Kanokwan Thalesap', position: 'Customer Advisor', branchCode: 'HDY-Central' },
    { id: 'EMP-HDY-C-005', nameTh: 'ประเสริฐ ด่านนอก', nameEn: 'Prasert Dannok', position: 'Relationship Manager', branchCode: 'HDY-Central' },
    { id: 'EMP-HDY-C-006', nameTh: 'อรพรรณ คลองแงะ', nameEn: 'Orapan Khlongngae', position: 'Teller', branchCode: 'HDY-Central' },
    { id: 'EMP-HDY-C-007', nameTh: 'สุริยา เบตง', nameEn: 'Suriya Betong', position: 'Operations Specialist', branchCode: 'HDY-Central' },
    { id: 'EMP-HDY-C-008', nameTh: 'มยุรี นาทวี', nameEn: 'Mayuree Nathawi', position: 'Branch Coordinator', branchCode: 'HDY-Central' },
    { id: 'EMP-HDY-C-009', nameTh: 'เกรียงไกร สะเดา', nameEn: 'Kriangkrai Sadao', position: 'Senior Analyst', branchCode: 'HDY-Central' },
  ],
};

/**
 * Returns the list of mock employees for a given branch code.
 * Falls back to BKK-Sukhumvit if branch not found.
 */
export function getBranchEmployees(branchCode: string): BranchEmployee[] {
  return BRANCH_EMPLOYEES[branchCode] ?? BRANCH_EMPLOYEES['BKK-Sukhumvit'];
}

/** All branch codes in the mock pool — used by the SPD HR-Admin "all branches" mode. */
export function getAllBranchCodes(): string[] {
  return Object.keys(BRANCH_EMPLOYEES);
}

/**
 * Returns whether a given employee is enrolled in a given plan. Deterministic (~70% rate).
 */
export function getBranchEnrollment(employeeId: string, planCode: string): boolean {
  const h = hashStr(`${employeeId}:${planCode}:branch-enrolled`);
  return h % 10 < 7; // 0-6 = enrolled (70%), 7-9 = not enrolled
}

/**
 * Returns { used, total } for a given employee × plan combination in branch context.
 * Deterministic based on composite key.
 */
export function getBranchEntitlementUsage(
  employeeId: string,
  planCode: string,
  annualLimitThb: number | null,
): { used: number; total: number } {
  const total = annualLimitThb ?? 12000;
  const key = `${employeeId}:${planCode}:branch-usage`;
  const h = hashStr(key);
  const pct = h % 101; // 0..100
  const used = Math.round((total * pct) / 100);
  return { used, total };
}

/**
 * Returns total pending enrolment count across all branches. Deterministic.
 */
export function getBranchPendingEnrolmentCount(): number {
  // Fixed deterministic value derived from all branch employees
  const allEmployees = Object.values(BRANCH_EMPLOYEES).flat();
  return allEmployees.reduce((sum, emp) => {
    const h = hashStr(emp.id + ':branch-pending');
    return sum + (h % 3); // 0, 1, or 2 pending per employee
  }, 0);
}

/** The 6 plan IDs shown in the SPD branch matrix */
export const BRANCH_MATRIX_PLAN_IDS = [
  'BE-MED-001', // Medical OPD (dvtVariant: true)
  'BE-LIF-001', // Life/Accident (dvtVariant: true)
  'BE-DEN-001', // Dental
  'BE-PHY-001', // Physical checkup A
  'BE-GAS-001', // Gasoline
  'BE-TOL-001', // Toll
] as const;

export type BranchMatrixPlanId = (typeof BRANCH_MATRIX_PLAN_IDS)[number];
