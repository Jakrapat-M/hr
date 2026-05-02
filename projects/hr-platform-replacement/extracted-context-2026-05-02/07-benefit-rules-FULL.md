# SF Benefit Business Rules — 76 rules across Benefit entities

## By base object

- **`BenefitEmployeeClaim`** — 41 rules
  - `TH-EXCRC-BE-OC-DentalDVT_CheckCrossEntitlementAmount` — This rule is to check entitlement amount of Dental (Part of Medical) cross with Medical Reimbursement for DVT of Ex-CRC.
  - `TH-EXCRC-BE-OC-MedicalDVT_CheckCrossEntitlementAmount` — This rule is to check entitlement amount of Medical cross with Dental Reimbursement (Part of Medical) for DVT of Ex-CRC.
  - `TH-EXCRC-BE-OVL-DentalDVT_CheckCrossEntitlementAmount` — This rule is to validate entitlement amount of Dental (Part of Medical) cross with Medical Reimbursement for DVT of Ex-C
- **`BenefitInsurancePlan`** — 16 rules
  - `TH-XXX-BE-ELIG-AccidentalInsuranceCMG` — This rule is to check eligibility condition of Accidental Insurance (CMG Policy) (check with pass probation date).
  - `TH-XXX-BE-ELIG-AccidentalInsuranceCPN` — This rule is to check eligibility condition of Accidental Insurance - ประกันเสี่ยงภัย (CPN Policy) (check with hire date
  - `TH-XXX-BE-ELIG-GroupInsuranceCriticalIllnessCPN` — This rule is to check eligibility condition of Group Insurance - ประกันโรคร้าย (CPN Policy) (check with hire date).
- **`Benefit`** — 16 rules
  - `TH-XXX-BE-ELIG-General_DVT` — This rule is to check general eligibility condition for DVT employee.
  - `TH-XXX-BE-ELIG-General_FullTime-Excl*1_EnrollRequired` — This rule is to check general eligibility condition, emp can view after enroll. Exclude *1 CFR Tops SKT,PG8-9,Hire>=01/0
  - `TH-XXX-BE-ELIG-General_FullTime-Excl*1_ParentChild` — This rule is to check general eligibility condition for Parent&Child. Exclude *1 CFR Tops SKT,PG8-9,Hire>=01/07/2017.
- **`cust_BE_BenefitSpecialPrivilegeDetail`** — 2 rules
  - `TH-XXX-BE-OC-BESpecialPrivilegeDetail_AssignInsurancePlan` — This rule is to assign the default insurance plan in Benefit Special Privilege Detail for auto enrollment.
  - `TH-XXX-BE-OS-BESpecialPrivilegeDetail_AssignPeriodDate` — This rule is to assign user, enrollment date, claim date in Benefit Special Privilege Detail.
- **`BenefitExceptionDetails`** — 1 rules
  - `TH-XXX-BE-OS-BEExceptionDetail_AssignData` — This rule is to assign additoinal data in Benefit Exception Detail.

## Sample full rule (DSL body)

```json
{
  "code": "TH-EXCRC-BE-OC-DentalDVT_CheckCrossEntitlementAmount",
  "effectiveStartDate": "/Date(-2208988800000)/",
  "effectiveEndDate": "/Date(253402214400000)/",
  "lastModifiedDateTime": "/Date(1671507776000+0000)/",
  "mdfSystemCreatedBy": "POIT01",
  "lastModifiedDate": "/Date(1671507776000)/",
  "lastModifiedBy": "v4admin",
  "description": "This rule is to check entitlement amount of Dental (Part of Medical) cross with Medical Reimbursement for DVT of Ex-CRC.",
  "scenarioAttributeValues": null,
  "ruleType": "Benefits",
  "name": "TH-EXCRC-BE-OC-DentalDVT_CheckCrossEntitlementAmount",
  "scenarioCode": "_basic",
  "baseObject": "BenefitEmployeeClaim",
  "internalCode": "6370615"
}
```

```
DSL body excerpt:

rule(core_java:SystemContext("Context") context,go_mdf:BenefitEmployeeClaim("Benefit Employee Claim") BenefitEmployeeClaim) {
  if(BenefitEmployeeClaim.benefit == "TH_DEN_004" && addMultiple(number:[treatedNullAs(number:lookup("BenefitClaimAccumulation","accumulatedAmount","",["benefit","==","TH_MED_005","","","workerId","==",BenefitEmployeeClaim.workerId,"","","claimWindowStart","<=",BenefitEmployeeClaim.claimDate,"","","claimWindowEnd",">=",BenefitEmployeeClaim.claimDate,"",""]),treatedAsNum:"0"),treatedNullAs(number:lookup("BenefitClaimAccumulation","accumulatedAmount","",["benefit","==","T
```
