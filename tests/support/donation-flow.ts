import { test, expect, type Page } from '@playwright/test';

export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const randomItem = <T>(items: readonly T[]) => items[randomInt(0, items.length - 1)];

export type Donor = {
  firstName: string;
  lastName: string;
  email: string;
  group: string;
  amount: number;
};

// Stripe test card: https://docs.stripe.com/testing
const card = {
  number: '4242 4242 4242 4242',
  expiry: '12 / 34',
  cvc: '123',
  country: 'Australia',
};

// Fills the donation form at `path`, pays on Stripe Checkout and checks the thank-you page.
export async function donate(page: Page, path: string, donor: Donor) {
  // How Stripe and the thank-you page display the amount, e.g. "$1,250.00".
  const displayedAmount = `$${donor.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  await test.step('fill in the donation form', async () => {
    await page.goto(path);

    await page.getByRole('textbox', { name: 'First Name' }).fill(donor.firstName);
    await page.getByRole('textbox', { name: 'Last Name' }).fill(donor.lastName);
    await page.getByRole('textbox', { name: 'Email' }).fill(donor.email);

    // Groups load asynchronously; the combobox is disabled until they arrive.
    const group = page.getByRole('combobox', { name: 'Group Selection' });
    await expect(group).toBeEnabled();
    await group.click();
    await page.getByRole('option', { name: donor.group, exact: true }).click();

    await page.getByRole('spinbutton', { name: 'Amount (USD)' }).fill(String(donor.amount));
    await page.getByRole('button', { name: 'Submit' }).click();
  });

  await test.step('pay on Stripe Checkout', async () => {
    // The redirect waits on our server creating a Stripe session, which can exceed the 5s default.
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await expect(page.getByText(`Donation – ${donor.group}`)).toBeVisible();
    await expect(page.getByText(displayedAmount).first()).toBeVisible();

    await page.getByRole('textbox', { name: 'Card number' }).fill(card.number);
    await page.getByRole('textbox', { name: 'Expiration' }).fill(card.expiry);
    await page.getByRole('textbox', { name: 'Credit or debit card CVC/CVV' }).fill(card.cvc);
    await page.getByRole('textbox', { name: 'Cardholder name' }).fill(`${donor.firstName} ${donor.lastName}`);
    // Stripe picks a default country from the runner's location; pin it so the test is stable.
    await page.getByRole('combobox', { name: 'Country or region' }).selectOption({ label: card.country });
    // In some regions (e.g. US CI runners) Stripe pre-ticks "Save my information with Link",
    // which adds a required phone number field and blocks the payment. Always opt out.
    await page.getByRole('checkbox', { name: /Save my information/ }).setChecked(false);

    await page.getByTestId('hosted-payment-submit-button').click();
  });

  await test.step('see the thank-you page', async () => {
    await expect(page).toHaveURL(/\/success\?session_id=cs_test_/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Thank you for your donation' })).toBeVisible();
    await expect(page.getByText('Your payment has been received.')).toBeVisible();
    await expect(page.getByText(donor.email)).toBeVisible();
    await expect(page.getByText(displayedAmount)).toBeVisible();
    await expect(page.getByText(donor.group, { exact: true })).toBeVisible();
  });
}
