import { EntitlementRulesManager } from './_components/EntitlementRulesManager';

export default function BenefitRulesPage() {
  return (
    <div className="space-y-6">
      <h1 className="sr-only">กฎวงเงินสิทธิ์ / Benefit Entitlement Rules</h1>
      <EntitlementRulesManager />
    </div>
  );
}
