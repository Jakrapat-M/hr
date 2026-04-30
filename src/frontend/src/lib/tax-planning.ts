export interface TaxAllowanceInput {
  spouse: number;
  children: number;
  parents: number;
  disability: number;
  lifeInsurance: number;
  providentFund: number;
  retirementFund: number;
  socialSecurity: number;
  donations: number;
  other: number;
}

export interface TaxEstimateInput {
  ytdIncome: number;
  ytdWithholding: number;
  expectedAdditionalIncome: number;
  allowances: TaxAllowanceInput;
}

export interface TaxEstimateResult {
  grossAnnualIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  estimatedTax: number;
  ytdWithholding: number;
  remainingDue: number;
  refund: number;
  outcome: 'due' | 'refund' | 'balanced';
}

export const THAI_TAX_YEAR_ASSUMPTIONS = {
  taxYear: 2026,
  personalAllowance: 60000,
  expenseDeductionCap: 100000,
  brackets: [
    { over: 0, rate: 0 },
    { over: 150000, rate: 0.05 },
    { over: 300000, rate: 0.1 },
    { over: 500000, rate: 0.15 },
    { over: 750000, rate: 0.2 },
    { over: 1000000, rate: 0.25 },
    { over: 2000000, rate: 0.3 },
    { over: 5000000, rate: 0.35 },
  ],
  caps: {
    spouse: 60000,
    children: 120000,
    parents: 120000,
    disability: 60000,
    lifeInsurance: 100000,
    providentFund: 500000,
    retirementFund: 500000,
    socialSecurity: 9000,
    donations: 100000,
    other: 100000,
  } satisfies Record<keyof TaxAllowanceInput, number>,
};

export function assertNonNegativeTaxInputs(input: TaxEstimateInput) {
  const values = [input.ytdIncome, input.ytdWithholding, input.expectedAdditionalIncome, ...Object.values(input.allowances)];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Tax planning inputs must be zero or positive numbers');
  }
}

export function maskTaxId(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return 'XXX-XXX-XXXX';
  return `X-XXXX-XXXXX-${digits.slice(-2)}-X`;
}

export function formatTHB(value: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value);
}

function cappedAllowances(allowances: TaxAllowanceInput) {
  return Object.entries(allowances).reduce((sum, [key, value]) => {
    const cap = THAI_TAX_YEAR_ASSUMPTIONS.caps[key as keyof TaxAllowanceInput];
    return sum + Math.min(value, cap);
  }, 0);
}

function progressiveTax(taxableIncome: number) {
  const brackets = THAI_TAX_YEAR_ASSUMPTIONS.brackets;
  let tax = 0;
  for (let index = 0; index < brackets.length; index += 1) {
    const bracket = brackets[index];
    const next = brackets[index + 1]?.over ?? Infinity;
    if (taxableIncome > bracket.over) {
      tax += (Math.min(taxableIncome, next) - bracket.over) * bracket.rate;
    }
  }
  return Math.round(tax);
}

export function calculateThaiPitEstimate(input: TaxEstimateInput): TaxEstimateResult {
  assertNonNegativeTaxInputs(input);
  const grossAnnualIncome = input.ytdIncome + input.expectedAdditionalIncome;
  const expenseDeduction = Math.min(grossAnnualIncome * 0.5, THAI_TAX_YEAR_ASSUMPTIONS.expenseDeductionCap);
  const totalDeductions = THAI_TAX_YEAR_ASSUMPTIONS.personalAllowance + expenseDeduction + cappedAllowances(input.allowances);
  const taxableIncome = Math.max(0, grossAnnualIncome - totalDeductions);
  const estimatedTax = progressiveTax(taxableIncome);
  const delta = estimatedTax - input.ytdWithholding;
  return {
    grossAnnualIncome,
    totalDeductions,
    taxableIncome,
    estimatedTax,
    ytdWithholding: input.ytdWithholding,
    remainingDue: Math.max(0, delta),
    refund: Math.max(0, -delta),
    outcome: delta > 0 ? 'due' : delta < 0 ? 'refund' : 'balanced',
  };
}
