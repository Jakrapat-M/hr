import CnextProfileMePage from '../../me/page';

// STA-27 PR-C smoke support: SPD branch-view rows deep-link to an employee benefits URL.
// Mock profile data is still sourced from the shared demo profile surface for this iteration.
export default function ProfileEmployeeBenefitsPage() {
  return <CnextProfileMePage initialTab="benefits" />;
}
