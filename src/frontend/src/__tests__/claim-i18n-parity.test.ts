import { describe, expect, it } from 'vitest';
import th from '@/../messages/th.json';
import en from '@/../messages/en.json';
import {
  MEDICAL_DENTAL_OPTIONS,
  OPD_IPD_OPTIONS,
  HOSPITAL_NAME_TYPE_OPTIONS,
  YES_NO_TRANSFER_DOC_OPTIONS,
  GASOLINE_CLAIM_TYPE_OPTIONS,
} from '@/lib/admin/hire/picklists/picklistRegistry';

const REQUIRED_CLAIM_KEYS = [
  'selectedBenefit', 'claimDate', 'remainingAmount', 'currency', 'receiptNo',
  'receiptDate', 'receiptAmount', 'totalClaimAmount', 'remark',
  'medicalDental', 'opdIpd', 'hospitalType', 'hospitalName', 'patientTransferDoc',
  'diseaseDetails', 'gasolineClaimType', 'physicalInvoice', 'dependentName',
  'dependentDob', 'dependentRelationship', 'realMonthDate',
] as const;

const claimTh = (th as unknown as Record<string, Record<string, Record<string, string>>>).benefits?.claim ?? {};
const claimEn = (en as unknown as Record<string, Record<string, Record<string, string>>>).benefits?.claim ?? {};

describe('STA-119 — benefits.claim i18n parity', () => {
  it.each(REQUIRED_CLAIM_KEYS)('key benefits.claim.%s exists in both catalogs and is non-empty', (key) => {
    expect(claimTh[key], `th ${key}`).toBeTruthy();
    expect(claimEn[key], `en ${key}`).toBeTruthy();
  });

  it('th and en have the same set of claim keys', () => {
    expect(Object.keys(claimTh).sort()).toEqual(Object.keys(claimEn).sort());
  });
});

describe('STA-119 — LOV options carry both TH + EN labels', () => {
  const LOVS = [
    MEDICAL_DENTAL_OPTIONS,
    OPD_IPD_OPTIONS,
    HOSPITAL_NAME_TYPE_OPTIONS,
    YES_NO_TRANSFER_DOC_OPTIONS,
    GASOLINE_CLAIM_TYPE_OPTIONS,
  ];
  it('every option has a non-empty labelTh and labelEn', () => {
    for (const lov of LOVS) {
      for (const opt of lov) {
        expect(opt.labelTh, `${opt.id} th`).toBeTruthy();
        expect(opt.labelEn, `${opt.id} en`).toBeTruthy();
      }
    }
  });
});
