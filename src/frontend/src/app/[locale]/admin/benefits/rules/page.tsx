import { getTranslations } from 'next-intl/server';
import { BenefitRulesViewer } from '@/components/benefits/BenefitRulesViewer';

interface PageProps {
  searchParams: Promise<{ rule?: string }>;
}

export default async function BenefitRulesPage({ searchParams }: PageProps) {
  const t = await getTranslations('admin_benefits_rules');
  const { rule: highlightRuleId } = await searchParams;

  return (
    <BenefitRulesViewer
      highlightRuleId={highlightRuleId}
      t={{
        eyebrow: t('eyebrow'),
        title: t('title'),
        subtitle: t('subtitle'),
        groupBenefitEmployeeClaim: t('groupBenefitEmployeeClaim'),
        groupBenefitInsurancePlan: t('groupBenefitInsurancePlan'),
        groupBenefit: t('groupBenefit'),
        groupSpecialPrivilege: t('groupSpecialPrivilege'),
        groupExceptionDetails: t('groupExceptionDetails'),
        colCode: t('colCode'),
        colDescription: t('colDescription'),
        colLastModified: t('colLastModified'),
        detailCode: t('detailCode'),
        detailDescription: t('detailDescription'),
        detailScenario: t('detailScenario'),
        detailLastModified: t('detailLastModified'),
        detailBaseObject: t('detailBaseObject'),
        viewDsl: t('viewDsl'),
        hideDsl: t('hideDsl'),
        noRules: t('noRules'),
        eligibilityRule: t('eligibilityRule'),
        viewRule: t('viewRule'),
      }}
    />
  );
}
