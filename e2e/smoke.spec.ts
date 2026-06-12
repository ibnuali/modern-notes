import { test, expect } from '@playwright/test';
import { makeTestEmail, TEST_PASSWORD, TEST_NAME, cleanupTestData } from './helpers';

test.describe('Notes app — MVP smoke suite', () => {
  let testEmail: string;

  test.beforeAll(async () => {
    testEmail = makeTestEmail();
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('Full MVP user journey: register → create → edit → navigate → search', async ({ page }) => {
    // ── Step 1: Register ──────────────────────────────────────
    await test.step('Register a new account', async () => {
      await page.goto('/register');

      await page.getByLabel('Name').fill(TEST_NAME);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: 'Create account' }).click();

      await page.waitForURL('/notes');
      await expect(page.getByRole('heading', { name: 'Your notes' })).toBeVisible();
      await expect(page.getByText(`Signed in as ${testEmail}`)).toBeVisible();
    });

    // ── Step 2: Create a note ─────────────────────────────────
    await test.step('Create a note', async () => {
      await page.getByRole('button', { name: 'New note' }).click();

      // Use role-based locators to avoid collision with the search input's aria-label ("Search notes by title or body")
      await page.getByRole('textbox', { name: 'Title' }).fill('Meeting Notes');
      await page.getByRole('textbox', { name: 'Body' }).fill('Discuss Q3 roadmap and sprint planning.');

      await page.getByRole('button', { name: 'Create note' }).click();
      await expect(page.getByRole('status').filter({ hasText: /Saved/ })).toBeVisible({ timeout: 10_000 });

      // Verify note appears in the sidebar
      const list = page.getByRole('list', { name: 'Notes list' });
      await expect(list.locator('button').filter({ hasText: 'Meeting Notes' })).toBeVisible();
    });

    // ── Step 3: Edit the note ─────────────────────────────────
    await test.step('Edit the existing note', async () => {
      const meetingItem = page.getByRole('list', { name: 'Notes list' }).locator('button').filter({ hasText: 'Meeting Notes' });
      await meetingItem.click();

      await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Meeting Notes');

      await page.getByRole('textbox', { name: 'Title' }).fill('Meeting Notes — Q3');
      await page.getByRole('textbox', { name: 'Body' }).fill('Discussed Q3 roadmap, sprint planning, and resource allocation.');

      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByRole('status').filter({ hasText: /Saved/ })).toBeVisible({ timeout: 10_000 });

      // Verify updated title in sidebar
      await expect(page.getByRole('list', { name: 'Notes list' })).toContainText('Meeting Notes — Q3');
    });

    // ── Step 4: Create second note & navigate ─────────────────
    await test.step('Create a second note and navigate between notes', async () => {
      await page.getByRole('button', { name: 'New note' }).click();
      await page.getByRole('textbox', { name: 'Title' }).fill('Shopping List');
      await page.getByRole('textbox', { name: 'Body' }).fill('Milk, eggs, bread, and coffee.');
      await page.getByRole('button', { name: 'Create note' }).click();
      await expect(page.getByRole('status').filter({ hasText: /Saved/ })).toBeVisible({ timeout: 10_000 });

      const list = page.getByRole('list', { name: 'Notes list' });

      // Navigate to first note (Meeting Notes)
      const meetingItem = list.locator('button').filter({ hasText: 'Meeting Notes — Q3' });
      await meetingItem.click();
      await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Meeting Notes — Q3');
      await expect(page.getByRole('textbox', { name: 'Body' })).toContainText('resource allocation');

      // Navigate back to Shopping List
      const shoppingItem = list.locator('button').filter({ hasText: 'Shopping List' });
      await shoppingItem.click();
      await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Shopping List');
      await expect(page.getByRole('textbox', { name: 'Body' })).toContainText('Milk, eggs');
    });

    // ── Step 5: Search ────────────────────────────────────────
    await test.step('Search notes by title', async () => {
      const list = page.getByRole('list', { name: 'Notes list' });

      // Both notes visible initially
      await expect(list.locator('button').filter({ hasText: 'Meeting Notes — Q3' })).toBeVisible();
      await expect(list.locator('button').filter({ hasText: 'Shopping List' })).toBeVisible();

      // Search narrows results
      await page.getByPlaceholder('Search notes…').fill('Shopping');
      await expect(list.locator('button').filter({ hasText: 'Shopping List' })).toBeVisible();
      await expect(list.locator('button').filter({ hasText: 'Meeting Notes — Q3' })).not.toBeVisible();

      // No-match search
      await page.getByPlaceholder('Search notes…').fill('xyznonexistent');
      await expect(page.getByText(/No notes match/)).toBeVisible();

      // Clear search restores full list
      await page.getByPlaceholder('Search notes…').fill('');
      await expect(list.locator('button').filter({ hasText: 'Shopping List' })).toBeVisible();
      await expect(list.locator('button').filter({ hasText: 'Meeting Notes — Q3' })).toBeVisible();
    });
  });
});
