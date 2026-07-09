// Placeholder-merge engine for curated letters (SF "Document Generation" core).
//
// Pure functions only — deterministic and testable. {{today}} is a REQUIRED
// caller-supplied string so the merge never reads a live clock.

import {
  GeneratableLetter,
  LetterPlaceholder,
  LETTER_COMPANY_TH,
  LETTER_COMPANY_EN,
} from '@/data/documents/templates';
import type { CnextEmployee } from '@/lib/cnext-mock-data';
import { formatDate, formatCurrency } from '@/lib/date';

export interface MergeOptions {
  /** Pre-formatted / raw "today" string. REQUIRED — keeps the fn deterministic. */
  today: string;
  /** Optional monthly salary (THB) for the salary certificate's {{salary}}. */
  salaryMonthly?: number;
  /** Optional hire date (ISO 'YYYY-MM-DD') for the {{startDate}} placeholder. */
  hireDate?: string;
  /** Override the default company name. */
  companyTh?: string;
  companyEn?: string;
}

/**
 * Deterministic mock monthly salary (THB) for the salary certificate.
 *
 * The `CnextEmployee` pool carries NO salary field (real comp lives only on the
 * richer single-profile object). For the mockup we derive a stable, plausible
 * figure from the employee id so the same person always certifies the same
 * amount. Range ≈ ฿28,000–฿98,000, rounded to the nearest ฿500.
 */
export function mockMonthlySalary(emp: CnextEmployee): number {
  let hash = 0;
  for (const ch of emp.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const base = 28000 + (hash % 70001); // 28,000 .. 98,000
  return Math.round(base / 500) * 500;
}

/**
 * Deterministic mock hire date (ISO 'YYYY-MM-DD') for the demo.
 *
 * The synthetic `CnextEmployee` core pool carries NO hireDate, so a certificate
 * would otherwise render a blank "เริ่มปฏิบัติงานตั้งแต่วันที่ ____". Derive a
 * stable, plausible date from the employee id — year ≈ 2014..2023, month 1..12,
 * day 1..28 — so the same person always shows the same date. No live clock.
 */
export function mockHireDate(emp: CnextEmployee): string {
  let hash = 0;
  for (const ch of emp.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const year = 2014 + (hash % 10); // 2014..2023
  // UNSIGNED shifts — hash can exceed 2^31; signed `>>` would flip it negative,
  // yielding a negative month/day and an invalid ISO string (formatDate → "-").
  const month = 1 + ((hash >>> 4) % 12); // 1..12
  const day = 1 + ((hash >>> 8) % 28); // 1..28
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export interface MergeResult {
  /** Localised letter title (the template name). */
  title: string;
  /** The body with every {{placeholder}} substituted. */
  filledBody: string;
  /** Placeholder keys that had no backing employee data (rendered as a blank line marker). */
  missingFields: LetterPlaceholder[];
}

const BLANK = '____________';

/**
 * Resolve a single placeholder against an employee row for a locale.
 * Returns `null` when the source field is genuinely absent (→ missingFields).
 */
function resolvePlaceholder(
  key: LetterPlaceholder,
  emp: CnextEmployee,
  locale: 'th' | 'en',
  opts: MergeOptions,
): string | null {
  const isTh = locale === 'th';
  switch (key) {
    case 'firstName':
      return isTh ? emp.firstNameTh : emp.firstNameEn || emp.firstNameTh;
    case 'lastName':
      return isTh ? emp.lastNameTh : emp.lastNameEn || emp.lastNameTh;
    case 'fullName': {
      if (isTh) return `${emp.firstNameTh} ${emp.lastNameTh}`.trim();
      const fn = emp.firstNameEn || emp.firstNameTh;
      const ln = emp.lastNameEn || emp.lastNameTh;
      return `${fn} ${ln}`.trim();
    }
    case 'position':
      return isTh ? emp.position : emp.jobTitle || emp.position;
    case 'department':
      return emp.department || null;
    case 'employeeCode':
      return emp.employeeCode || null;
    case 'startDate': {
      // hireDate only present on SF-real rows; the caller may supply a mock for
      // synthetic core rows. Null-guard so missingFields stays accurate.
      const hd = opts.hireDate ?? emp.hireDate;
      return hd ? formatDate(hd, 'long', locale) : null;
    }
    case 'salary':
      return typeof opts.salaryMonthly === 'number'
        ? formatCurrency(opts.salaryMonthly, 'THB')
        : null;
    case 'today':
      return opts.today;
    case 'company':
      return isTh
        ? opts.companyTh || LETTER_COMPANY_TH
        : opts.companyEn || LETTER_COMPANY_EN;
    default:
      return null;
  }
}

/**
 * Merge a curated letter template against an employee for a locale.
 * Missing fields are substituted with a blank-line marker and reported.
 */
export function mergeLetter(
  template: GeneratableLetter,
  emp: CnextEmployee,
  locale: 'th' | 'en',
  opts: MergeOptions,
): MergeResult {
  const title = locale === 'th' ? template.nameTh : template.nameEn;
  const body = locale === 'th' ? template.bodyTh : template.bodyEn;
  const missingFields: LetterPlaceholder[] = [];

  const filledBody = body.replace(/\{\{(\w+)\}\}/g, (_match, rawKey: string) => {
    const key = rawKey as LetterPlaceholder;
    const value = resolvePlaceholder(key, emp, locale, opts);
    if (value === null || value === '') {
      if (!missingFields.includes(key)) missingFields.push(key);
      return BLANK;
    }
    return value;
  });

  return { title, filledBody, missingFields };
}

/**
 * Wrap a merged plain-text letter into a self-contained, print-friendly HTML
 * document. Intentionally colour-free — the browser default (dark text on white
 * paper) is correct for a printed letter, so the exported artifact carries no
 * raw colour literals or app-token dependency.
 */
export function letterToHtml(result: MergeResult, locale: 'th' | 'en'): string {
  const lang = locale === 'th' ? 'th' : 'en';
  // Escape then preserve line breaks from the plain-text body.
  const escaped = result.filledBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${result.title}</title>
<style>
  body { font-family: "Sarabun", "Noto Sans Thai", Arial, sans-serif; margin: 0; }
  .sheet { max-width: 720px; margin: 0 auto; padding: 56px 64px; line-height: 1.9; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 16px; margin: 0; }
  @media print { .sheet { padding: 24px; } }
</style>
</head>
<body>
  <div class="sheet"><pre>${escaped}</pre></div>
</body>
</html>`;
}

/**
 * Client-side "mock PDF" download — a Blob of the merged letter HTML.
 * No PDF dependency. SSR/test-safe: no-ops when DOM is unavailable.
 */
export function downloadLetter(html: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') || filename.endsWith('.pdf') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
