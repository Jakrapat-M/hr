# SF Benefit Schema — Full Field Dump

**96 Benefit-related entities** in SF QAS metadata.

## Top entity field summary

| Entity | Fields | Use |
|---|---:|---|
| `Benefit` | 80 | (see below) |
| `BenefitProgram` | 18 | (see below) |
| `BenefitInsurancePlan` | 39 | (see below) |
| `BenefitEnrollment` | 41 | (see below) |
| `BenefitEmployeeClaim` | 47 | (see below) |
| `BenefitClaimAccumulation` | 18 | (see below) |
| `BenefitAutomaticActionConfiguration` | 12 | (see below) |
| `BenefitBalanceCarryForward` | 11 | (see below) |
| `BenefitEnrollmentProcessScreenTemplate` | 53 | (see below) |

## Benefit — 80 fields
| Field | Type | Nullable |
|---|---|---|
| `ageOfRetirement` | Decimal | ✓ |
| `balanceCarryForward` | Boolean | ✓ |
| `bandingsConfiguration` | String | ✓ |
| `benefitEntityID` | String | ✓ |
| `benefitId` | String | ✓ |
| `benefitName` | String | ✓ |
| `benefitProgram` | String | ✓ |
| `benefitSavingsPlanSubType` | String | ✓ |
| `benefitSchedule` | String | ✓ |
| `benefitShortDescription` | String | ✓ |
| `benefitSpecific` | String | ✓ |
| `benefitType` | String | ✓ |
| `bothBalanceCarryForwardParametersPresent` | Boolean | ✓ |
| `carryForwardEnrollment` | Boolean | ✓ |
| `claim` | String | ✓ |
| `claimDetail` | String | ✓ |
| `claimDetailRequired` | Boolean | ✓ |
| `claimScreenID` | String | ✓ |
| `claimsLimitPerFrequencyPeriod` | Int64 | ✓ |
| `conversionFactor` | Decimal | ✓ |
| `country` | String | ✓ |
| `coverage` | String | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `creditPoints` | Decimal | ✓ |
| `currency` | String | ✓ |
| `cust_claimFor` | String | ✓ |
| `decimalPrecisionSettingForContributionAmount` | Boolean | ✓ |
| `deductionStartDate` | String | ✓ |
| `dependentSpecificRule` | Boolean | ✓ |
| `dummyField` | String | ✓ |
| `effectiveEndDate` | DateTime | ✓ |
| `effectiveStartDate` | DateTime | ✓ |
| `eligibilityRuleId` | String | ✓ |
| `emailNotificationForEnrollment` | Boolean | ✓ |
| `employeeClaimWorkflowId` | String | ✓ |
| `employeeEnrollmentEditAllowed` | Boolean | ✓ |
| `employeeEnrollmentEditType` | String | ✓ |
| `employeeEnrollmentWorkflowId` | String | ✓ |
| `employeeWithEmployerMatchContributions` | String | ✓ |
| `enrolleeOptions` | String | ✓ |
| `enrollment` | String | ✓ |
| `enrollmentEffFromDateRule` | String | ✓ |
| `enrollmentOptOutAllowed` | String | ✓ |
| `enrollmentRequired` | Boolean | ✓ |
| `enrollmentScreenID` | String | ✓ |
| `enrollmentType` | String | ✓ |
| `entitlementAmount` | Decimal | ✓ |
| `exceedEntitlementAmount` | Boolean | ✓ |
| `exceptionWorkflowId` | String | ✓ |
| `frequency` | String | ✓ |
| `insuranceType` | String | ✓ |
| `jobEnrollmentEditAllowed` | Boolean | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `mdfSystemRecordStatus` | String | ✓ |
| `multipleFundSelectionsAllowed` | String | ✓ |
| `noOfClaimTansactions` | Int64 | ✓ |
| `noOfDependentsToConsider` | Int64 | ✓ |
| `nomineeRelevant` | Boolean | ✓ |
| `optOutWorkflowId` | String | ✓ |
| `payrollIntegration` | String | ✓ |
| `pensionContributionOptions` | String | ✓ |
| `pensionMinMaxContributionLimits` | String | ✓ |
| `pensionSchemeStartDate` | DateTime | ✓ |
| `plan` | String | ✓ |
| `qualifyingScheme` | Boolean | ✓ |
| `recordId` | String | ✓ |
| `retroCalculationMode` | String | ✓ |
| `schemeType` | String | ✓ |
| `sconNumber` | String | ✓ |
| `showRemaningNoOfDaysForClaim` | String | ✓ |
| `showRemaningNoOfDaysForEnrollment` | String | ✓ |
| `status` | String | ✓ |
| `supressClientDateValidation` | Boolean | ✓ |
| `taxationMode` | String | ✓ |
| `triggerDate` | String | ✓ |
| `typeOfPension` | String | ✓ |
| `waiveAllowed` | String | ✓ |
| `walletType` | String | ✓ |

## BenefitProgram — 18 fields
| Field | Type | Nullable |
|---|---|---|
| `amount` | Decimal | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `currency` | String | ✓ |
| `effectiveStartDate` | DateTime | ✓ |
| `eligibilityRuleId` | String | ✓ |
| `exceptionWorkflowId` | String | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `mdfSystemEffectiveEndDate` | DateTime | ✓ |
| `mdfSystemRecordStatus` | String | ✓ |
| `multipleSelectionAllowed` | Boolean | ✓ |
| `programEnrollmentWorkflowId` | String | ✓ |
| `programId` | String | ✓ |
| `programName` | String | ✓ |
| `programSchedule` | String | ✓ |
| `status` | String | ✓ |
| `supressClientDateValidation` | Boolean | ✓ |

## BenefitInsurancePlan — 39 fields
| Field | Type | Nullable |
|---|---|---|
| `country` | String | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `effectiveStartDate` | DateTime | ✓ |
| `eligibilityRuleForCoverage` | String | ✓ |
| `employeeContribution` | String | ✓ |
| `employerContribution` | String | ✓ |
| `eoiCoverageRule` | String | ✓ |
| `eoiHelpText_defaultValue` | String | ✓ |
| `eoiHelpText_en_DEBUG` | String | ✓ |
| `eoiHelpText_en_GB` | String | ✓ |
| `eoiHelpText_en_US` | String | ✓ |
| `eoiHelpText_localized` | String | ✓ |
| `eoiHelpText_th_TH` | String | ✓ |
| `eoiHelpText_vi_VN` | String | ✓ |
| `evidenceOfInsurability` | String | ✓ |
| `frequency` | String | ✓ |
| `id` | String | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `mdfSystemEffectiveEndDate` | DateTime | ✓ |
| `mdfSystemRecordStatus` | String | ✓ |
| `planDescription_defaultValue` | String | ✓ |
| `planDescription_en_DEBUG` | String | ✓ |
| `planDescription_en_GB` | String | ✓ |
| `planDescription_en_US` | String | ✓ |
| `planDescription_localized` | String | ✓ |
| `planDescription_th_TH` | String | ✓ |
| `planDescription_vi_VN` | String | ✓ |
| `planName_defaultValue` | String | ✓ |
| `planName_en_DEBUG` | String | ✓ |
| `planName_en_GB` | String | ✓ |
| `planName_en_US` | String | ✓ |
| `planName_localized` | String | ✓ |
| `planName_th_TH` | String | ✓ |
| `planName_vi_VN` | String | ✓ |
| `premiumType` | String | ✓ |
| `provider` | String | ✓ |
| `recordId` | String | ✓ |

## BenefitEnrollment — 41 fields
| Field | Type | Nullable |
|---|---|---|
| `amount` | Decimal | ✓ |
| `amountFromWallet` | Decimal | ✓ |
| `benefit` | String | ✓ |
| `benefitDataSource` | String | ✓ |
| `benefitDataSourceWithExternalCode` | String | ✓ |
| `benefitEnrollmentEntityID` | String | ✓ |
| `benefitEntitlementAmount` | Decimal | ✓ |
| `benefitPaymentOption` | String | ✓ |
| `benefitProgram` | String | ✓ |
| `compensationAdjustmentUntil` | DateTime | ✓ |
| `compensationId` | Int64 | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `creditPointsFromWallet` | Decimal | ✓ |
| `currency` | String | ✓ |
| `deductionStartDate` | DateTime | ✓ |
| `effectiveEndDate` | DateTime | ✓ |
| `effectiveStartDate` | DateTime | ✓ |
| `effectiveStatus` | String | ✓ |
| `eligibleWallet` | String | ✓ |
| `eligibleWalletAmount` | Decimal | ✓ |
| `eligibleWalletCredits` | Decimal | ✓ |
| `eligibleWalletWithDataSource` | String | ✓ |
| `enrollmentContext` | String | ✓ |
| `enrollmentDate` | DateTime | ✓ |
| `exception` | String | ✓ |
| `externalName` | String | ✓ |
| `id` | String | ✓ |
| `isDedStartDateCalculated` | Boolean | ✓ |
| `isOptOutEvent` | Boolean | ✓ |
| `isTriggeredEvent` | Boolean | ✓ |
| `jobRunDate` | DateTime | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `previousEnrollmentId` | String | ✓ |
| `recordId` | String | ✓ |
| `recordStatus` | String | ✓ |
| `retirementDate` | DateTime | ✓ |
| `schedulePeriod` | String | ✓ |
| `walletConsumedTill` | DateTime | ✓ |
| `workerId` | String | ✓ |

## BenefitEmployeeClaim — 47 fields
| Field | Type | Nullable |
|---|---|---|
| `benefit` | String | ✓ |
| `benefitClaimEntityID` | String | ✓ |
| `benefitDataSource` | String | ✓ |
| `benefitDataSourceWithExternalCode` | String | ✓ |
| `benefitProgram` | String | ✓ |
| `byPassWorkflow` | Boolean | ✓ |
| `claimDate` | DateTime | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `currency` | String | ✓ |
| `cust_COVIDDetails` | String | ✓ |
| `cust_TrackingNo` | String | ✓ |
| `cust_Type` | String | ✓ |
| `cust_admittedEnd` | DateTime | ✓ |
| `cust_admittedStart` | DateTime | ✓ |
| `cust_amountUsedperDep` | Decimal | ✓ |
| `cust_causeOfDeath` | String | ✓ |
| `cust_dentalDetails` | String | ✓ |
| `cust_dependent` | String | ✓ |
| `cust_diseaseDetails` | String | ✓ |
| `cust_educationLevel` | String | ✓ |
| `cust_entitlementAmountperDep` | Decimal | ✓ |
| `cust_hospitalName` | String | ✓ |
| `cust_medicalDental` | String | ✓ |
| `cust_onDuty` | String | ✓ |
| `cust_opdIPD` | String | ✓ |
| `cust_paidtoVendor` | String | ✓ |
| `cust_receiptAmount` | Decimal | ✓ |
| `cust_receiptDate` | DateTime | ✓ |
| `cust_receiptNo` | String | ✓ |
| `cust_scheduleClaimEnd` | DateTime | ✓ |
| `cust_scheduleClaimStart` | DateTime | ✓ |
| `cust_seq` | Int64 | ✓ |
| `cust_typeOfHospital` | String | ✓ |
| `entitlementAmount` | Decimal | ✓ |
| `exception` | String | ✓ |
| `externalName` | String | ✓ |
| `id` | String | ✓ |
| `isTotalAmountReadOnly` | String | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `nrpId` | Int64 | ✓ |
| `recordStatus` | String | ✓ |
| `remarks` | String | ✓ |
| `status` | String | ✓ |
| `totalAmount` | Decimal | ✓ |
| `workerId` | String | ✓ |

## BenefitClaimAccumulation — 18 fields
| Field | Type | Nullable |
|---|---|---|
| `accumulatedAmount` | Decimal | ✓ |
| `accumulatedCredits` | Decimal | ✓ |
| `balanceCarryForwardAmount` | Decimal | ✓ |
| `balanceCredits` | Decimal | ✓ |
| `benefit` | String | ✓ |
| `claimWindowEnd` | DateTime | ✓ |
| `claimWindowStart` | DateTime | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `currency` | String | ✓ |
| `exception` | String | ✓ |
| `externalCode` | Int64 | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `mdfSystemRecordStatus` | String | ✓ |
| `remainingAmount` | Decimal | ✓ |
| `schedulePeriod` | String | ✓ |
| `workerId` | String | ✓ |

## BenefitAutomaticActionConfiguration — 12 fields
| Field | Type | Nullable |
|---|---|---|
| `BenefitLifeEventConfiguration_configurationId` | String | ✓ |
| `BenefitLifeEventConfiguration_effectiveStartDate` | DateTime | ✓ |
| `actionFor` | String | ✓ |
| `benefit` | String | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `deductionEffectiveDateRule` | String | ✓ |
| `effectiveDateRule` | String | ✓ |
| `id` | String | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `mdfSystemRecordStatus` | String | ✓ |

## BenefitBalanceCarryForward — 11 fields
| Field | Type | Nullable |
|---|---|---|
| `Benefit_benefitId` | String | ✓ |
| `Benefit_effectiveStartDate` | DateTime | ✓ |
| `balanceCarryForwardUptoNoOfSchedulePeriods` | Int64 | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `externalCode` | Int64 | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `maximumBalanceCarryForwardAmount` | Decimal | ✓ |
| `mdfSystemRecordStatus` | String | ✓ |
| `upperLimitOnTotalBalanceCarryForwardAmount` | Decimal | ✓ |

## BenefitEnrollmentProcessScreenTemplate — 53 fields
| Field | Type | Nullable |
|---|---|---|
| `configurationCode` | String | ✓ |
| `configurationName` | String | ✓ |
| `createdBy` | String | ✓ |
| `createdDateTime` | DateTimeOffset | ✓ |
| `effectiveFrom` | DateTime | ✓ |
| `enableTerms` | Boolean | ✓ |
| `enrollmentProcessTitle_defaultValue` | String | ✓ |
| `enrollmentProcessTitle_en_DEBUG` | String | ✓ |
| `enrollmentProcessTitle_en_GB` | String | ✓ |
| `enrollmentProcessTitle_en_US` | String | ✓ |
| `enrollmentProcessTitle_localized` | String | ✓ |
| `enrollmentProcessTitle_th_TH` | String | ✓ |
| `enrollmentProcessTitle_vi_VN` | String | ✓ |
| `familyMembersReviewDescription_defaultValue` | String | ✓ |
| `familyMembersReviewDescription_en_DEBUG` | String | ✓ |
| `familyMembersReviewDescription_en_GB` | String | ✓ |
| `familyMembersReviewDescription_en_US` | String | ✓ |
| `familyMembersReviewDescription_localized` | String | ✓ |
| `familyMembersReviewDescription_th_TH` | String | ✓ |
| `familyMembersReviewDescription_vi_VN` | String | ✓ |
| `familyMembersReviewTitle_defaultValue` | String | ✓ |
| `familyMembersReviewTitle_en_DEBUG` | String | ✓ |
| `familyMembersReviewTitle_en_GB` | String | ✓ |
| `familyMembersReviewTitle_en_US` | String | ✓ |
| `familyMembersReviewTitle_localized` | String | ✓ |
| `familyMembersReviewTitle_th_TH` | String | ✓ |
| `familyMembersReviewTitle_vi_VN` | String | ✓ |
| `introductionDescription_defaultValue` | String | ✓ |
| `introductionDescription_en_DEBUG` | String | ✓ |
| `introductionDescription_en_GB` | String | ✓ |
| `introductionDescription_en_US` | String | ✓ |
| `introductionDescription_localized` | String | ✓ |
| `introductionDescription_th_TH` | String | ✓ |
| `introductionDescription_vi_VN` | String | ✓ |
| `introductionTitle_defaultValue` | String | ✓ |
| `introductionTitle_en_DEBUG` | String | ✓ |
| `introductionTitle_en_GB` | String | ✓ |
| `introductionTitle_en_US` | String | ✓ |
| `introductionTitle_localized` | String | ✓ |
| `introductionTitle_th_TH` | String | ✓ |
| `introductionTitle_vi_VN` | String | ✓ |
| `lastModifiedBy` | String | ✓ |
| `lastModifiedDateTime` | DateTimeOffset | ✓ |
| `mdfSystemEffectiveEndDate` | DateTime | ✓ |
| `mdfSystemRecordStatus` | String | ✓ |
| `recordId` | String | ✓ |
| `termsContent_defaultValue` | String | ✓ |
| `termsContent_en_DEBUG` | String | ✓ |
| `termsContent_en_GB` | String | ✓ |
| `termsContent_en_US` | String | ✓ |
| `termsContent_localized` | String | ✓ |
| `termsContent_th_TH` | String | ✓ |
| `termsContent_vi_VN` | String | ✓ |

## Other Benefit entities (lower-priority for mockup)

| Entity | Fields |
|---|---:|
| `Background_Benefitselection` | 14 |
| `BenefitBalanceCarryForwardDetail` | 9 |
| `BenefitCompanyCar` | 14 |
| `BenefitCompanyCarAllowedModels` | 9 |
| `BenefitCompanyCarClaim` | 15 |
| `BenefitCompanyCarEnrollment` | 24 |
| `BenefitCompanyCarLeaseServiceProvider` | 10 |
| `BenefitCompanyCarRecommendedVendors` | 9 |
| `BenefitCompanyHousing` | 10 |
| `BenefitCompanyHousingEnrollment` | 16 |
| `BenefitContact` | 11 |
| `BenefitDeductibleAllowanceEnrollment` | 12 |
| `BenefitDependentDetail` | 10 |
| `BenefitDocuments` | 10 |
| `BenefitEffectiveDateConfiguration` | 11 |
| `BenefitEligibleUser` | 14 |
| `BenefitEmployeeClaimDetail` | 10 |
| `BenefitEmployeeLifeEventDeclarationForm` | 9 |
| `BenefitEmployeeOptoutRequests` | 6 |
| `BenefitEnrollmentDependencyConfiguration` | 15 |
| `BenefitEnrollmentDependencyDetails` | 13 |
| `BenefitEnrollmentGroup` | 13 |
| `BenefitEnrollmentOptoutDetails` | 16 |
| `BenefitEnrollmentProcessConfiguration` | 18 |
| `BenefitEvent` | 16 |
| `BenefitEventDetermination` | 7 |
| `BenefitEventProcessingLog` | 18 |
| `BenefitExceptionDetails` | 17 |
| `BenefitFuelReimbursement` | 9 |
| `BenefitFuelReimbursementClaimDetail` | 10 |
| `BenefitHSAEmployerContribution` | 15 |
| `BenefitHSAEmployerContributionDetail` | 14 |
| `BenefitHSAEmployerContributionTierDetail` | 10 |
| `BenefitHyperlinkConfiguration` | 16 |
| `BenefitInsuranceCoverage` | 27 |
| `BenefitInsuranceCoverageDetails` | 11 |
| `BenefitInsuranceCoverageOptions` | 9 |
| `BenefitInsuranceDependentDetail` | 16 |
| `BenefitInsuranceEnrolleeOptions` | 13 |
| `BenefitInsuranceEnrolleeType` | 10 |
| `BenefitInsurancePlanEnrollmentDetails` | 23 |
| `BenefitInsurancePlanUSA` | 21 |
| `BenefitInsuranceProvider` | 11 |
| `BenefitInsuranceRateChart` | 17 |
| `BenefitInsuranceRateChartEnrollee` | 17 |
| `BenefitInsuranceRateChartFixedAmount` | 33 |
| `BenefitLeaveTravelReimbursementClaim` | 11 |
| `BenefitLegalEntity` | 7 |
| `BenefitLifeEventConfiguration` | 14 |
| `BenefitOpenEnrollmentCycleConfiguration` | 13 |
| `BenefitOverviewHyperlinkConfiguration` | 7 |
| `BenefitOverviewHyperlinkDetails` | 16 |
| `BenefitPaymentOptions` | 10 |
| `BenefitPensionAdditionalContributionLimits` | 12 |
| `BenefitPensionAdditionalEmployeeContributionDetail` | 11 |
| `BenefitPensionDependentNominees` | 12 |
| `BenefitPensionEmployeeContributionDetail` | 15 |
| `BenefitPensionEmployerContributionDetail` | 15 |
| `BenefitPensionEnrollmentContributionDetail` | 20 |
| `BenefitPensionFund` | 13 |
| `BenefitPensionFundEnrollmentContributionDetail` | 16 |
| `BenefitPensionMinMaxContributionLimits` | 24 |
| `BenefitPensionNonDependentNominees` | 12 |
| `BenefitPensionStatutoryMinimumLookup` | 18 |
| `BenefitProgramEnrollment` | 18 |
| `BenefitProgramEnrollmentDetail` | 12 |
| `BenefitProgramExceptionDetails` | 10 |
| `BenefitSavingsPlanCatchUpDetail` | 20 |
| `BenefitSavingsPlanContingentBeneficiary` | 29 |
| `BenefitSavingsPlanERContributionConfig` | 15 |
| `BenefitSavingsPlanERContributionConfigDetail` | 11 |
| `BenefitSavingsPlanEnrollmentContributionDetail` | 21 |
| `BenefitSavingsPlanEnrollmentDetails` | 21 |
| `BenefitSavingsPlanPrimaryBeneficiary` | 29 |
| `BenefitSavingsPlanSubType` | 10 |
| `BenefitSavingsPlanSubTypeCountryLookup` | 8 |
| `BenefitSchedulePeriod` | 15 |
| `BenefitSchedules` | 7 |
| `BenefitsConfigUIScreenLookup` | 7 |
| `BenefitsConfirmationStatementConfiguration` | 9 |
| `BenefitsException` | 18 |
| `BenefitsIntegrationOneTimeInfo` | 19 |
| `BenefitsIntegrationRecurringInfo` | 21 |
| `PensionBenefitDetails` | 20 |
| `cust_BE_BenefitSpecialPrivilege` | 7 |
| `cust_BE_BenefitSpecialPrivilegeDetail` | 20 |
| `cust_BenefitEmployeeClaimTracking` | 11 |
