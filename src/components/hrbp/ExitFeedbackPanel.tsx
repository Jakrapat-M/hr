'use client'

// ExitFeedbackPanel.tsx — read-only HRBP surface for admin-captured Exit
// Interview feedback (STA-124 — [EC] Termination feedback).
//
// Reads the standalone `useExitFeedback` read-model (written on the admin
// terminate form's submit, alongside the timeline append) and renders, per
// terminated employee, all 5 parts + comments. Read-only — no actions.

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useExitFeedback, type ExitInterviewRecord } from '@/stores/exit-feedback'
import { EXIT_FACTOR_LABEL_TH } from '@/lib/admin/exit-interview-options'
import { REASON_LABELS } from '@/components/admin/lifecycle/ReasonPicker'

/** Resolve a factor code to a locale-correct label via the per-part i18n keys,
 *  falling back to the Thai seed label (then the raw code) for stray codes. */
type LabelFor = (optionsKey: string, code: string) => string

function RankedRow({
  title,
  ranks,
  comment,
  rankWord,
  optionsKey,
  labelFor,
}: {
  title: string
  ranks: string[]
  comment: string
  rankWord: string
  optionsKey: string
  labelFor: LabelFor
}) {
  const chosen = ranks.filter(Boolean)
  if (chosen.length === 0 && !comment.trim()) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="text-small font-semibold text-ink">{title}</div>
      {chosen.length > 0 && (
        <ol style={{ margin: '4px 0 0', paddingLeft: 0, listStyle: 'none' }}>
          {chosen.map((code, i) => (
            <li key={`${code}-${i}`} className="text-small text-ink-muted">
              {rankWord} {i + 1}: {labelFor(optionsKey, code)}
            </li>
          ))}
        </ol>
      )}
      {comment.trim() && (
        <div className="text-small text-ink-muted" style={{ marginTop: 2, fontStyle: 'italic' }}>
          “{comment.trim()}”
        </div>
      )}
    </div>
  )
}

function FeedbackBody({ record, rankWord }: { record: ExitInterviewRecord; rankWord: string }) {
  const t = useTranslations('terminationFeedback')
  const labelFor: LabelFor = (optionsKey, code) => {
    const key = `${optionsKey}.${code}`
    return t.has(key) ? t(key) : (EXIT_FACTOR_LABEL_TH[code] ?? code)
  }
  return (
    <div style={{ marginTop: 8 }}>
      <RankedRow
        title={t('parts.job.title')}
        ranks={[record.job.rank1, record.job.rank2, record.job.rank3]}
        comment={record.job.comment}
        rankWord={rankWord}
        optionsKey="parts.job.options"
        labelFor={labelFor}
      />
      <RankedRow
        title={t('parts.compensation.title')}
        ranks={[record.compensation.rank1, record.compensation.rank2, record.compensation.rank3]}
        comment={record.compensation.comment}
        rankWord={rankWord}
        optionsKey="parts.compensation.options"
        labelFor={labelFor}
      />
      <RankedRow
        title={t('parts.workRelationship.title')}
        ranks={[
          record.workRelationship.rank1,
          record.workRelationship.rank2,
          record.workRelationship.rank3,
        ]}
        comment={record.workRelationship.comment}
        rankWord={rankWord}
        optionsKey="parts.workRelationship.options"
        labelFor={labelFor}
      />
      {record.personalReason.value && (
        <div style={{ marginBottom: 10 }}>
          <div className="text-small font-semibold text-ink">{t('parts.personalReason.title')}</div>
          <div className="text-small text-ink-muted">
            {labelFor('parts.personalReason.options', record.personalReason.value)}
          </div>
        </div>
      )}
      {record.newJob.value && (
        <div style={{ marginBottom: 10 }}>
          <div className="text-small font-semibold text-ink">{t('parts.newJob.title')}</div>
          <div className="text-small text-ink-muted">
            {labelFor('parts.newJob.options', record.newJob.value)}
            {record.newJob.newJobType
              ? ` — ${labelFor('parts.newJob.typeOptions', record.newJob.newJobType)}`
              : ''}
          </div>
        </div>
      )}
      {record.overallComment.trim() && (
        <div style={{ marginBottom: 4 }}>
          <div className="text-small font-semibold text-ink">{t('overallCommentLabel')}</div>
          <div className="text-small text-ink-muted" style={{ fontStyle: 'italic' }}>
            “{record.overallComment.trim()}”
          </div>
        </div>
      )}
    </div>
  )
}

export function ExitFeedbackPanel() {
  const t = useTranslations('terminationFeedback')
  // Select the stable `byEmployee` map (stable reference between store updates),
  // then derive the sorted list in useMemo. Returning `Object.values(...)` from
  // the selector itself creates a new array every render → useSyncExternalStore
  // infinite-loop warning.
  const byEmployee = useExitFeedback((s) => s.byEmployee)
  const entries = useMemo(
    () =>
      Object.values(byEmployee).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [byEmployee],
  )
  const rankWord = t('panelRankWord')

  return (
    <div className="cnext-card" style={{ marginBottom: 20 }} data-testid="hrbp-exit-feedback-panel">
      <div className="cnext-eyebrow" style={{ marginBottom: 4 }}>
        {t('panelEyebrow')}
      </div>
      <h2
        className="font-display font-semibold tracking-tight text-ink"
        style={{ fontSize: 18, marginBottom: 12 }}
      >
        {t('panelTitle')}
      </h2>

      {entries.length === 0 ? (
        <p className="text-small text-ink-muted">{t('panelEmpty')}</p>
      ) : (
        <ul className="cnext-col" style={{ gap: 16 }} role="list">
          {entries.map((entry) => (
            <li
              key={entry.employeeId}
              data-testid={`exit-feedback-entry-${entry.employeeId}`}
              style={{
                borderTop: '1px solid var(--color-hairline)',
                paddingTop: 12,
              }}
            >
              <div className="cnext-row" style={{ gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span className="text-body font-semibold text-ink">{entry.employeeNameTh}</span>
                <span className="text-small text-ink-muted">{entry.employeeNameEn}</span>
                <span className="cnext-tag" style={{ marginLeft: 'auto' }}>
                  {entry.employeeId}
                </span>
              </div>
              <div className="text-small text-ink-muted" style={{ marginTop: 2 }}>
                {entry.positionTitle}
                {entry.reasonCode ? ` · ${REASON_LABELS[entry.reasonCode] ?? entry.reasonCode}` : ''}
              </div>
              <FeedbackBody record={entry.record} rankWord={rankWord} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
