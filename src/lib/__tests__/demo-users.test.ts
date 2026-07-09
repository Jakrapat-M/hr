import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { landingForDemoUser, landingForRoles } from '../demo-users';

describe('demo user landing routes', () => {
  it('lands manager role users on home instead of the removed manager dashboard', () => {
    expect(landingForRoles(['manager', 'employee'], 'th')).toBe('/th/home');
  });

  it('lands both manager demo personas on home when proxy switching', () => {
    expect(landingForDemoUser('manager@humi.test', 'th')).toBe('/th/home');
    expect(landingForDemoUser('rungrote@humi.test', 'th')).toBe('/th/home');
  });

  it('keeps stale manager dashboard URLs from falling through to 404', () => {
    const redirectPagePath = resolve(
      process.cwd(),
      'src/app/[locale]/manager-dashboard/page.tsx',
    );

    // The route must exist so stale /manager-dashboard bookmarks resolve instead
    // of 404. Managers land on /home via landingForRoles above; the page itself
    // may be a real dashboard or a redirect — either avoids a 404.
    expect(existsSync(redirectPagePath)).toBe(true);
  });
});
