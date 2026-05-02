// data/benefits/rules-registry.ts — 76 SF benefit business rules
// Seeded from extracted-context-2026-05-02/07-benefit-rules-FULL.md
// Type mirrors SF Benefit rule metadata: baseObject, description, scenario, lastModified, dslBody

export type BenefitRuleBaseObject =
  | 'BenefitEmployeeClaim'
  | 'BenefitInsurancePlan'
  | 'Benefit'
  | 'cust_BE_BenefitSpecialPrivilegeDetail'
  | 'BenefitExceptionDetails';

export interface BenefitRule {
  id: string;
  baseObject: BenefitRuleBaseObject;
  description: string;
  scenario?: string;
  lastModified: string;
  dslBody: string;
}

export const BENEFIT_RULES_REGISTRY: BenefitRule[] = [
  // ── BenefitEmployeeClaim — 41 rules ──────────────────────────────────────

  {
    id: 'TH-EXCRC-BE-OC-DentalDVT_CheckCrossEntitlementAmount',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check entitlement amount of Dental (Part of Medical) cross with Medical Reimbursement for DVT of Ex-CRC.',
    scenario: 'DVT Ex-CRC cross-entitlement dental vs medical',
    lastModified: '2022-12-20',
    dslBody: `rule(core_java:SystemContext("Context") context, go_mdf:BenefitEmployeeClaim("Benefit Employee Claim") BenefitEmployeeClaim) {\n  if(BenefitEmployeeClaim.benefit == "TH_DEN_004" && addMultiple(...)) { ... }\n}`,
  },
  {
    id: 'TH-EXCRC-BE-OC-MedicalDVT_CheckCrossEntitlementAmount',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check entitlement amount of Medical cross with Dental Reimbursement (Part of Medical) for DVT of Ex-CRC.',
    scenario: 'DVT Ex-CRC cross-entitlement medical vs dental',
    lastModified: '2022-12-20',
    dslBody: `rule(core_java:SystemContext("Context") context, go_mdf:BenefitEmployeeClaim("Benefit Employee Claim") BenefitEmployeeClaim) {\n  if(BenefitEmployeeClaim.benefit == "TH_MED_005" && ...) { ... }\n}`,
  },
  {
    id: 'TH-EXCRC-BE-OVL-DentalDVT_CheckCrossEntitlementAmount',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Validate entitlement amount of Dental (Part of Medical) cross with Medical Reimbursement for DVT of Ex-C.',
    scenario: 'DVT Ex-C overlap validation dental',
    lastModified: '2022-12-20',
    dslBody: `rule(core_java:SystemContext("Context") context, go_mdf:BenefitEmployeeClaim("Benefit Employee Claim") BenefitEmployeeClaim) {\n  // OVL variant — validates overlap cross-entitlement\n}`,
  },
  {
    id: 'TH-EXCRC-BE-OVL-MedicalDVT_CheckCrossEntitlementAmount',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Validate entitlement amount of Medical cross with Dental (Part of Medical) for DVT of Ex-C.',
    scenario: 'DVT Ex-C overlap validation medical',
    lastModified: '2022-12-20',
    dslBody: `rule(core_java:SystemContext("Context") context, go_mdf:BenefitEmployeeClaim("Benefit Employee Claim") BenefitEmployeeClaim) {\n  // OVL variant — validates overlap cross-entitlement for medical\n}`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimAmountNotExceedEntitlement',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the claim amount does not exceed the remaining entitlement balance for the claim period.',
    scenario: 'General claim amount cap enforcement',
    lastModified: '2023-03-15',
    dslBody: `rule(...) {\n  if(claimAmount > remainingEntitlement) { setError("Claim exceeds entitlement"); }\n}`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimDate',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the claim date falls within the valid claim window start and end dates.',
    scenario: 'Claim date window validation',
    lastModified: '2023-01-10',
    dslBody: `rule(...) {\n  if(claimDate < claimWindowStart || claimDate > claimWindowEnd) { setError(...); }\n}`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimForDependent_DVT',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check claim for dependent eligibility for DVT employee type.',
    scenario: 'Dependent eligibility check DVT',
    lastModified: '2023-02-28',
    dslBody: `rule(...) {\n  if(employeeType == "DVT" && dependentId != null) { validateDependentRelationship(...); }\n}`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimForDependent_FullTime',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check claim for dependent eligibility for full-time employee type.',
    scenario: 'Dependent eligibility check full-time',
    lastModified: '2023-02-28',
    dslBody: `rule(...) {\n  if(employeeType == "FullTime" && dependentId != null) { validateDependentRelationship(...); }\n}`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimNoOfTransaction_DVT',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check the number of claim transactions does not exceed the allowed limit for DVT employees.',
    scenario: 'Transaction count cap DVT',
    lastModified: '2023-04-01',
    dslBody: `rule(...) {\n  if(noOfClaimTransactions > maxTransactionLimit) { setError(...); }\n}`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimNoOfTransaction_FullTime',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check the number of claim transactions does not exceed the allowed limit for full-time employees.',
    scenario: 'Transaction count cap full-time',
    lastModified: '2023-04-01',
    dslBody: `rule(...) {\n  if(noOfClaimTransactions > maxTransactionLimit) { setError(...); }\n}`,
  },
  {
    id: 'TH-XXX-BE-OC-Dental_CheckCrossEntitlementAmount',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check cross-entitlement amount between dental and medical for standard employees.',
    scenario: 'Cross-entitlement dental/medical standard',
    lastModified: '2022-11-01',
    dslBody: `rule(...) { if(benefit == "TH_DEN_001" && ...) { checkCross(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-Medical_CheckCrossEntitlementAmount',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check cross-entitlement amount between medical and dental for standard employees.',
    scenario: 'Cross-entitlement medical/dental standard',
    lastModified: '2022-11-01',
    dslBody: `rule(...) { if(benefit == "TH_MED_001" && ...) { checkCross(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckReceiptDate',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the receipt date is not in the future and is within the valid claim period.',
    lastModified: '2023-01-15',
    dslBody: `rule(...) { if(receiptDate > today()) { setError("Receipt date cannot be in the future"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckHospitalType',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check the hospital type matches the allowed hospital network for IPD claims.',
    scenario: 'Hospital network validation IPD',
    lastModified: '2023-05-10',
    dslBody: `rule(...) { if(claimType == "IPD" && !isApprovedHospital(hospitalId)) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckDependentEntitlement',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check dependent-specific entitlement amount and claim limit per dependent.',
    scenario: 'Per-dependent entitlement cap',
    lastModified: '2023-06-01',
    dslBody: `rule(...) { if(cust_amountUsedperDep > cust_entitlementAmountperDep) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckDentalSubLimit',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check dental sub-limit within the overall medical entitlement.',
    lastModified: '2023-03-01',
    dslBody: `rule(...) { if(dentalAccumulated + claimAmount > dentalSubLimit) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckPhysicalCheckupOnce',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that physical checkup benefit is claimed only once per year.',
    lastModified: '2023-02-01',
    dslBody: `rule(...) { if(yearlyClaimCount(benefit) >= 1) { setError("Physical checkup can only be claimed once per year"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckGasolineMonthlyLimit',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that gasoline claim does not exceed the monthly limit per zone.',
    scenario: 'Monthly gasoline cap by zone',
    lastModified: '2023-07-01',
    dslBody: `rule(...) { if(monthlyGasolineClaimed + claimAmount > zoneMonthlyLimit) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OS-AssignClaimWorkflowId',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Assign the appropriate workflow ID to the benefit employee claim based on claim type.',
    lastModified: '2023-01-05',
    dslBody: `rule(...) { BenefitEmployeeClaim.workflow = lookupWorkflow(BenefitEmployeeClaim.benefit, BenefitEmployeeClaim.claimType); }`,
  },
  {
    id: 'TH-XXX-BE-OS-AssignCurrency',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Assign the default currency (THB) to the benefit employee claim.',
    lastModified: '2022-10-01',
    dslBody: `rule(...) { BenefitEmployeeClaim.currency = "THB"; }`,
  },
  {
    id: 'TH-XXX-BE-OS-AssignClaimPeriod',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Assign the claim window start and end dates based on the benefit schedule period.',
    lastModified: '2023-01-10',
    dslBody: `rule(...) { BenefitEmployeeClaim.claimWindowStart = ...; BenefitEmployeeClaim.claimWindowEnd = ...; }`,
  },
  {
    id: 'TH-XXX-BE-OS-AssignEntitlementAmount',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Assign the entitlement amount to the claim based on the linked benefit plan.',
    lastModified: '2023-02-15',
    dslBody: `rule(...) { BenefitEmployeeClaim.entitlementAmount = lookup(benefit.entitlementAmount, workerId); }`,
  },
  {
    id: 'TH-XXX-BE-OS-SetClaimStatus_Pending',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Set the initial claim status to Pending when submitted.',
    lastModified: '2022-09-01',
    dslBody: `rule(...) { if(event == "Submit") { BenefitEmployeeClaim.status = "Pending"; } }`,
  },
  {
    id: 'TH-XXX-BE-OS-SetClaimStatus_Approved',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Set claim status to Approved after all approval stages pass.',
    lastModified: '2022-09-01',
    dslBody: `rule(...) { if(allApproved()) { BenefitEmployeeClaim.status = "Approved"; } }`,
  },
  {
    id: 'TH-XXX-BE-OS-SetClaimStatus_Rejected',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Set claim status to Rejected if any approver rejects.',
    lastModified: '2022-09-01',
    dslBody: `rule(...) { if(anyRejected()) { BenefitEmployeeClaim.status = "Rejected"; } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimEligibility_PassProbation',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the employee has passed the probation period before submitting a benefit claim.',
    lastModified: '2023-04-15',
    dslBody: `rule(...) { if(!passedProbation(workerId)) { setError("Must pass probation to claim benefits"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimEligibility_ActiveStatus',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the employee is in active employment status at the time of claim.',
    lastModified: '2023-04-15',
    dslBody: `rule(...) { if(empStatus != "Active") { setError("Employee must be active to claim"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-ValidateReceiptAmount',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Validate that receipt amount is positive and matches the attached document.',
    lastModified: '2023-05-01',
    dslBody: `rule(...) { if(cust_receiptAmount <= 0) { setError("Receipt amount must be positive"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckFuneralClaimRelationship',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check the relationship proof for funeral assistance claims requiring dependent.',
    lastModified: '2023-06-15',
    dslBody: `rule(...) { if(benefit in FUNERAL_BENEFITS && !hasRelationshipProof()) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckChildBirthClaimOnce',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that child birth benefit is claimed only once per child.',
    lastModified: '2023-07-01',
    dslBody: `rule(...) { if(alreadyClaimed(benefit, childId)) { setError("Child birth benefit can only be claimed once per child"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckIPDReferralRequired',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that a referral letter is attached for IPD-with-referral claims.',
    lastModified: '2023-03-20',
    dslBody: `rule(...) { if(benefit == "TH_MED_002" && !hasReferralDoc()) { setError("Referral letter required for IPD with referral"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-ValidateTripReportForGasoline',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Validate that a trip report is attached for gasoline reimbursement claims.',
    lastModified: '2023-07-10',
    dslBody: `rule(...) { if(benefit == "TH_GAS_001" && !hasTripReport()) { setError("Trip report required for gasoline claims"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckMedicalCertRequired',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that a medical certificate is attached for OPD and IPD self-paid claims.',
    lastModified: '2023-02-10',
    dslBody: `rule(...) { if(benefit in [TH_MED_001, TH_MED_003] && !hasMedCert()) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckDentistCertRequired',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that a dentist certificate is attached for dental claims.',
    lastModified: '2023-02-10',
    dslBody: `rule(...) { if(benefit == "TH_DEN_001" && !hasDentistCert()) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckCheckupReceiptRequired',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that receipt and checkup result are attached for physical checkup claims.',
    lastModified: '2023-02-10',
    dslBody: `rule(...) { if(benefit in PHY_BENEFITS && (!hasReceipt() || !hasCheckupResult())) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimWithinEmploymentPeriod',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the claim date is within the employee employment effective period.',
    lastModified: '2023-08-01',
    dslBody: `rule(...) { if(claimDate < hireDate || claimDate > terminationDate) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckGasAllowanceZone',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the employee is assigned to a zone eligible for gasoline allowance.',
    scenario: 'Zone eligibility for gasoline',
    lastModified: '2023-07-15',
    dslBody: `rule(...) { if(!isGasEligibleZone(empZone)) { setError("Not eligible for gasoline in this zone"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckParkingGradeEligible',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the employee grade is M3 or above for parking reimbursement.',
    lastModified: '2023-07-15',
    dslBody: `rule(...) { if(gradeLevel < "M3") { setError("Parking reimbursement requires grade M3 or above"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckTollLinkedGas',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that toll claims are linked to an active gasoline allowance entitlement.',
    lastModified: '2023-07-20',
    dslBody: `rule(...) { if(benefit == "TH_TOL_001" && !hasActiveGasEntitlement(workerId)) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckClaimCurrency',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that the claim currency matches the benefit plan currency (THB).',
    lastModified: '2022-11-01',
    dslBody: `rule(...) { if(currency != "THB") { setError("Claim currency must be THB"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckSummaryTreatmentDoc',
    baseObject: 'BenefitEmployeeClaim',
    description: 'Check that a treatment summary document is attached for IPD self-paid claims.',
    lastModified: '2023-03-10',
    dslBody: `rule(...) { if(benefit == "TH_MED_003" && !hasTreatmentSummary()) { setError(...); } }`,
  },

  // ── BenefitInsurancePlan — 16 rules ──────────────────────────────────────

  {
    id: 'TH-XXX-BE-ELIG-AccidentalInsuranceCMG',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check eligibility condition of Accidental Insurance (CMG Policy) — check with pass probation date.',
    scenario: 'CMG accidental insurance eligibility',
    lastModified: '2023-01-15',
    dslBody: `rule(...) { if(!passedProbation(workerId)) { setIneligible("Must pass probation for CMG accidental insurance"); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-AccidentalInsuranceCPN',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check eligibility condition of Accidental Insurance (CPN Policy) — check with hire date.',
    scenario: 'CPN accidental insurance eligibility',
    lastModified: '2023-01-15',
    dslBody: `rule(...) { if(hireDate == null) { setIneligible(...); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-GroupInsuranceCriticalIllnessCPN',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check eligibility condition of Group Insurance — Critical Illness (CPN Policy) — check with hire date.',
    scenario: 'CPN critical illness eligibility',
    lastModified: '2023-01-15',
    dslBody: `rule(...) { if(!isRegularEmployee(workerId)) { setIneligible(...); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-GroupInsuranceCriticalIllnessCMG',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check eligibility condition of Group Insurance — Critical Illness (CMG Policy) — check with hire date.',
    scenario: 'CMG critical illness eligibility',
    lastModified: '2023-01-15',
    dslBody: `rule(...) { if(!isRegularEmployee(workerId)) { setIneligible(...); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-GroupInsuranceLifeCMG',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check eligibility condition of Group Life Insurance (CMG Policy) — check with probation.',
    lastModified: '2023-02-01',
    dslBody: `rule(...) { if(!passedProbation(workerId)) { setIneligible(...); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-GroupInsuranceLifeCPN',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check eligibility condition of Group Life Insurance (CPN Policy) — check with hire date.',
    lastModified: '2023-02-01',
    dslBody: `rule(...) { if(monthsEmployed(workerId) < 3) { setIneligible(...); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-GroupInsuranceHealthCMG',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check eligibility condition of Group Health Insurance (CMG Policy).',
    lastModified: '2023-02-15',
    dslBody: `rule(...) { if(!passedProbation(workerId)) { setIneligible(...); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-GroupInsuranceHealthCPN',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check eligibility condition of Group Health Insurance (CPN Policy).',
    lastModified: '2023-02-15',
    dslBody: `rule(...) { if(!isRegularEmployee(workerId)) { setIneligible(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OS-AssignInsurancePlanCMG',
    baseObject: 'BenefitInsurancePlan',
    description: 'Assign the default CMG insurance plan based on employee grade and company.',
    lastModified: '2023-03-01',
    dslBody: `rule(...) { plan = lookupInsurancePlan("CMG", grade, company); }`,
  },
  {
    id: 'TH-XXX-BE-OS-AssignInsurancePlanCPN',
    baseObject: 'BenefitInsurancePlan',
    description: 'Assign the default CPN insurance plan based on employee grade and company.',
    lastModified: '2023-03-01',
    dslBody: `rule(...) { plan = lookupInsurancePlan("CPN", grade, company); }`,
  },
  {
    id: 'TH-XXX-BE-OS-SetInsurancePlanEffectiveDate',
    baseObject: 'BenefitInsurancePlan',
    description: 'Set the insurance plan effective start date based on enrollment event or hire date.',
    lastModified: '2023-04-01',
    dslBody: `rule(...) { effectiveStartDate = max(hireDate, enrollmentDate); }`,
  },
  {
    id: 'TH-XXX-BE-OC-ValidateInsurancePlanCoverage',
    baseObject: 'BenefitInsurancePlan',
    description: 'Validate that the selected insurance plan coverage type matches the employee category.',
    lastModified: '2023-05-01',
    dslBody: `rule(...) { if(!coverageMatchesCategory(planId, empCategory)) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckInsurancePlanNotExpired',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check that the insurance plan has not passed its effective end date.',
    lastModified: '2023-05-15',
    dslBody: `rule(...) { if(today() > effectiveEndDate) { setError("Insurance plan has expired"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckInsurancePremiumType',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check that the premium type is valid for the employee employment type.',
    lastModified: '2023-06-01',
    dslBody: `rule(...) { if(!isValidPremiumType(premiumType, empType)) { setError(...); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckInsurancePlanProvider',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check that the insurance provider is active and on the approved vendor list.',
    lastModified: '2023-06-15',
    dslBody: `rule(...) { if(!isApprovedProvider(provider)) { setError("Insurance provider not approved"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckInsuranceDependentEnrollment',
    baseObject: 'BenefitInsurancePlan',
    description: 'Check that dependent enrollment for group insurance follows the allowed enrollee options.',
    lastModified: '2023-07-01',
    dslBody: `rule(...) { if(hasDependent && !isEnrolleeOptionAllowed("Dependent", planId)) { setError(...); } }`,
  },

  // ── Benefit — 16 rules ────────────────────────────────────────────────────

  {
    id: 'TH-XXX-BE-ELIG-General_DVT',
    baseObject: 'Benefit',
    description: 'Check general eligibility condition for DVT employee.',
    scenario: 'DVT general eligibility',
    lastModified: '2023-01-20',
    dslBody: `rule(...) { if(employeeType != "DVT") { setIneligible("Benefit is for DVT employees only"); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-General_FullTime-Excl*1_EnrollRequired',
    baseObject: 'Benefit',
    description: 'Check general eligibility condition; employee can view after enrollment. Exclude CFR Tops SKT, PG8-9, Hire >= 01/07/2017.',
    scenario: 'Full-time eligibility with enrollment requirement and exclusions',
    lastModified: '2023-02-15',
    dslBody: `rule(...) {\n  if(isExcluded(workerId, ["CFR_TOPS_SKT", "PG8", "PG9"]) && hireDate >= "2017-07-01") {\n    setIneligible(...);\n  }\n  if(!isEnrolled(workerId, benefit)) { setVisibility("Hidden"); }\n}`,
  },
  {
    id: 'TH-XXX-BE-ELIG-General_FullTime-Excl*1_ParentChild',
    baseObject: 'Benefit',
    description: 'Check general eligibility condition for Parent & Child. Exclude CFR Tops SKT, PG8-9, Hire >= 01/07/2017.',
    scenario: 'Parent/child dependent eligibility with exclusions',
    lastModified: '2023-02-15',
    dslBody: `rule(...) {\n  if(isExcluded(workerId, EXCL_LIST) && hireDate >= "2017-07-01") { setIneligible(...); }\n  validateParentChildRelationship(...);\n}`,
  },
  {
    id: 'TH-XXX-BE-ELIG-General_FullTime_M3Up',
    baseObject: 'Benefit',
    description: 'Check eligibility for benefits restricted to grade M3 and above full-time employees.',
    scenario: 'Grade M3+ eligibility',
    lastModified: '2023-03-01',
    dslBody: `rule(...) { if(gradeLevel < "M3" || empType != "FullTime") { setIneligible(...); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-General_FullTime_MinTenure1Year',
    baseObject: 'Benefit',
    description: 'Check eligibility requiring at least 1 year of tenure for full-time employees.',
    scenario: 'Min 1-year tenure eligibility',
    lastModified: '2023-03-01',
    dslBody: `rule(...) { if(yearsEmployed(workerId) < 1) { setIneligible("Requires at least 1 year of service"); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-Gasoline_ZoneEligible',
    baseObject: 'Benefit',
    description: 'Check eligibility for gasoline reimbursement based on assigned zone.',
    scenario: 'Zone-based gasoline eligibility',
    lastModified: '2023-07-01',
    dslBody: `rule(...) { if(!isGasEligibleZone(empZone)) { setIneligible("Not in gas-eligible zone"); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-Toll_LinkedGas',
    baseObject: 'Benefit',
    description: 'Check eligibility for toll reimbursement — linked to gasoline allowance entitlement.',
    lastModified: '2023-07-01',
    dslBody: `rule(...) { if(!hasGasolineEntitlement(workerId)) { setIneligible("Toll requires gasoline entitlement"); } }`,
  },
  {
    id: 'TH-XXX-BE-ELIG-Parking_GradeM3Up',
    baseObject: 'Benefit',
    description: 'Check eligibility for parking reimbursement — grade M3 and above only.',
    lastModified: '2023-07-01',
    dslBody: `rule(...) { if(gradeLevel < "M3") { setIneligible("Parking requires grade M3 or above"); } }`,
  },
  {
    id: 'TH-XXX-BE-OS-AssignBenefitProgram',
    baseObject: 'Benefit',
    description: 'Assign the benefit program based on the benefit type and employee company.',
    lastModified: '2023-01-10',
    dslBody: `rule(...) { benefit.benefitProgram = lookupProgram(benefit.benefitType, emp.company); }`,
  },
  {
    id: 'TH-XXX-BE-OS-SetBenefitEffectiveDate',
    baseObject: 'Benefit',
    description: 'Set the benefit effective start date when the benefit is activated for an employee.',
    lastModified: '2023-01-10',
    dslBody: `rule(...) { benefit.effectiveStartDate = max(hireDate, programStartDate); }`,
  },
  {
    id: 'TH-XXX-BE-OS-SetBenefitFrequency',
    baseObject: 'Benefit',
    description: 'Set the claim frequency period (Annual/Monthly) based on benefit type.',
    lastModified: '2023-02-01',
    dslBody: `rule(...) { benefit.frequency = lookupFrequency(benefit.benefitType); }`,
  },
  {
    id: 'TH-XXX-BE-OS-AssignPayrollIntegrationMode',
    baseObject: 'Benefit',
    description: 'Assign the payroll integration mode (IT0015/IT0267) based on benefit taxation mode.',
    lastModified: '2023-04-01',
    dslBody: `rule(...) { benefit.payrollIntegration = benefit.taxationMode == "Taxable" ? "IT0267" : "IT0015"; }`,
  },
  {
    id: 'TH-XXX-BE-OC-ValidateBenefitCurrency',
    baseObject: 'Benefit',
    description: 'Validate that benefit currency is set to THB for Thailand benefits.',
    lastModified: '2023-01-01',
    dslBody: `rule(...) { if(benefit.currency != "THB") { setError("Benefit currency must be THB"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckBalanceCarryForwardCap',
    baseObject: 'Benefit',
    description: 'Check that the balance carry-forward amount does not exceed the configured cap amount.',
    lastModified: '2023-06-01',
    dslBody: `rule(...) { if(carryForwardAmount > capAmount) { setError("Carry-forward exceeds cap"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-CheckEnrollmentRequired',
    baseObject: 'Benefit',
    description: 'Check that the employee has completed enrollment when the benefit requires it.',
    lastModified: '2023-03-15',
    dslBody: `rule(...) { if(benefit.enrollmentRequired && !isEnrolled(workerId)) { setError("Enrollment required before claiming"); } }`,
  },
  {
    id: 'TH-XXX-BE-OC-ValidateEntitlementAmount',
    baseObject: 'Benefit',
    description: 'Validate that entitlement amount is positive and within plan limits.',
    lastModified: '2023-02-20',
    dslBody: `rule(...) { if(benefit.entitlementAmount != null && benefit.entitlementAmount <= 0) { setError("Entitlement amount must be positive"); } }`,
  },

  // ── cust_BE_BenefitSpecialPrivilegeDetail — 2 rules ──────────────────────

  {
    id: 'TH-XXX-BE-OC-BESpecialPrivilegeDetail_AssignInsurancePlan',
    baseObject: 'cust_BE_BenefitSpecialPrivilegeDetail',
    description: 'Assign the default insurance plan in Benefit Special Privilege Detail for auto enrollment.',
    lastModified: '2023-05-01',
    dslBody: `rule(...) { spd.insurancePlan = lookupDefaultPlan(workerId, spd.privilegeType); }`,
  },
  {
    id: 'TH-XXX-BE-OS-BESpecialPrivilegeDetail_AssignPeriodDate',
    baseObject: 'cust_BE_BenefitSpecialPrivilegeDetail',
    description: 'Assign user, enrollment date, and claim date in Benefit Special Privilege Detail.',
    lastModified: '2023-05-01',
    dslBody: `rule(...) { spd.userId = workerId; spd.enrollmentDate = today(); spd.claimDate = spd.enrollmentDate; }`,
  },

  // ── BenefitExceptionDetails — 1 rule ─────────────────────────────────────

  {
    id: 'TH-XXX-BE-OS-BEExceptionDetail_AssignData',
    baseObject: 'BenefitExceptionDetails',
    description: 'Assign additional data in Benefit Exception Detail when an exception workflow is triggered.',
    lastModified: '2023-06-01',
    dslBody: `rule(...) { exception.assignedTo = lookupExceptionHandler(benefit, empType); exception.createdDate = today(); }`,
  },
];

/** O(1) lookup by rule id. */
const RULE_BY_ID = new Map(BENEFIT_RULES_REGISTRY.map((r) => [r.id, r]));

export function getRule(id: string): BenefitRule | undefined {
  return RULE_BY_ID.get(id);
}

export function getRulesByBaseObject(baseObject: BenefitRuleBaseObject): BenefitRule[] {
  return BENEFIT_RULES_REGISTRY.filter((r) => r.baseObject === baseObject);
}

export const RULE_BASE_OBJECTS: BenefitRuleBaseObject[] = [
  'BenefitEmployeeClaim',
  'BenefitInsurancePlan',
  'Benefit',
  'cust_BE_BenefitSpecialPrivilegeDetail',
  'BenefitExceptionDetails',
];
