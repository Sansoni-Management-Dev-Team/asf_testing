import { test } from '@playwright/test';
import { donate, randomInt } from './support/donation-flow';

test('donation completes via Stripe Checkout with a test card', async ({ page }) => {
  await donate(page, '/', {
    firstName: 'Test',
    lastName: 'Donor',
    email: `test.donor+${Date.now()}@example.com`,
    group: `Group ${randomInt(1, 10)}`,
    amount: randomInt(500, 2000),
  });
});
