'use client'

// ExitInterviewSection.tsx — optional Exit Interview questionnaire on the admin
// terminate form (STA-124 — [EC] Termination feedback).
//
// 5 parts + overall comment, fully OPTIONAL (form submits with this blank):
//   1-3  ranked factors — 3 dependent <select>s each (rank 1/2/3); picking a
//        factor removes it from the other two ranks WITHIN that part. The same
//        factor IS allowed across different parts. Per-part comment textarea.
//   4    Personal Reason — single select.
//   5    New Job — single select + conditional new-job-type sub-select.
//   +    Overall comment textarea.
//
// Humi FormField + native <select>/<textarea>. NO-RED (danger = pumpkin).

import { useTranslations } from 'next-intl'
import {
  JOB_FACTORS,
  COMPENSATION_FACTORS,
  WORK_RELATIONSHIP_FACTORS,
  PERSONAL_REASON_OPTIONS,
  NEW_JOB_OPTIONS,
  NEW_JOB_TYPE_OPTIONS,
  NEW_JOB_YES_CODE,
  type ExitFactorOption,
} from '@/lib/admin/exit-interview-options'
import {
  type ExitInterviewRecord,
  type RankedExitPart,
} from '@/stores/exit-feedback'

/**
 * Dependent-options logic (the testable core): for a given rank slot, return the
 * options minus any factor already chosen in the OTHER two ranks of the same
 * part. The currently-selected value for this slot is always retained so it
 * renders even if duplicated transiently.
 */
export function availableOptions(
  all: ExitFactorOption[],
  part: RankedExitPart,
  slot: 'rank1' | 'rank2' | 'rank3',
): ExitFactorOption[] {
  const others = (['rank1', 'rank2', 'rank3'] as const).filter((r) => r !== slot)
  const taken = new Set(others.map((r) => part[r]).filter(Boolean))
  return all.filter((o) => o.code === part[slot] || !taken.has(o.code))
}

type RankedKey = 'job' | 'compensation' | 'workRelationship'

interface ExitInterviewSectionProps {
  value: ExitInterviewRecord
  /** Partial-merge patch back into the parent draft. */
  onChange: (patch: Partial<ExitInterviewRecord>) => void
}

const RANKED_PARTS: { key: RankedKey; options: ExitFactorOption[] }[] = [
  { key: 'job', options: JOB_FACTORS },
  { key: 'compensation', options: COMPENSATION_FACTORS },
  { key: 'workRelationship', options: WORK_RELATIONSHIP_FACTORS },
]

const RANK_SLOTS: ('rank1' | 'rank2' | 'rank3')[] = ['rank1', 'rank2', 'rank3']

export function ExitInterviewSection({ value, onChange }: ExitInterviewSectionProps) {
  const t = useTranslations('terminationFeedback')

  const patchRanked = (key: RankedKey, partial: Partial<RankedExitPart>) => {
    onChange({ [key]: { ...value[key], ...partial } } as Partial<ExitInterviewRecord>)
  }

  return (
    <section
      className="humi-card"
      style={{ marginTop: 20 }}
      aria-labelledby="exit-interview-heading"
      data-testid="exit-interview-section"
    >
      <div className="humi-eyebrow" style={{ marginBottom: 4 }}>
        {t('eyebrow')}
      </div>
      <h2
        id="exit-interview-heading"
        className="font-display text-lg font-semibold text-ink"
        style={{ marginBottom: 4 }}
      >
        {t('sectionTitle')}{' '}
        <span className="text-small text-ink-muted">({t('optional')})</span>
      </h2>
      <p className="text-small text-ink-muted" style={{ marginBottom: 20, maxWidth: 640 }}>
        {t('intro')}
      </p>

      {/* ── Parts 1-3 — ranked factor pickers ── */}
      {RANKED_PARTS.map(({ key, options }) => (
        <div key={key} style={{ marginBottom: 24 }}>
          <div
            className="text-body font-semibold text-ink"
            style={{ marginBottom: 2 }}
          >
            {t(`parts.${key}.title`)}
          </div>
          <p className="text-small text-ink-muted" style={{ marginBottom: 10 }}>
            {t('rankedHint')}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {RANK_SLOTS.map((slot, idx) => {
              const opts = availableOptions(options, value[key], slot)
              return (
                <div key={slot}>
                  <label
                    htmlFor={`exit-${key}-${slot}`}
                    className="text-small font-medium text-ink"
                    style={{ display: 'block', marginBottom: 4 }}
                  >
                    {t('rankLabel', { rank: idx + 1 })}
                  </label>
                  <select
                    id={`exit-${key}-${slot}`}
                    value={value[key][slot]}
                    onChange={(e) => patchRanked(key, { [slot]: e.target.value })}
                    className="humi-input"
                    style={{ width: '100%' }}
                  >
                    <option value="">{t('selectPlaceholder')}</option>
                    {opts.map((o) => (
                      <option key={o.code} value={o.code}>
                        {t(`parts.${key}.options.${o.code}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 10 }}>
            <label
              htmlFor={`exit-${key}-comment`}
              className="text-small font-medium text-ink"
              style={{ display: 'block', marginBottom: 4 }}
            >
              {t('partCommentLabel')}
            </label>
            <textarea
              id={`exit-${key}-comment`}
              value={value[key].comment}
              onChange={(e) => patchRanked(key, { comment: e.target.value })}
              rows={2}
              placeholder={t('partCommentPlaceholder')}
              className="humi-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      ))}

      <hr className="humi-divider" />

      {/* ── Part 4 — Personal Reason (single select) ── */}
      <div style={{ marginBottom: 24, marginTop: 20 }}>
        <label
          htmlFor="exit-personalReason"
          className="text-body font-semibold text-ink"
          style={{ display: 'block', marginBottom: 6 }}
        >
          {t('parts.personalReason.title')}
        </label>
        <select
          id="exit-personalReason"
          value={value.personalReason.value}
          onChange={(e) => onChange({ personalReason: { value: e.target.value } })}
          className="humi-input"
          style={{ maxWidth: 360, width: '100%' }}
        >
          <option value="">{t('selectPlaceholder')}</option>
          {PERSONAL_REASON_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {t(`parts.personalReason.options.${o.code}`)}
            </option>
          ))}
        </select>
      </div>

      {/* ── Part 5 — New Job (single select + conditional sub-select) ── */}
      <div style={{ marginBottom: 24 }}>
        <label
          htmlFor="exit-newJob"
          className="text-body font-semibold text-ink"
          style={{ display: 'block', marginBottom: 6 }}
        >
          {t('parts.newJob.title')}
        </label>
        <select
          id="exit-newJob"
          value={value.newJob.value}
          onChange={(e) => {
            const v = e.target.value
            // Clear the sub-select when the answer is no longer "got a new job".
            onChange({
              newJob: {
                value: v,
                newJobType: v === NEW_JOB_YES_CODE ? value.newJob.newJobType : '',
              },
            })
          }}
          className="humi-input"
          style={{ maxWidth: 360, width: '100%' }}
        >
          <option value="">{t('selectPlaceholder')}</option>
          {NEW_JOB_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {t(`parts.newJob.options.${o.code}`)}
            </option>
          ))}
        </select>

        {value.newJob.value === NEW_JOB_YES_CODE && (
          <div style={{ marginTop: 12 }}>
            <label
              htmlFor="exit-newJobType"
              className="text-small font-medium text-ink"
              style={{ display: 'block', marginBottom: 4 }}
            >
              {t('parts.newJob.subSelectLabel')}
            </label>
            <select
              id="exit-newJobType"
              value={value.newJob.newJobType}
              onChange={(e) =>
                onChange({
                  newJob: { value: value.newJob.value, newJobType: e.target.value },
                })
              }
              className="humi-input"
              style={{ maxWidth: 360, width: '100%' }}
            >
              <option value="">{t('selectPlaceholder')}</option>
              {NEW_JOB_TYPE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {t(`parts.newJob.typeOptions.${o.code}`)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <hr className="humi-divider" />

      {/* ── Overall comment ── */}
      <div style={{ marginTop: 20 }}>
        <label
          htmlFor="exit-overallComment"
          className="text-body font-semibold text-ink"
          style={{ display: 'block', marginBottom: 6 }}
        >
          {t('overallCommentLabel')}
        </label>
        <textarea
          id="exit-overallComment"
          value={value.overallComment}
          onChange={(e) => onChange({ overallComment: e.target.value })}
          rows={3}
          placeholder={t('overallCommentPlaceholder')}
          className="humi-input"
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
    </section>
  )
}
