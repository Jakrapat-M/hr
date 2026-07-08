const THAI_MONTHS = [
'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];
const THAI_MONTHS_SHORT = [
'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
];
const EN_MONTHS = [
'January','February','March','April','May','June',
'July','August','September','October','November','December',
];
const EN_MONTHS_SHORT = [
'Jan','Feb','Mar','Apr','May','Jun',
'Jul','Aug','Sep','Oct','Nov','Dec',
];

export type DateFormat ='short' |'medium' |'long' |'iso';

function toBuddhistYear(year: number): number {
 return year + 543;
}

export function formatDate(
 date: string | Date | null | undefined,
 format: DateFormat ='medium',
 locale: string ='en'
): string {
 if (!date) return'-';
 const d = typeof date ==='string' ? new Date(date) : date;
 if (isNaN(d.getTime())) return'-';

 const day = d.getDate();
 const month = d.getMonth();
 const year = d.getFullYear();
 const isTh = locale ==='th';
 const months = isTh ? THAI_MONTHS : EN_MONTHS;
 const monthsShort = isTh ? THAI_MONTHS_SHORT : EN_MONTHS_SHORT;
 const displayYear = isTh ? toBuddhistYear(year) : year;

 switch (format) {
 case'short':
 return `${String(day).padStart(2,'0')}/${String(month + 1).padStart(2,'0')}/${displayYear}`;
 case'medium':
 return `${day} ${monthsShort[month]} ${displayYear}`;
 case'long':
 return `${day} ${months[month]} ${displayYear}`;
 case'iso':
 return d.toISOString().split('T')[0];
 default:
 return `${day} ${monthsShort[month]} ${displayYear}`;
 }
}

// STA-256 — abbreviated [day mon year] display for chosen dates: EN → "8 Jul 2026"
// (A.D.), TH → "8 ก.ค. 2569" (B.E.), standard month abbreviations only. Parses a
// date-only ISO string (YYYY-MM-DD) directly to avoid timezone drift.
export function formatDateAbbrev(
 iso: string | null | undefined,
 locale: string ='en'
): string {
 if (!iso) return'-';
 const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
 if (!m) return formatDate(iso,'medium', locale);
 const year = Number(m[1]);
 const month = Number(m[2]) - 1;
 const day = Number(m[3]);
 if (month < 0 || month > 11) return'-';
 const isTh = locale ==='th';
 const monthsShort = isTh ? THAI_MONTHS_SHORT : EN_MONTHS_SHORT;
 return `${day} ${monthsShort[month]} ${isTh ? toBuddhistYear(year) : year}`;
}

// STA-132 — when a current benefit is set Inactive, its effective end date is
// the day BEFORE "today" (set Inactive on 19 Jun 2026 → end date 18 Jun 2026).
// Pure + date-only math (no timezone drift): returns an ISO `YYYY-MM-DD` string.
export function inactiveEndDate(today: Date): string {
 const prev = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
 prev.setUTCDate(prev.getUTCDate() - 1);
 return prev.toISOString().slice(0, 10);
}

export function maskValue(value: string | null | undefined, visibleChars = 4): string {
 if (!value) return'-';
 if (value.length <= visibleChars) return value;
 return'•'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

export function formatCurrency(amount: number, currency ='THB'): string {
 return new Intl.NumberFormat('th-TH', { style:'currency', currency }).format(amount);
}
