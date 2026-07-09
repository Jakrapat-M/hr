// termination-logic.ts — derived-logic registry for the termination form.
//
// Each entry maps a Termination Reason (ReasonPicker event 5597 code) onto the
// fields the BA spec says are auto-derived from that reason:
//   - voluntary           → "Voluntary" / "Involuntary" (read-only display)
//   - reasonForTermination → sub-reason LOV options + default (first = default)
//   - transferOutDefault   → always 'NONE'; the company list only applies to TERM_TRANS
//   - okToRehireDefault    → default Yes/No for the (editable, not-required) OK-to-Rehire field
//   - visibility           → ESS / Manager(MSS) / HRBP / SPD surfacing flags
//
// Rule C8: reason codes are existing ReasonPicker codes — none invented here.
// The sub-reason option labels are BA-verbatim text (not SF event codes), so they
// are plain display strings. TERM_RESIGN reuses the existing RESIGN_* codes.

/** A single sub-reason ("Reason for termination") option. */
export interface ReasonForTerminationOption {
  /** Stable value — a RESIGN_* code for resignation, else the BA label string. */
  code: string
  /** Display label (BA-verbatim). */
  label: string
}

export interface TerminationLogicEntry {
  /** true = Voluntary, false = Involuntary (read-only derived display). */
  voluntary: boolean
  /** Sub-reason LOV — options + default (default = options[0].code). */
  reasonForTermination: {
    options: ReasonForTerminationOption[]
    default: string
  }
  /** Always 'NONE' except the Transfer Out reason, which uses the company list. */
  transferOutDefault: 'NONE'
  /** Default for the (editable, not-required) OK to Rehire field. */
  okToRehireDefault: boolean
  /** Role-based surfacing flags (BA ESS/MSS/HRBP/SPD columns). */
  visibility: { ess: boolean; manager: boolean; hrbp: boolean; spd: boolean }
}

// Admin-only reasons (BA "-" rows) are surfaced to HRBP + SPD only.
const ADMIN_ONLY = { ess: false, manager: false, hrbp: true, spd: true } as const

/** "No Selection" placeholder used by Transfer out to / sub-reasons. */
export const NO_SELECTION = 'NONE'

/** Company list for the Transfer Out reason's "Transfer out to" picker. */
export const TRANSFER_OUT_COMPANIES: ReasonForTerminationOption[] = [
  { code: 'CDS', label: 'CDS' },
  { code: 'CMG', label: 'CMG' },
  { code: 'RIS', label: 'RIS' },
]

function opt(code: string, label: string): ReasonForTerminationOption {
  return { code, label }
}

export const TERMINATION_LOGIC: Record<string, TerminationLogicEntry> = {
  TERM_ABSENT: {
    voluntary: true,
    reasonForTermination: {
      options: [opt('3 days Absent', '3 days Absent'), opt('6 days Absent', '6 days Absent')],
      default: '3 days Absent',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: false,
    visibility: { ...ADMIN_ONLY },
  },
  TERM_COVID: {
    voluntary: false,
    reasonForTermination: {
      options: [opt('Termination of Employment with Severance', 'Termination of Employment with Severance')],
      default: 'Termination of Employment with Severance',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: false,
    visibility: { ess: false, manager: true, hrbp: true, spd: true },
  },
  TERM_DISMISS: {
    voluntary: false,
    reasonForTermination: {
      options: [
        opt('Dishonesty', 'Dishonesty'),
        opt("Company's regulations Violation", "Company's regulations Violation"),
      ],
      default: 'Dishonesty',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: false,
    visibility: { ess: false, manager: true, hrbp: true, spd: true },
  },
  TERM_ERLRETIRE: {
    voluntary: false,
    reasonForTermination: {
      options: [opt('Early retirement', 'Early retirement')],
      default: 'Early retirement',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: false,
    visibility: { ess: false, manager: false, hrbp: true, spd: true },
  },
  TERM_EOC: {
    voluntary: false,
    reasonForTermination: {
      options: [opt('End of Contract', 'End of Contract')],
      default: 'End of Contract',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: false,
    visibility: { ess: false, manager: true, hrbp: true, spd: true },
  },
  TERM_LAYOFF: {
    voluntary: false,
    reasonForTermination: {
      options: [
        opt('Termination of Employment', 'Termination of Employment'),
        opt('Termination of Employment with Severance', 'Termination of Employment with Severance'),
      ],
      default: 'Termination of Employment',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: true,
    visibility: { ess: false, manager: true, hrbp: true, spd: true },
  },
  TERM_PASSAWAY: {
    voluntary: false,
    reasonForTermination: {
      options: [opt('Death', 'Death')],
      default: 'Death',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: true,
    visibility: { ess: false, manager: false, hrbp: false, spd: true },
  },
  TERM_RESIGN: {
    voluntary: true,
    reasonForTermination: {
      options: [
        opt('RESIGN_PERSONAL', 'ลาออกด้วยเหตุส่วนตัว'),
        opt('RESIGN_STUDY', 'ลาออกเพื่อศึกษาต่อ'),
        opt('RESIGN_FAMILY', 'ลาออกด้วยเหตุครอบครัว'),
        opt('RESIGN_OTHER', 'ลาออกด้วยเหตุอื่น'),
      ],
      default: 'RESIGN_PERSONAL',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: true,
    visibility: { ess: true, manager: true, hrbp: true, spd: true },
  },
  TERM_RETIRE: {
    voluntary: false,
    reasonForTermination: {
      options: [opt('Retirement', 'Retirement')],
      default: 'Retirement',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: true,
    visibility: { ess: false, manager: false, hrbp: false, spd: true },
  },
  TERM_DM: {
    voluntary: false,
    reasonForTermination: {
      options: [opt('Others or Not specification', 'Others or Not specification')],
      default: 'Others or Not specification',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: true,
    visibility: { ...ADMIN_ONLY },
  },
  TERM_UNSUCPROB: {
    voluntary: false,
    reasonForTermination: {
      options: [
        opt('Unsatisfied Probation', 'Unsatisfied Probation'),
        opt('Do not pass exit interview', 'Do not pass exit interview'),
      ],
      default: 'Unsatisfied Probation',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: true,
    visibility: { ...ADMIN_ONLY },
  },
  TERM_TRANS: {
    voluntary: false,
    reasonForTermination: {
      options: [opt('Transfer to BG', 'Transfer to BG')],
      default: 'Transfer to BG',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: true,
    visibility: { ...ADMIN_ONLY },
  },
  TERM_NOSHOW: {
    voluntary: false,
    reasonForTermination: {
      options: [opt('Do not show up for work', 'Do not show up for work')],
      default: 'Do not show up for work',
    },
    transferOutDefault: 'NONE',
    okToRehireDefault: true,
    visibility: { ...ADMIN_ONLY },
  },
}

/** The 13 reason codes this page restricts the Termination Reason dropdown to. */
export const TERMINATION_LOGIC_CODES: string[] = Object.keys(TERMINATION_LOGIC)

/** Reason code that enables the company-list "Transfer out to" picker. */
export const TRANSFER_OUT_REASON_CODE = 'TERM_TRANS'

/** Compute Termination date = Resigned Date + 1 day (ISO YYYY-MM-DD). */
export function computeTerminationDate(resignedDate: string): string {
  const [y, m, d] = resignedDate.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  const yy = next.getFullYear()
  const mm = String(next.getMonth() + 1).padStart(2, '0')
  const dd = String(next.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
