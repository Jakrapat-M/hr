import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en/home',
        permanent: false,
      },
      // Leave family → /timeoff canonical
      { source: '/:locale(th|en)/leave', destination: '/:locale/timeoff', permanent: false },
      { source: '/:locale(th|en)/leave/request', destination: '/:locale/timeoff?tab=request', permanent: false },
      { source: '/:locale(th|en)/leave/history', destination: '/:locale/timeoff?tab=history', permanent: false },
      // Profile alt-paths → /profile/me canonical
      { source: '/:locale(th|en)/profile', destination: '/:locale/profile/me', permanent: false },
      { source: '/:locale(th|en)/ess', destination: '/:locale/profile/me', permanent: false },
      { source: '/:locale(th|en)/ess/profile', destination: '/:locale/profile/me', permanent: false },
      // Payroll flat → nested
      { source: '/:locale(th|en)/payroll-processing', destination: '/:locale/payroll/processing', permanent: false },
      { source: '/:locale(th|en)/payroll-setup', destination: '/:locale/payroll/setup', permanent: false },
      // Recruitment → recruiting (sidebar canonical)
      { source: '/:locale(th|en)/recruitment', destination: '/:locale/recruiting', permanent: false },
      // Reports satellites → main reports (or admin/system/reports for gov)
      { source: '/:locale(th|en)/government-reports', destination: '/:locale/admin/system/reports', permanent: false },
      { source: '/:locale(th|en)/hrbp-reports', destination: '/:locale/reports?scope=hrbp', permanent: false },
      // Hire / onboarding
      { source: '/:locale(th|en)/onboarding', destination: '/:locale/admin/hire', permanent: false },
      // Promotion → pay-rate-change canonical route (both bare and with trailing path)
      { source: '/:locale(en|th)/admin/employees/:id/promotion', destination: '/:locale/admin/employees/:id/pay-rate-change', permanent: false },
      { source: '/:locale(en|th)/admin/employees/:id/promotion/:path*', destination: '/:locale/admin/employees/:id/pay-rate-change/:path*', permanent: false },
    ];
  },
  webpack(config) {
    // resolve @hrms/shared/* → vendored shared lib source (src/shared)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@hrms/shared/picklists': path.resolve(__dirname, 'src/shared/picklists/index.ts'),
      '@hrms/shared/field-catalog': path.resolve(__dirname, 'src/shared/field-catalog/index.ts'),
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
