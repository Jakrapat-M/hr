export const BENEFIT_PROFILE_ROUTE = '/profile/me?tab=benefits';
export const BENEFIT_REFERRAL_ROUTE = '/profile/me?tab=benefits&service=referral';
export const BENEFIT_TAX_PLANNING_ROUTE = '/profile/me?tab=tax&mode=planning';
export const BENEFITS_HUB_ROUTE = '/benefits-hub';

function localizedRoute(locale: string | null | undefined, route: string) {
  return `/${locale || 'th'}${route}`;
}

export function benefitProfileRoute(locale: string | null | undefined) {
  return localizedRoute(locale, BENEFIT_PROFILE_ROUTE);
}

export function benefitReferralRoute(locale: string | null | undefined) {
  return localizedRoute(locale, BENEFIT_REFERRAL_ROUTE);
}

export function benefitTaxPlanningRoute(locale: string | null | undefined) {
  return localizedRoute(locale, BENEFIT_TAX_PLANNING_ROUTE);
}

export function benefitsHubRoute(locale: string | null | undefined) {
  return localizedRoute(locale, BENEFITS_HUB_ROUTE);
}

export function benefitReferralRoute(locale: string) {
  return `/${locale}${BENEFIT_REFERRAL_ROUTE}`;
}

export function benefitTaxPlanningRoute(locale: string) {
  return `/${locale}${BENEFIT_TAX_PLANNING_ROUTE}`;
}

export function benefitsHubRoute(locale: string) {
  return `/${locale}${BENEFITS_HUB_ROUTE}`;
}
