import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('AMDG single-page site — accessibility', () => {
  test('has no detectable WCAG 2.x A/AA violations', async ({ page }) => {
    await page.goto('/');
    // Axe cannot inspect content hidden by a closed disclosure. Open the older
    // highlights so every tag color and timeline entry is included in the scan.
    const earlierHighlights = page.locator('#highlights details.year-fold');
    if (await earlierHighlights.count()) {
      await earlierHighlights.evaluate((details: HTMLDetailsElement) => {
        details.open = true;
      });
    }
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
    // Scope to the site document so Astro's development toolbar shadow DOM
    // cannot be mistaken for production page headings when a dev server is reused.
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main#main')).toBeVisible();
  });

  test('skip link is keyboard-reachable and targets main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('a.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '#main');
  });

  test('alumni groups are always expanded without disclosure controls', async ({ page }) => {
    await page.goto('/');
    const alumni = page.locator('#alumni');
    const groups = alumni.locator('.alumni-group');
    const count = await groups.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(groups.nth(i).locator('h3')).toBeVisible();
      await expect(groups.nth(i).locator('ul')).toBeVisible();
    }
    await expect(alumni.locator('details, [aria-expanded], .acc-trigger')).toHaveCount(0);
    await expect(alumni.getByRole('button')).toHaveCount(0);
  });

  test('hero carousel controls are present and operable', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-carousel]');
    const rotation = carousel.locator('[data-playpause]');
    await expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    await expect(carousel.getByRole('button').first()).toHaveAttribute('data-playpause', '');
    await expect(rotation).not.toHaveAttribute('aria-pressed', /.+/);

    // Entering the carousel with keyboard focus stops rotation permanently;
    // leaving it does not restart rotation without an explicit button press.
    await page.getByRole('button', { name: 'Previous slide' }).focus();
    await expect(rotation).toHaveAccessibleName('Start automatic slide rotation');
    await page.locator('a[href="#about"]').first().focus();
    await expect(rotation).toHaveAccessibleName('Start automatic slide rotation');

    await page.getByRole('button', { name: 'Next slide' }).click();
    // Second dot should now be current.
    await expect(page.locator('.carousel__dot').nth(1)).toHaveAttribute('aria-current', 'true');
  });
});
