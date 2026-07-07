'use client';

// resignation-page.tsx — ESS ลาออก (Chain 1 / BRD #172)
//
// พนักงานยื่นคำขอลาออก → stores ใน termination-approvals → SPD อนุมัติ
// Reason codes: 17 SF TERM_* codes (sf-extract/qas-fields-2026-04-25 zVoluntary picklist)
// เมื่อ submit: addRequest() → toast "ส่งคำขอลาออกแล้ว — รอ SPD อนุมัติ"

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import {
  useTerminationApprovals,
  TERMINATION_REASON_LABEL,
  type TerminationReasonCode,
} from '@/stores/termination-approvals';
import { useAuthStore } from '@/stores/auth-store';
import { Button, FormField, FormInput, Modal } from '@/components/humi';
import { AttachmentDropzone } from '@/components/admin/AttachmentDropzone/AttachmentDropzone';
import type { AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone';
import { ExitInterviewSection } from '@/components/admin/terminate/ExitInterviewSection';
import {
  useExitFeedback,
  EMPTY_EXIT_INTERVIEW,
  isExitInterviewEmpty,
  type ExitInterviewRecord,
} from '@/stores/exit-feedback';
import { HUMI_MY_PROFILE } from '@/lib/humi-mock-data';

const selectClassName =
  'h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas';

// STA-247 — field parity with the admin terminate form: same email pattern +
// seeded value as terminate/page.tsx's EMAIL_RE / SEEDED_PERSONAL_EMAIL.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEEDED_PERSONAL_EMAIL = 'personal.email@gmail.com';

function formatDateTh(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function ResignationPage() {
  const t = useTranslations('resignation');
  const tf = useTranslations('terminationFeedback');
  const addRequest = useTerminationApprovals((s) => s.addRequest);
  const requests = useTerminationApprovals((s) => s.requests);
  const userId = useAuthStore((s) => s.userId) ?? 'EMP001';
  const userName = useAuthStore((s) => s.username) ?? 'พนักงาน';

  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [reasonCode, setReasonCode] = useState<TerminationReasonCode | ''>('');
  const [personalEmail, setPersonalEmail] = useState(SEEDED_PERSONAL_EMAIL);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<AttachedFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  // Frozen once per mount — react-hooks/purity flags Date.now() in render.
  const minLastWorkingDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const [submittedId, setSubmittedId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  // STA-238 — the Exit Interview is now a post-submit popup (Skip/Save) on the
  // employee's own resignation flow, NOT an inline section and NOT on the SPD
  // approver page (which shows only the submitted info + attachments).
  const [showExitModal, setShowExitModal] = useState(false);

  // Optional Exit Interview (STA-124 follow-up — BA: the form belongs on the
  // employee's resignation submit page, not the admin terminate form). Reuses
  // the shared section + exit-feedback store; persisted on submit, flows to HRBP.
  const recordExitFeedback = useExitFeedback((s) => s.record);
  const [exitInterview, setExitInterview] = useState<ExitInterviewRecord>(() =>
    structuredClone(EMPTY_EXIT_INTERVIEW),
  );
  const patchExit = (patch: Partial<ExitInterviewRecord>) =>
    setExitInterview((prev) => ({ ...prev, ...patch }));

  // Find a pending or approved request by this user.
  // If the most recent request is `rejected`, allow re-submission — the form
  // re-renders and the rejected request is shown as a notice (see banner below).
  // Pre-Phase-5 fix: any-status `find()` blocked the form forever once a seeded
  // demo request existed for the default `EMP001` userId.
  const myRequest = requests.find(
    (r) => r.employeeId === userId && r.status !== 'rejected',
  );
  const lastRejected = requests.find(
    (r) => r.employeeId === userId && r.status === 'rejected',
  );

  const hasPending =
    myRequest?.status === 'pending_manager' || myRequest?.status === 'pending_spd';
  const isApproved = myRequest?.status === 'approved';
  const personalEmailValid = !!personalEmail && EMAIL_RE.test(personalEmail);
  const isFormValid =
    !!lastWorkingDate && !!reasonCode && personalEmailValid && !hasPending && !isApproved;

  // Two-step submit: clicking ส่งคำขอลาออก opens a confirmation Modal first
  // (mockup confirm, no backend) so resignation is never a single irreversible-
  // looking click. Actual store write happens only in confirmSubmit().
  const requestSubmit = () => {
    if (!isFormValid || !reasonCode) return;
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    if (!isFormValid || !reasonCode) return;
    const id = addRequest({
      employeeId: userId,
      employeeName: userName,
      requestedLastDay: lastWorkingDate,
      reasonCode: reasonCode as TerminationReasonCode,
      reasonText: additionalInfo.trim() || undefined,
      personalEmail,
      attachments: attachmentFiles.length ? attachmentFiles : undefined,
      submittedBy: { id: userId, name: userName, role: 'employee' },
    });
    // STA-238 — the resignation is submitted here; the OPTIONAL Exit Interview
    // now opens as a post-submit popup (Skip/Save) instead of the old inline
    // section. Recording + the success view are deferred to the popup handlers.
    setConfirmOpen(false);
    setSubmittedId(id);
    setShowExitModal(true);
  };

  // Post-submit Exit Interview popup handlers. Skip = finish with no record;
  // Save = persist the answers (if any) then finish. Both close the popup and
  // flip to the success view.
  const finishSubmit = () => {
    setShowExitModal(false);
    setSubmitted(true);
  };
  const handleExitSkip = () => finishSubmit();
  const handleExitSave = () => {
    // Persist only if the employee filled anything; surfaces read-only on the
    // HRBP dashboard (same store as admin terminate).
    if (!isExitInterviewEmpty(exitInterview) && reasonCode) {
      recordExitFeedback({
        employeeId: userId,
        employeeNameTh: userName,
        employeeNameEn: userName,
        positionTitle: HUMI_MY_PROFILE.position,
        reasonCode: reasonCode as string,
        resignedDate: lastWorkingDate,
        recordedAt: new Date().toISOString(),
        record: exitInterview,
      });
    }
    finishSubmit();
  };

  // Only show the post-submit success view on a FRESH in-session submit.
  // Pre-existing pending/approved/rejected requests should NOT replace the form
  // on revisit — the form is the canonical landing surface, with status shown
  // as a banner above it (see lastPending / approved / lastRejected blocks).
  if (submitted) {
    const req = requests.find((r) => r.id === submittedId);
    return (
      <div className="pb-8 flex flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">คำขอลาออก</h1>
          <p className="text-small text-ink-muted mt-1">
            ยื่นคำขอลาออกผ่านระบบ Self-Service
          </p>
        </div>

        <div className="humi-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <CheckCircle size={28} className="text-success" aria-hidden />
            <div>
              <div className="font-display text-body font-semibold text-ink">
                ส่งคำขอลาออกแล้ว — รอ SPD อนุมัติ
              </div>
              <div className="text-small text-ink-muted">
                รหัสคำขอ: {req?.id}
              </div>
            </div>
          </div>

          {req && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="humi-eyebrow">วันทำงานวันสุดท้าย</div>
                <div className="text-body font-medium text-ink">
                  {formatDateTh(req.requestedLastDay)}
                </div>
              </div>
              <div>
                <div className="humi-eyebrow">เหตุผล</div>
                <div className="text-body font-medium text-ink">
                  {TERMINATION_REASON_LABEL[req.reasonCode]}
                </div>
              </div>
              {req.personalEmail && (
                <div>
                  <div className="humi-eyebrow">อีเมลส่วนตัว</div>
                  <div className="text-body font-medium text-ink">{req.personalEmail}</div>
                </div>
              )}
              {req.reasonText && (
                <div className="sm:col-span-2">
                  <div className="humi-eyebrow">ข้อมูลเพิ่มเติม</div>
                  <div className="text-body text-ink">{req.reasonText}</div>
                </div>
              )}
              <div>
                <div className="humi-eyebrow">สถานะ</div>
                <span className="humi-tag humi-tag--butter">
                  {req.status === 'pending_manager'
                    ? 'รอ Manager อนุมัติ'
                    : req.status === 'pending_spd'
                    ? 'รอ SPD อนุมัติ'
                    : req.status === 'approved'
                    ? 'อนุมัติแล้ว'
                    : 'ถูกปฏิเสธ'}
                </span>
              </div>
              <div>
                <div className="humi-eyebrow">ส่งเมื่อ</div>
                <div className="text-body text-ink">
                  {new Date(req.submittedAt).toLocaleDateString('th-TH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8 flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">คำขอลาออก</h1>
        <p className="text-small text-ink-muted mt-1">
          ยื่นคำขอลาออกผ่านระบบ Self-Service — SPD จะรับทราบและดำเนินการต่อ
        </p>
      </div>

      {myRequest?.status === 'pending_manager' && (
        <div className="humi-card humi-card--info p-4">
          <div className="humi-eyebrow">มีคำขอที่ยังรอ Manager อนุมัติ</div>
          <div className="text-small text-ink">
            รหัส {myRequest.id} — รออนุมัติจาก Manager ส่งคำขอใหม่ไม่ได้จนกว่า Manager จะตัดสิน
          </div>
        </div>
      )}

      {myRequest?.status === 'pending_spd' && (
        <div className="humi-card humi-card--info p-4">
          <div className="humi-eyebrow">มีคำขอที่ยังรอ SPD อนุมัติ</div>
          <div className="text-small text-ink">
            รหัส {myRequest.id} — Manager อนุมัติแล้ว รออนุมัติครั้งสุดท้ายจาก SPD
          </div>
        </div>
      )}

      {myRequest?.status === 'approved' && (
        <div className="humi-card humi-card--success p-4">
          <div className="humi-eyebrow">คำขอลาออกได้รับการอนุมัติแล้ว</div>
          <div className="text-small text-ink">
            รหัส {myRequest.id} — วันทำงานสุดท้าย {formatDateTh(myRequest.requestedLastDay)}
          </div>
        </div>
      )}

      {lastRejected && (
        <div className="humi-card humi-card--warning p-4">
          <div className="humi-eyebrow">คำขอก่อนหน้านี้ถูกปฏิเสธ</div>
          <div className="text-small text-ink">
            รหัส {lastRejected.id} — ส่งใหม่ได้ ปรับเหตุผลหรือเอกสารแนบให้ครบก่อนส่ง
          </div>
        </div>
      )}

      {/* Form */}
      <div className="humi-card p-6">
        <div className="humi-eyebrow mb-4">กรอกข้อมูลการลาออก</div>

        <div className="space-y-5">
          {/* วันทำงานวันสุดท้าย */}
          <FormField id="lastWorkingDate" label="วันทำงานวันสุดท้าย" required help="กรุณาแจ้งล่วงหน้าอย่างน้อย 30 วัน">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                type="date"
                value={lastWorkingDate}
                onChange={(e) => setLastWorkingDate(e.target.value)}
                min={minLastWorkingDate}
                className="max-w-[220px]"
              />
            )}
          </FormField>

          {/* เหตุผลการลาออก */}
          <FormField id="reasonCode" label="เหตุผลการลาออก" required>
            {(ctrl) => (
              <select
                {...ctrl}
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as TerminationReasonCode | '')}
                className={selectClassName + ' max-w-[360px]'}
              >
                <option value="">-- เลือกเหตุผล --</option>
                {(Object.entries(TERMINATION_REASON_LABEL) as [TerminationReasonCode, string][]).map(
                  ([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            )}
          </FormField>

          {/* อีเมลส่วนตัว */}
          <FormField
            id="personalEmail"
            label={
              <>
                อีเมลส่วนตัว <span className="text-ink-muted">(Personal Email)</span>
              </>
            }
            required
            error={personalEmail && !personalEmailValid ? 'รูปแบบอีเมลไม่ถูกต้อง' : undefined}
          >
            {(ctrl) => (
              <FormInput
                {...ctrl}
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="name@example.com"
                invalid={!!personalEmail && !personalEmailValid}
                className="max-w-[320px]"
              />
            )}
          </FormField>

          {/* ข้อมูลเพิ่มเติม */}
          <FormField id="additionalInfo" label="ข้อมูลเพิ่มเติม" help="ไม่จำเป็น">
            {(ctrl) => (
              <textarea
                {...ctrl}
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                className="w-full max-w-[520px] resize-y rounded-md border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
              />
            )}
          </FormField>

          {/* เอกสารแนบ */}
          <AttachmentDropzone
            files={attachmentFiles}
            onFilesChange={setAttachmentFiles}
            label="เอกสารแนบ"
            maxFiles={5}
            maxSizeMB={5}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="primary"
          onClick={requestSubmit}
          disabled={!isFormValid}
        >
          ส่งคำขอลาออก
        </Button>
      </div>

      {/* Info note */}
      <div className="humi-card humi-card--cream px-4 py-3">
        <div className="text-small text-ink-muted">
          เมื่อส่งคำขอแล้ว SPD จะรับทราบผ่านกล่องอนุมัติ และดำเนินการกระบวนการสิ้นสุดการจ้างงานต่อไป
        </div>
      </div>

      {/* Confirmation step — mockup confirm before the resignation is actually submitted */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('confirmSubmitTitle')}
        widthClass="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-[color:var(--color-danger-ink)]"
            >
              <AlertTriangle size={20} />
            </span>
            <p className="text-body text-ink">{t('confirmSubmitMessage')}</p>
          </div>

          {reasonCode && (
            <dl className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3 text-small">
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-ink-muted">{t('lastWorkingDate')}</dt>
                <dd className="font-medium text-ink">{formatDateTh(lastWorkingDate)}</dd>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-ink-muted">{t('reasonType')}</dt>
                <dd className="font-medium text-ink">
                  {TERMINATION_REASON_LABEL[reasonCode as TerminationReasonCode]}
                </dd>
              </div>
            </dl>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="primary" onClick={confirmSubmit}>
              {t('submitResignation')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* STA-238 — post-submit Exit Interview popup (Skip/Save); Esc/backdrop = Skip.
          Same pattern as the admin terminate popup (STA-236). */}
      <Modal
        open={showExitModal}
        onClose={handleExitSkip}
        title={tf('modalTitle')}
        widthClass="max-w-3xl"
      >
        <ExitInterviewSection value={exitInterview} onChange={patchExit} />
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-hairline bg-surface px-6 py-4">
          <button type="button" className="humi-btn humi-btn--ghost" onClick={handleExitSkip}>
            {tf('skip')}
          </button>
          <button type="button" className="humi-btn humi-btn--primary" onClick={handleExitSave}>
            {tf('save')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
