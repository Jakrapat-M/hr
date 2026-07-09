'use client';

// ModuleImportWizard.tsx — reusable, config-driven 4-step bulk-import wizard.
//
// Extracted from the benefits import page (admin/benefits/import) so the
// employees / payroll / time modules don't copy-paste ~800 lines each. The
// wizard skeleton (upload → preview → validate → run + job-history monitor) is
// module-agnostic; each module supplies a small config.
//
// MOCKUP only: file upload captures {name,size} (never parses contents), the
// run animates via mockProgress, and "commit" appends a job to the Zustand
// import-jobs store + optionally calls config.commit() to write rows into the
// module's own mock store. NO backend, NO real persistence.
//
// NO-RED: severity error rows use the error-* tokens, which map to pumpkin
// (--color-danger). No literal red, no hardcoded hex.

import { useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardEyebrow,
  CardTitle,
  DataTable,
  Button,
  Modal,
} from '@/components/cnext';
import type { DataTableColumn } from '@/components/cnext';
import { Stepper } from '@/components/admin/wizard/Stepper';
import { mockProgress } from '@/lib/mock-async';
import {
  useImportJobs,
  type ImportJob,
  type ImportJobStatus,
} from '@/stores/import-jobs-store';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ValidationItem {
  row: number;
  severity: 'ok' | 'warning' | 'error';
  messageTh: string;
  messageEn: string;
}

/** A module that gets the import wizard supplies one config object. */
export interface ModuleImportConfig<Row> {
  /** module key used to scope job-history rows (e.g. 'employees') */
  module: string;
  eyebrowTh: string;
  eyebrowEn: string;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  /** expected-column hint shown on the upload step */
  csvHintColumns: string;
  /** preview table columns */
  previewColumns: DataTableColumn<Row>[];
  /** sample preview rows (first N rows of an uploaded file, mocked) */
  sampleRows: Row[];
  rowKey: (row: Row) => string;
  /** validation results to render on step 3 */
  validationItems: ValidationItem[];
  /** seed job-history rows for this module */
  jobsSeed: ImportJob[];
  /**
   * Commit callback — called on a successful run with the rows to apply.
   * Modules use it to write into their own Zustand mock store. Optional.
   */
  commit?: (rows: Row[]) => void;
}

// ─── Stepper config ───────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { number: 1, labelTh: 'อัปโหลด', labelEn: 'Upload', descTh: 'เลือกไฟล์ CSV ที่จะนำเข้า' },
  { number: 2, labelTh: 'ดูตัวอย่าง', labelEn: 'Preview', descTh: 'ดูตัวอย่างข้อมูล 10 แถวแรก' },
  { number: 3, labelTh: 'ตรวจสอบความถูกต้อง', labelEn: 'Validate', descTh: 'ตรวจสอบความถูกต้องของข้อมูล' },
  { number: 4, labelTh: 'นำเข้า', labelEn: 'Import', descTh: 'ยืนยันและประมวลผลการนำเข้า' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusChip({ status, isTh }: { status: ImportJobStatus; isTh: boolean }) {
  const label: Record<ImportJobStatus, { th: string; en: string }> = {
    queued: { th: 'รอคิว', en: 'Queued' },
    running: { th: 'กำลังทำงาน', en: 'Running' },
    completed: { th: 'เสร็จสิ้น', en: 'Completed' },
    failed: { th: 'ล้มเหลว', en: 'Failed' },
  };
  const cls: Record<ImportJobStatus, string> = {
    queued: 'bg-warning-soft text-warning-ink border border-warning/30',
    running: 'bg-accent-soft text-accent border border-accent/30',
    completed: 'bg-success-soft text-success-ink border border-success/30',
    failed: 'bg-error-soft text-error-ink border border-error/30',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cls[status])}>
      {status === 'running' && <span aria-hidden>⟳</span>}
      {isTh ? label[status].th : label[status].en}
    </span>
  );
}

function SeverityBadge({ severity, isTh }: { severity: ValidationItem['severity']; isTh: boolean }) {
  if (severity === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
        <CheckCircle2 size={13} />
        {isTh ? 'ถูกต้อง' : 'Valid'}
      </span>
    );
  }
  if (severity === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-warning-ink text-xs font-medium">
        <AlertTriangle size={13} />
        {isTh ? 'เตือน' : 'Warning'}
      </span>
    );
  }
  // error → pumpkin (error-* tokens), never red
  return (
    <span className="inline-flex items-center gap-1 text-error-ink text-xs font-medium">
      <XCircle size={13} />
      {isTh ? 'ผิดพลาด' : 'Error'}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ModuleImportWizard<Row>({
  config,
  isTh,
}: {
  config: ModuleImportConfig<Row>;
  isTh: boolean;
}) {
  const {
    module,
    eyebrowTh,
    eyebrowEn,
    titleTh,
    titleEn,
    subtitleTh,
    subtitleEn,
    csvHintColumns,
    previewColumns,
    sampleRows,
    rowKey,
    validationItems,
    jobsSeed,
    commit,
  } = config;

  // Job-history store (seeded once per module)
  const seedModule = useImportJobs((s) => s.seedModule);
  const addJob = useImportJobs((s) => s.addJob);
  const allJobs = useImportJobs((s) => s.jobs);
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seedModule(module, jobsSeed);
    seededRef.current = true;
  }
  const jobs = useMemo(
    () =>
      allJobs
        .filter((j) => j.module === module)
        .sort((a, b) => (a.started < b.started ? 1 : -1)),
    [allJobs, module],
  );

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [incrementalLoad, setIncrementalLoad] = useState(true);
  const [useLocaleFormat, setUseLocaleFormat] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [runStep, setRunStep] = useState(0);
  const [runDone, setRunDone] = useState(false);

  // Log modal
  const [logModalJob, setLogModalJob] = useState<ImportJob | null>(null);

  const validOk = validationItems.filter((v) => v.severity === 'ok').length;
  const validWarning = validationItems.filter((v) => v.severity === 'warning').length;
  const validError = validationItems.filter((v) => v.severity === 'error').length;

  const RUN_STEPS = [
    isTh ? 'กำลังเตรียมข้อมูล…' : 'Preparing data…',
    isTh ? 'ตรวจสอบ schema…' : 'Validating schema…',
    isTh ? 'กำลังอ่านแถว…' : 'Reading rows…',
    isTh ? 'ตรวจสอบความถูกต้อง…' : 'Checking records…',
    isTh ? 'กำลังเขียนข้อมูล…' : 'Writing records…',
    isTh ? 'กำลังสร้าง audit log…' : 'Creating audit log…',
    isTh ? 'กำลัง commit transaction…' : 'Committing transaction…',
    isTh ? 'เสร็จสิ้น' : 'Done',
  ];

  const handleFileSelected = useCallback((file: File | undefined) => {
    if (!file) return;
    setSelectedFile({ name: file.name, size: file.size });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelected(e.dataTransfer.files[0]);
    },
    [handleFileSelected],
  );

  const handleRun = async () => {
    setIsRunning(true);
    setRunStep(0);
    await mockProgress(8, (s) => setRunStep(s), 400);
    setIsRunning(false);
    setRunDone(true);

    // Commit imported rows into the module's own mock store (if provided).
    if (commit) commit(sampleRows);

    // Record the completed run as a visible job-history row in the Zustand store.
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const stamp = `${hh}:${mm}:${ss}`;
    const jobId = `IMP-${String(Math.floor(now.getTime() / 1000) % 10000).padStart(4, '0')}`;
    const totalRows = validationItems.length;
    addJob({
      id: jobId,
      module,
      filename: selectedFile?.name ?? 'import.csv',
      type: module,
      status: validError > 0 ? 'failed' : 'completed',
      started: `${now.toISOString().slice(0, 10)}T${stamp}`,
      records: totalRows,
      processed: validOk + validWarning,
      errors: validError,
      logLines: [
        `[${stamp}] Job ${jobId} started`,
        `[${stamp}] Parsed ${totalRows} rows from ${selectedFile?.name ?? 'import.csv'}`,
        `[${stamp}] Validation: ${validOk} OK / ${validWarning} warning(s) / ${validError} error(s)`,
        `[${stamp}] Inserted ${validOk + validWarning} records`,
        `[${stamp}] Job ${jobId} completed`,
      ],
    });
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedFile(null);
    setRunStep(0);
    setRunDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Step 1: Upload ───────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-small font-semibold text-ink">{isTh ? 'ไฟล์ CSV' : 'CSV File'}</p>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-12 text-center transition-colors',
            isDragging ? 'border-accent bg-accent-soft' : 'border-hairline bg-canvas-soft hover:border-accent/50 hover:bg-accent-soft/50',
          )}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          aria-label={isTh ? 'คลิกหรือลากไฟล์ CSV มาวาง' : 'Click or drag CSV file here'}
        >
          <Upload className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="font-semibold text-ink">{isTh ? 'คลิกหรือลากไฟล์มาวาง' : 'Click or drag file here'}</p>
            <p className="mt-1 text-small text-ink-muted">
              {isTh ? 'รองรับไฟล์ .csv ขนาดไม่เกิน 10 MB' : 'Accepts .csv files up to 10 MB'}
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
          aria-label={isTh ? 'เลือกไฟล์ CSV' : 'Select CSV file'}
        />

        {selectedFile && (
          <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-hairline bg-surface px-4 py-3">
            <FileText className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-medium text-ink">{selectedFile.name}</p>
              <p className="text-xs text-ink-muted">{formatBytes(selectedFile.size)}</p>
            </div>
            <button
              className="text-xs text-ink-muted underline hover:text-ink"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            >
              {isTh ? 'ลบ' : 'Remove'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 text-small text-ink-muted">
        <p className="font-semibold text-ink mb-1">{isTh ? 'รูปแบบไฟล์ที่รองรับ' : 'Expected CSV format'}</p>
        <p className="font-mono text-xs">{csvHintColumns}</p>
        <p className="mt-2">
          {isTh
            ? 'แถวแรกต้องเป็น header. ใช้ comma เป็น delimiter. Encoding: UTF-8.'
            : 'First row must be the header. Use comma delimiter. Encoding: UTF-8.'}
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setStep(2)} disabled={!selectedFile}>
          {isTh ? 'ถัดไป: ดูตัวอย่าง →' : 'Next: Preview →'}
        </Button>
      </div>
    </div>
  );

  // ── Step 2: Preview ──────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-small text-ink-muted">
        {isTh ? `แสดง 10 แถวแรกจากไฟล์: ${selectedFile?.name}` : `Showing first 10 rows from: ${selectedFile?.name}`}
      </p>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-hairline">
        <DataTable
          caption={isTh ? 'ตัวอย่างข้อมูล' : 'Preview'}
          captionVisuallyHidden
          columns={previewColumns}
          rows={sampleRows}
          rowKey={rowKey}
          dense
        />
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(1)}>{isTh ? '← ย้อนกลับ' : '← Back'}</Button>
        <Button onClick={() => setStep(3)}>{isTh ? 'ถัดไป: ตรวจสอบความถูกต้อง →' : 'Next: Validate →'}</Button>
      </div>
    </div>
  );

  // ── Step 3: Validate ─────────────────────────────────────────────────────────
  const renderStep3 = () => {
    const valCols: DataTableColumn<ValidationItem>[] = [
      { id: 'row', header: isTh ? 'แถว' : 'Row', cell: (r) => <span className="font-mono text-small">#{r.row}</span> },
      { id: 'severity', header: isTh ? 'สถานะ' : 'Status', cell: (r) => <SeverityBadge severity={r.severity} isTh={isTh} /> },
      { id: 'message', header: isTh ? 'รายละเอียด' : 'Detail', cell: (r) => <span className="text-small text-ink-muted">{isTh ? r.messageTh : r.messageEn}</span> },
    ];
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-3 py-1 text-small font-semibold text-success-ink">
            <CheckCircle2 size={14} />{validOk} {isTh ? 'ถูกต้อง' : 'valid'}
          </span>
          {validWarning > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-small font-semibold text-warning-ink">
              <AlertTriangle size={14} />{validWarning} {isTh ? 'เตือน' : 'warnings'}
            </span>
          )}
          {validError > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-error/30 bg-error-soft px-3 py-1 text-small font-semibold text-error-ink">
              <XCircle size={14} />{validError} {isTh ? 'ผิดพลาด' : 'errors'}
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-hairline">
          <DataTable
            caption={isTh ? 'ผลตรวจสอบ' : 'Validation results'}
            captionVisuallyHidden
            columns={valCols}
            rows={validationItems}
            rowKey={(r) => String(r.row)}
            dense
          />
        </div>

        <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 space-y-3">
          <p className="text-small font-semibold text-ink">{isTh ? 'ตัวเลือกการนำเข้า' : 'Import options'}</p>
          <label className="flex cursor-pointer items-center gap-3 text-small text-ink select-none">
            <input type="checkbox" checked={incrementalLoad} onChange={(e) => setIncrementalLoad(e.target.checked)} className="h-4 w-4 rounded border-hairline accent-accent" />
            <div>
              <p className="font-medium">Incremental Load</p>
              <p className="text-xs text-ink-muted">
                {isTh ? 'เพิ่มเฉพาะแถวใหม่ ไม่อัปเดตรายการเดิม' : 'Insert new rows only — do not update existing records'}
              </p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-small text-ink select-none">
            <input type="checkbox" checked={useLocaleFormat} onChange={(e) => setUseLocaleFormat(e.target.checked)} className="h-4 w-4 rounded border-hairline accent-accent" />
            <div>
              <p className="font-medium">Use Locale Format</p>
              <p className="text-xs text-ink-muted">
                {isTh ? 'แปลงรูปแบบวันที่และตัวเลขตาม locale ไทย (DD/MM/YYYY)' : 'Parse dates and numbers using Thai locale (DD/MM/YYYY)'}
              </p>
            </div>
          </label>
        </div>

        {validError > 0 && (
          <div className="rounded-[var(--radius-md)] border border-error/30 bg-error-soft p-3 text-small text-error-ink">
            <p className="font-semibold">{isTh ? 'ไม่สามารถดำเนินการต่อได้' : 'Cannot proceed'}</p>
            <p className="text-xs">{isTh ? 'กรุณาแก้ไขข้อผิดพลาดก่อนดำเนินการต่อ' : 'Please fix all errors before continuing'}</p>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep(2)}>{isTh ? '← ย้อนกลับ' : '← Back'}</Button>
          <Button onClick={() => setStep(4)} disabled={validError > 0}>{isTh ? 'ถัดไป: นำเข้า →' : 'Next: Import →'}</Button>
        </div>
      </div>
    );
  };

  // ── Step 4: Confirm/Run ──────────────────────────────────────────────────────
  const renderStep4 = () => (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 space-y-2">
        <p className="text-small font-semibold text-ink">{isTh ? 'สรุปการนำเข้า' : 'Import summary'}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-small">
          <dt className="text-ink-muted">{isTh ? 'ไฟล์' : 'File'}</dt>
          <dd className="font-medium text-ink truncate">{selectedFile?.name}</dd>
          <dt className="text-ink-muted">{isTh ? 'แถวทั้งหมด' : 'Total rows'}</dt>
          <dd className="font-medium text-ink">{validationItems.length}</dd>
          <dt className="text-ink-muted">Incremental Load</dt>
          <dd className="font-medium text-ink">{incrementalLoad ? (isTh ? 'เปิด' : 'On') : (isTh ? 'ปิด' : 'Off')}</dd>
          <dt className="text-ink-muted">Use Locale Format</dt>
          <dd className="font-medium text-ink">{useLocaleFormat ? (isTh ? 'เปิด' : 'On') : (isTh ? 'ปิด' : 'Off')}</dd>
        </dl>
      </div>

      {(isRunning || runDone) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-small">
            <span className="font-medium text-ink">
              {runDone
                ? (isTh ? 'นำเข้าข้อมูลเสร็จสิ้น' : 'Import complete')
                : RUN_STEPS[runStep - 1] ?? (isTh ? 'กำลังเริ่มต้น…' : 'Starting…')}
            </span>
            <span className="text-ink-muted">{runStep}/8</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-canvas-soft border border-hairline">
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${(runStep / 8) * 100}%` }} />
          </div>
          {isRunning && (
            <div className="flex items-center gap-2 text-small text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {RUN_STEPS[runStep - 1] ?? (isTh ? 'กำลังเริ่มต้น…' : 'Starting…')}
            </div>
          )}
        </div>
      )}

      {runDone && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-success-soft p-4 text-ink">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-semibold">{isTh ? 'นำเข้าข้อมูลเรียบร้อยแล้ว' : 'Import successful'}</p>
            <p className="text-small text-ink-muted">
              {isTh
                ? `บันทึก ${validOk} รายการ · ${validWarning} รายการมีคำเตือน · ข้ามไป ${validError} รายการ`
                : `${validOk} records saved · ${validWarning} with warnings · ${validError} skipped`}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(3)} disabled={isRunning || runDone}>
          {isTh ? '← ย้อนกลับ' : '← Back'}
        </Button>
        {!runDone ? (
          <Button onClick={handleRun} disabled={isRunning} className="flex items-center gap-2">
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{isTh ? 'กำลังประมวลผล…' : 'Processing…'}</>
            ) : (
              <><Play className="h-4 w-4" />{isTh ? 'เริ่มนำเข้าข้อมูล' : 'Run Import'}</>
            )}
          </Button>
        ) : (
          <Button variant="ghost" onClick={resetWizard}>
            {isTh ? 'นำเข้าไฟล์ใหม่' : 'Import another file'}
          </Button>
        )}
      </div>
    </div>
  );

  // ── Job monitor columns ──────────────────────────────────────────────────────
  const jobCols: DataTableColumn<ImportJob>[] = [
    { id: 'id', header: 'Job ID', cell: (r) => <span className="font-mono text-small text-ink">{r.id}</span> },
    { id: 'filename', header: isTh ? 'ไฟล์' : 'Filename', cell: (r) => <span className="text-small text-ink truncate max-w-[160px] block">{r.filename}</span> },
    { id: 'status', header: isTh ? 'สถานะ' : 'Status', cell: (r) => <StatusChip status={r.status} isTh={isTh} /> },
    { id: 'started', header: isTh ? 'เวลาเริ่ม' : 'Started', cell: (r) => <span className="text-small text-ink-muted">{r.started.replace('T', ' ')}</span> },
    {
      id: 'records',
      header: isTh ? 'แถว' : 'Records',
      align: 'right',
      cell: (r) => <span className="text-small text-ink">{r.records === null ? '—' : `${r.processed ?? 0}/${r.records}`}</span>,
    },
    {
      id: 'action',
      header: '',
      cell: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setLogModalJob(r)}>
          {isTh ? 'ดู log' : 'View log'}
        </Button>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  const stepTitle: Record<number, ReactNode> = {
    1: isTh ? 'อัปโหลดไฟล์' : 'Upload File',
    2: isTh ? 'ตรวจสอบข้อมูล' : 'Preview Data',
    3: isTh ? 'ยืนยันความถูกต้อง' : 'Validate',
    4: isTh ? 'รันงานนำเข้า' : 'Confirm & Run',
  };

  return (
    <div className="space-y-6">
      <header>
        <CardEyebrow>{isTh ? eyebrowTh : eyebrowEn}</CardEyebrow>
        <h1 className="font-display text-3xl font-semibold text-ink">{isTh ? titleTh : titleEn}</h1>
        <p className="mt-2 text-small text-ink-muted">{isTh ? subtitleTh : subtitleEn}</p>
      </header>

      <Card variant="raised" size="lg">
        <div className="flex gap-8">
          <div className="w-48 shrink-0">
            <Stepper
              steps={WIZARD_STEPS}
              currentStep={step}
              maxUnlockedStep={step}
              onStepClick={(s) => { if (s < step) setStep(s); }}
              stepperLabel={isTh ? 'ขั้นตอนการนำเข้า' : 'Import wizard steps'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="mb-4">{stepTitle[step]}</CardTitle>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>
        </div>
      </Card>

      <Card variant="raised" size="lg">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-ink-muted" aria-hidden />
          <CardTitle>{isTh ? 'ประวัติงานนำเข้า' : 'Import Job Monitor'}</CardTitle>
        </div>
        <p className="mb-4 text-small text-ink-muted">
          {isTh ? 'ติดตามสถานะงานนำเข้าข้อมูลที่ผ่านมาและปัจจุบัน' : 'Track past and current import job status'}
        </p>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-hairline">
          <DataTable
            caption={isTh ? 'รายการงานนำเข้า' : 'Import jobs'}
            captionVisuallyHidden
            columns={jobCols}
            rows={jobs}
            rowKey={(r) => r.id}
            dense
            emptyState={
              <p className="py-6 text-center text-small text-ink-muted">
                {isTh ? 'ไม่มีประวัติงาน' : 'No import jobs yet'}
              </p>
            }
          />
        </div>
      </Card>

      {logModalJob && (
        <Modal
          open={!!logModalJob}
          onClose={() => setLogModalJob(null)}
          title={isTh ? `Log งาน ${logModalJob.id}` : `Job log: ${logModalJob.id}`}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusChip status={logModalJob.status} isTh={isTh} />
              <span className="text-small text-ink-muted">{logModalJob.filename}</span>
            </div>
            <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-canvas-soft border border-hairline p-4 text-xs leading-relaxed text-ink font-mono whitespace-pre-wrap">
              {logModalJob.logLines.join('\n')}
            </pre>
            {logModalJob.errors > 0 && (
              <div className="rounded-[var(--radius-md)] border border-error/30 bg-error-soft p-3 text-small text-error-ink">
                {isTh ? `พบ ${logModalJob.errors} ข้อผิดพลาด` : `${logModalJob.errors} error(s) found`}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setLogModalJob(null)}>{isTh ? 'ปิด' : 'Close'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
