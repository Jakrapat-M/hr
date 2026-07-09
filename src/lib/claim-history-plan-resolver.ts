// STA-234 — resolve a Benefits-Hub claim-history row (HumiClaimHistoryItem) to
// the BENEFIT_PLAN_REGISTRY plan id that owns its "Start claim" full form, so the
// claim-detail Edit action can reopen the same SimpleClaimForm prefilled.
//
// row.type is a Thai display label that differs from the registry nameTh
// (e.g. row 'ค่าน้ำมันรถ' vs plan 'ค่าน้ำมันเชื้อเพลิง'), so mapping is explicit —
// never by name. Fuel rows disambiguate by claimType (toll/parking/gasoline).
// Every returned id exists in BENEFIT_PLAN_REGISTRY (asserted in the test).

/** Map a claim-history row's type (+ optional claimType) to a benefit plan id. */
export function planIdForClaimRow(type: string, claimType?: string): string {
  switch (type) {
    case 'ค่ารักษาพยาบาล':
      return 'BE-MED-001';
    case 'ค่าทันตกรรม':
      return 'BE-DEN-001';
    case 'ค่าโทรศัพท์':
      return 'BE-MOB-001';
    case 'ค่าน้ำมันรถ':
      if (claimType === 'toll') return 'BE-TOL-001';
      if (claimType === 'parking') return 'BE-PAR-001';
      return 'BE-GAS-001';
    default:
      return 'BE-MED-001';
  }
}
