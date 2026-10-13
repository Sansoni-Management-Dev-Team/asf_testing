import { test } from '@playwright/test';
import { donate, randomInt, randomItem } from './support/donation-flow';

const executives = ['Aaron & Elena', 'Boon'] as const;

test('executive donation completes via Stripe Checkout with a test card', async ({ page }) => {
  await donate(page, '/executive', {
    firstName: 'Test',
    lastName: 'Executive',
    email: `test.executive+${Date.now()}@example.com`,
    group: randomItem(executives),
    amount: randomInt(500, 2000),
  });
});
