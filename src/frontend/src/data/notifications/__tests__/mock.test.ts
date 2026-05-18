import { describe, expect, it } from 'vitest';
import { MOCK_IN_APP_NOTIFICATIONS } from '@/data/notifications/mock';

describe('notification deep links', () => {
  it('routes probation due notifications to the probation workflow inbox, not employee action forms', () => {
    const probationDue = MOCK_IN_APP_NOTIFICATIONS.find((n) => n.id === 'N-004');

    expect(probationDue?.href).toBe('/th/workflows/probation/PB-001');
    expect(probationDue?.href).not.toMatch(/\/admin\/employees\/[^/]+\/probation$/);
  });
});
