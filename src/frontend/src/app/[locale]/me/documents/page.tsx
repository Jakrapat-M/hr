'use client';

// ════════════════════════════════════════════════════════════
// /me/documents — ESS document library  BRD #173
// ════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, FileText, Filter, Plus } from 'lucide-react';
import Link from 'next/link';
import { HUMI_HR_DOCS, HR_DOC_TYPE_LABELS, type HrDocType, type HumiHrDoc } from '@/lib/humi-mock-data';
import { formatDate } from '@/lib/date';
import { DOCUMENT_STORYBOARD_BOUNDARY_TH } from '@/lib/document-boundary';
import { useAuthStore } from '@/stores/auth-store';
import { employeeForLogin, ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';
import { LetterGeneratorModal } from '@/components/documents/LetterGeneratorModal';

type FilterValue = 'all' | HrDocType;

const FILTER_OPTIONS: Array<{ value: FilterValue; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'employment-letter', label: HR_DOC_TYPE_LABELS['employment-letter'] },
  { value: 'income-cert', label: HR_DOC_TYPE_LABELS['income-cert'] },
  { value: 'tax-form', label: HR_DOC_TYPE_LABELS['tax-form'] },
  { value: 'payslip-archive', label: HR_DOC_TYPE_LABELS['payslip-archive'] },
];

export default function MeDocumentsPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const [filter, setFilter] = useState<FilterValue>('all');
  const [generatorOpen, setGeneratorOpen] = useState(false);

  // Self-service = own data only. Resolve the signed-in employee record;
  // for the demo fall back to the first ported employee so the mockup is
  // always clickable even before a persona is selected.
  const email = useAuthStore((s) => s.email);
  const selfEmployee = employeeForLogin(email) ?? ALL_PORTED_EMPLOYEES[0] ?? null;

  const filtered: HumiHrDoc[] = filter === 'all'
    ? HUMI_HR_DOCS
    : HUMI_HR_DOCS.filter((d) => d.type === filter);

  return (
    <div data-testid="me-documents-page">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1.5">
            เอกสารส่วนบุคคล
          </h1>
          <p className="text-sm text-ink-muted">
            ดูและดาวน์โหลดเอกสารส่วนบุคคลของคุณ
          </p>
          <p className="mt-2 max-w-2xl text-small text-ink-muted" data-testid="document-boundary-notice">
            {DOCUMENT_STORYBOARD_BOUNDARY_TH}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setGeneratorOpen(true)}
            data-testid="generate-doc-cta"
            className="inline-flex items-center gap-2 rounded-md border border-accent bg-surface px-4 py-2 text-small font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <FileText size={15} aria-hidden />
            สร้างเอกสารทันที
          </button>
          <Link
            href={`/${locale}/me/documents/request`}
            data-testid="request-doc-cta"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-small font-semibold text-white transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus size={15} aria-hidden />
            ขอเอกสารใหม่
          </Link>
        </div>
      </header>

      {/* ── Filter ──────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap gap-2 mb-5 items-center"
        data-testid="docs-filter"
      >
        <Filter size={16} aria-hidden className="text-ink-muted" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            data-testid={`docs-filter-${opt.value}`}
            className={`humi-tag cursor-pointer${filter === opt.value ? ' humi-tag--accent' : ''}`}
            aria-pressed={filter === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Document list / empty state ─────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          data-testid="docs-empty"
          className="humi-card p-12 text-center text-ink-muted"
        >
          <FileText size={36} aria-hidden className="mx-auto mb-3 opacity-40 block" />
          <p>ไม่พบเอกสาร</p>
        </div>
      ) : (
        <div data-testid="docs-list" className="humi-card overflow-hidden p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-muted text-xs text-ink-muted">
                <th className="px-3.5 py-2.5 text-left font-semibold">ชื่อเอกสาร</th>
                <th className="px-3.5 py-2.5 text-left font-semibold">ประเภท</th>
                <th className="px-3.5 py-2.5 text-left font-semibold">วันที่ออก</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">ดาวน์โหลด</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr
                  key={doc.id}
                  data-testid={`doc-row-${doc.id}`}
                  className="border-t border-ink-faint"
                >
                  <td className="px-3.5 py-3 text-sm">{doc.name}</td>
                  <td className="px-3.5 py-3 text-xs text-ink-muted">
                    {HR_DOC_TYPE_LABELS[doc.type]}
                  </td>
                  <td className="px-3.5 py-3 text-xs text-ink-muted">
                    {formatDate(doc.issuedDate, 'medium', 'th')}
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`doc-download-${doc.id}`}
                      className="humi-row gap-1 text-xs text-accent justify-end no-underline"
                    >
                      <Download size={14} aria-hidden />
                      ดาวน์โหลด
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Instant self-service generator — own data only, no queue.
          Mounted only while open so the closed page never pulls in
          next-intl hooks (keeps the lightweight page test green). */}
      {generatorOpen && (
        <LetterGeneratorModal
          open={generatorOpen}
          onClose={() => setGeneratorOpen(false)}
          employee={selfEmployee}
        />
      )}
    </div>
  );
}
