// STA-100 — client-side CSV import/export for benefit entitlement rules.
// Mockup phase: no backend. Export downloads the in-session rules; import parses
// a CSV and maps rows best-effort onto EligibilityRule for in-session append.

import type { EligibilityRule } from '@/lib/workflow-api';

// Columns mirror the STA-99 eligibility table fields, in a stable order.
export const RULE_CSV_COLUMNS = [
  'benefit_key',
  'rule_name',
  'policy_profile',
  'business_group',
  'business_unit',
  'company_code',
  'job_code',
  'employee_group',
  'employee_subgroup',
  'dvt_project',
  'pg_from',
  'pg_to',
  'hiring_date_from',
  'hiring_date_to',
  'plan_effective',
  'entitlement_amount',
] as const;

type RuleCsvColumn = (typeof RULE_CSV_COLUMNS)[number];

function cellValue(rule: EligibilityRule, col: RuleCsvColumn): string {
  switch (col) {
    case 'business_group':
      // STA-99: business_group pending BA — emit the business_unit value as a stand-in.
      return String(rule.business_unit ?? '');
    case 'plan_effective':
      return String(rule.effective_type ?? rule.plan_effective ?? '');
    default: {
      const v = (rule as unknown as Record<string, unknown>)[col];
      return v == null ? '' : String(v);
    }
  }
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function rulesToCsv(rules: EligibilityRule[]): string {
  const header = RULE_CSV_COLUMNS.join(',');
  const lines = rules.map((r) => RULE_CSV_COLUMNS.map((c) => escapeCsv(cellValue(r, c))).join(','));
  return [header, ...lines].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parse one CSV line honouring quoted fields + escaped quotes ("").
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function num(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: string | undefined): string | null {
  const s = (v ?? '').trim();
  return s === '' ? null : s;
}

// Parse a CSV string into partial rules for in-session append. Skips blank lines.
// Best-effort: maps known headers; unknown columns are ignored.
export function parseRulesCsv(text: string, createdBy: string): EligibilityRule[] {
  const rows = text
    .split(/\r\n|\n|\r/)
    .filter((l) => l.trim() !== '');
  if (rows.length < 2) return [];

  const header = parseCsvLine(rows[0]).map((h) => h.trim().toLowerCase());
  const idx = (col: string) => header.indexOf(col);

  const out: EligibilityRule[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = parseCsvLine(rows[i]);
    const get = (col: string) => {
      const j = idx(col);
      return j >= 0 ? cells[j] : undefined;
    };
    const benefitKey = str(get('benefit_key'));
    if (!benefitKey) continue;

    const effective = str(get('plan_effective'));
    out.push({
      id: `imported-${Date.now()}-${i}`,
      benefit_key: benefitKey,
      scope_type: 'entitlement',
      scope_value: `${str(get('policy_profile')) ?? 'CPN'}:${str(get('employee_group')) ?? 'A'}`,
      allow: true,
      max_per_month: null,
      max_per_year: null,
      auto_approve_max: null,
      created_by: createdBy,
      effective_from: new Date().toISOString().slice(0, 10),
      effective_to: null,
      rule_name: str(get('rule_name')),
      rule_type: 'special',
      status: 'active',
      policy_profile: str(get('policy_profile')),
      business_unit: str(get('business_unit')) ?? str(get('business_group')),
      company: null,
      company_code: str(get('company_code')),
      job_code: str(get('job_code')),
      employee_group: str(get('employee_group')),
      employee_subgroup: str(get('employee_subgroup')),
      dvt_project: str(get('dvt_project')),
      pg_from: num(get('pg_from')),
      pg_to: num(get('pg_to')),
      plan_effective: effective,
      effective_type: (effective as EligibilityRule['effective_type']) ?? null,
      no_of_years_from_hiring: null,
      hiring_date_from: str(get('hiring_date_from')),
      hiring_date_to: str(get('hiring_date_to')),
      entitlement_amount: num(get('entitlement_amount')),
      max_per_claim: null,
      additional_condition: null,
    });
  }
  return out;
}
