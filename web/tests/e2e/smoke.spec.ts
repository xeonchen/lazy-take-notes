/**
 * E2E smoke tests — validates core flows in a real browser.
 * Requires `npx playwright install chromium` before running.
 * Run with: pnpm run test:e2e
 */
import { test, expect } from '@playwright/test';

test.describe('App startup', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ltn-consent-dismissed', '1');
      localStorage.setItem('ltn-setup-completed', '1');
    });
  });

  test('shows template selector on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.logo')).toContainText('lazy-take-notes');
    await expect(page.locator('.modal-header')).toContainText('Select a Template');
    // Should have at least one template card
    const cards = page.locator('.template-card');
    await expect(cards).not.toHaveCount(0);
  });

  test('settings button is visible on template screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  });
});

test.describe('Template selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ltn-consent-dismissed', '1');
      localStorage.setItem('ltn-setup-completed', '1');
    });
  });

  test('clicking a template transitions to recording screen', async ({ page }) => {
    await page.goto('/');
    // Click the first template card
    const firstCard = page.locator('.template-card').first();
    const templateName = await firstCard.locator('.name').textContent();
    await firstCard.click();

    // Should now show the recording screen
    await expect(page.locator('.template-info')).toContainText(templateName!);
    await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible();
    await expect(page.locator('.transcript-panel')).toBeVisible();
    await expect(page.locator('.digest-panel')).toBeVisible();
    await expect(page.locator('.status-bar')).toBeVisible();
  });

  test('transcript panel shows waiting message', async ({ page }) => {
    await page.goto('/');
    await page.locator('.template-card').first().click();
    await expect(page.locator('.transcript-panel')).toContainText('Waiting for audio');
  });

  test('digest panel shows placeholder message', async ({ page }) => {
    await page.goto('/');
    await page.locator('.template-card').first().click();
    await expect(page.locator('.digest-panel')).toContainText('Notes will appear');
  });
});

test.describe('Settings modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ltn-consent-dismissed', '1');
      localStorage.setItem('ltn-setup-completed', '1');
    });
  });

  test('opens and closes settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    // Settings modal should be visible
    await expect(page.locator('.modal-header').filter({ hasText: 'Settings' })).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();

    // Close with Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-header').filter({ hasText: 'Settings' })).not.toBeVisible();
  });

  test('can switch LLM provider', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    // Switch to Ollama
    const providerSelect = page.locator('select').first();
    await providerSelect.selectOption('ollama');

    // Should show Ollama-specific fields
    await expect(page.getByText('Ollama Server Address')).toBeVisible();
    await expect(page.locator('code', { hasText: 'OLLAMA_ORIGINS' }).first()).toBeVisible();
  });

  test('test connection button exists', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('button', { name: 'Test Connection' })).toBeVisible();
  });

  test('reset to defaults works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    // Change a value
    const minLinesInput = page.locator('input[type="number"]').first();
    await minLinesInput.fill('99');
    expect(await minLinesInput.inputValue()).toBe('99');

    // Reset
    await page.getByRole('button', { name: 'Reset to Defaults' }).click();
    expect(await minLinesInput.inputValue()).toBe('15');
  });
});

test.describe('Help modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ltn-consent-dismissed', '1');
      localStorage.setItem('ltn-setup-completed', '1');
    });
  });

  test('opens help with H key after template selection', async ({ page }) => {
    await page.goto('/');
    await page.locator('.template-card').first().click();

    await page.keyboard.press('h');
    await expect(page.locator('.modal-header').filter({ hasText: 'Help' })).toBeVisible();
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    // Close
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('.modal-header').filter({ hasText: 'Help' })).not.toBeVisible();
  });
});

test.describe('Status bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ltn-consent-dismissed', '1');
      localStorage.setItem('ltn-setup-completed', '1');
    });
  });

  test('shows idle state and buffer count', async ({ page }) => {
    await page.goto('/');
    await page.locator('.template-card').first().click();

    const statusBar = page.locator('.status-bar');
    await expect(statusBar).toContainText('Idle');
    await expect(statusBar).toContainText('buf 0/');
    await expect(statusBar).toContainText('00:00:00');
  });
});

test.describe('Consent notice', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ltn-setup-completed', '1');
    });
  });

  test('shows consent notice on first visit', async ({ page, context }) => {
    // Clear localStorage to simulate first visit
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('ltn-consent-dismissed'));
    await page.reload();

    await expect(page.locator('.consent-notice')).toBeVisible();
    await expect(page.getByText('Recording Notice')).toBeVisible();

    // Dismiss
    await page.getByRole('button', { name: 'I understand' }).click();
    await expect(page.locator('.consent-notice')).not.toBeVisible();
  });

  test('"Don\'t show again" persists preference', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('ltn-consent-dismissed'));
    await page.reload();

    await page.getByRole('button', { name: "Don't show again" }).click();

    // Reload — should not show consent
    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('.consent-notice')).not.toBeVisible();
  });
});

test.describe('First-run setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ltn-consent-dismissed', '1');
      // Deliberately NOT setting ltn-setup-completed to trigger first-run flow
    });
  });

  test('shows getting started modal on first run', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.modal-header').filter({ hasText: 'Getting Started' })).toBeVisible();
    await expect(page.locator('.setup-banner')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save & Start' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
  });
});
