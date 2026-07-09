'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ExternalLink, FileText, Download } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';

// ════════════════════════════════════════════════════════════
// PayStatements — monthly payslip list (month label + net pay + history)
// Extracted from CompensationSummary <section id="pay-statements"> so the
// standalone /payslip page and the profile employment tab share ONE markup.
//
// Two render modes:
//   variant="embedded"  → rendered inside CompensationSummary. The parent owns
//                         the reveal state (whole comp card masks together), so
//                         net pay masking is driven by the `masked` prop. Rows
//                         link back to the employment route (canonical surface).
//   variant="standalone" → the /payslip page. Self-contained: owns its own
//                         reveal toggle + net-pay masking, exposes view/download
//                         affordances per row (mockup — no real file yet).
// ════════════════════════════════════════════════════════════

export interface PayStatement {
  id: string;
  monthLabel: string;
  gross: string;
  net: string;
  status: string;
}

export const PAY_STATEMENTS: PayStatement[] = [
  { id: 'PS-2026-03', monthLabel: 'มีนาคม 2569', gross: '55,000 บาท', net: '48,200 บาท', status: 'พร้อมดาวน์โหลด' },
  { id: 'PS-2026-02', monthLabel: 'กุมภาพันธ์ 2569', gross: '55,000 บาท', net: '48,200 บาท', status: 'พร้อมดาวน์โหลด' },
  { id: 'PS-2026-01', monthLabel: 'มกราคม 2569', gross: '55,000 บาท', net: '47,800 บาท', status: 'พร้อมดาวน์โหลด' },
];

// HR comp-view roles re-grant the reveal control on standalone surfaces.
const COMP_VIEW_ROLES = ['hr_admin', 'hr_manager', 'hrbp', 'spd'] as const;

// Mask a "48,200 บาท" style money string keeping non-digit chrome (comma, unit).
function maskMoneyText(value: string): string {
  return value.replace(/[0-9๐-๙]/g, '•');
}

export default function PayStatements({
  variant = 'standalone',
  masked,
  viewerIsOwner,
}: {
  /** 'embedded' = inside CompensationSummary; 'standalone' = /payslip page. */
  variant?: 'embedded' | 'standalone';
  /** Embedded mode: net-pay masking driven by the parent comp card. */
  masked?: boolean;
  /** Standalone: override owner detection. Defaults to true (self view). */
  viewerIsOwner?: boolean;
}) {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const roles = useAuthStore((s) => s.roles);
  const employmentRoute = `/${locale}/profile/me?tab=employment#pay-statements`;

  // Standalone owns its own reveal state. Owner (self) may reveal; an explicit
  // non-owner without an HR comp-view role sees net pay permanently masked.
  const isOwner = viewerIsOwner ?? true;
  const canReveal = isOwner || hasAnyRole(roles, [...COMP_VIEW_ROLES]);
  const [selfMasked, setSelfMasked] = useState(true);
  const effectiveMasked =
    variant === 'embedded' ? !!masked : canReveal ? selfMasked : true;

  return (
    <section
      id="pay-statements"
      data-testid="pay-statements"
      style={
        variant === 'embedded'
          ? { borderTop: '1px solid var(--color-hairline)', paddingTop: 16 }
          : undefined
      }
    >
      <div
        className="cnext-row"
        style={{ justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}
      >
        <div>
          <div className="cnext-row" style={{ gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>statement เงินเดือน</div>
            {variant === 'embedded' && (
              <span
                className="cnext-tag"
                data-testid="pay-statements-canonical-mark"
                style={{
                  color: 'var(--color-accent)',
                  borderColor: 'var(--color-accent-soft)',
                  background: 'var(--color-accent-soft)',
                  fontSize: 11,
                }}
              >
                ช่องทางหลักในแท็บการจ้างงาน
              </span>
            )}
          </div>
          <h4 className="font-display text-base font-semibold leading-[1.2] tracking-tight text-ink">
            ดู statement เงินเดือนและย้อนหลัง
          </h4>
        </div>
        {variant === 'embedded' ? (
          <Link
            href={employmentRoute}
            className="cnext-row"
            style={{ gap: 6, fontSize: 14, color: 'var(--color-accent)', textDecoration: 'underline' }}
            data-testid="comp-payslip-link"
          >
            ดูย้อนหลัง
            <ExternalLink size={14} aria-hidden />
          </Link>
        ) : (
          canReveal && (
            <button
              type="button"
              onClick={() => setSelfMasked((m) => !m)}
              className="cnext-row"
              style={{ gap: 6, fontSize: 13, color: 'var(--color-ink-muted)' }}
              aria-label={selfMasked ? 'แสดงเงินเดือนสุทธิ' : 'ซ่อนเงินเดือนสุทธิ'}
              data-testid="payslip-reveal-toggle"
            >
              {selfMasked ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
              {selfMasked ? 'แสดง' : 'ซ่อน'}
            </button>
          )
        )}
      </div>

      <div className="cnext-col" style={{ gap: 8 }}>
        {PAY_STATEMENTS.map((statement) =>
          variant === 'embedded' ? (
            <Link
              key={statement.id}
              href={employmentRoute}
              aria-label={`statement เงินเดือน ${statement.monthLabel}`}
              className="cnext-row"
              style={{
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: '1px solid var(--color-hairline-soft)',
                color: 'var(--color-ink)',
                textDecoration: 'none',
              }}
            >
              <span className="cnext-row" style={{ gap: 8 }}>
                <FileText size={14} aria-hidden />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{statement.monthLabel}</span>
              </span>
              <span className="font-mono tabular-nums" style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>
                สุทธิ {effectiveMasked ? maskMoneyText(statement.net) : statement.net}
              </span>
            </Link>
          ) : (
            <div
              key={statement.id}
              data-testid="payslip-row"
              className="cnext-row"
              style={{
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 0',
                borderTop: '1px solid var(--color-hairline-soft)',
                color: 'var(--color-ink)',
              }}
            >
              <span className="cnext-row" style={{ gap: 8, alignItems: 'center' }}>
                <FileText size={16} aria-hidden />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{statement.monthLabel}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{statement.status}</span>
                </span>
              </span>
              <span className="cnext-row" style={{ gap: 16, alignItems: 'center' }}>
                <span className="font-mono tabular-nums" style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>
                  สุทธิ {effectiveMasked ? maskMoneyText(statement.net) : statement.net}
                </span>
                <button
                  type="button"
                  className="cnext-row"
                  style={{
                    gap: 6,
                    fontSize: 13,
                    color: 'var(--color-accent)',
                    padding: '6px 10px',
                    border: '1px solid var(--color-accent-soft)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-accent-soft)',
                  }}
                  aria-label={`ดาวน์โหลดสลิปเงินเดือน ${statement.monthLabel}`}
                  data-testid="payslip-download"
                >
                  <Download size={14} aria-hidden />
                  ดาวน์โหลด
                </button>
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
