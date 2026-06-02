import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('AMDG single-page site — accessibility', () => {
  test('has no detectable WCAG 2.x A/AA violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    // Helpful failure output.
    if (results.violations.length) {
      console.log(JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  });

  test('has exactly one h1 and a labelled main landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main#main')).toBeVisible();
  });

  test('skip link is keyboard-reachable and targets main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('a.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '#main');
  });

  test('alumni accordion toggles and Collapse all works', async ({ page }) => {
    await page.goto('/');
    const firstTrigger = page.locator('.acc-trigger').first();
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('button', { name: 'Collapse all' }).click();
    const triggers = page.locator('.acc-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i++) {
      await expect(triggers.nth(i)).toHaveAttribute('aria-expanded', 'false');
    }

    await firstTrigger.click();
    await expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');
  });

  test('hero carousel controls are present and operable', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-carousel]');
    await expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    await page.getByRole('button', { name: 'Next slide' }).click();
    // Second dot should now be current.
    await expect(page.locator('.carousel__dot').nth(1)).toHaveAttribute('aria-current', 'true');
  });
});
