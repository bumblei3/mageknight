import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * Browser-side regression for the action-bar accessibility + global
 * data-tooltip improvements (UI/UX hardening pass).
 *
 * Verifies that every visible action-bar button carries an aria-label +
 * data-tooltip, and that the global TooltipManager surfaces a styled tooltip
 * on hover/focus (not just the native title).
 */

test.describe('Action Bar Accessibility & Tooltips', () => {
    test.beforeEach(async ({ page }) => {
        const flow = new GameFlow(page);
        await flow.ensureGameStarted();
        // Wait until the action bar manager exists, then force a render so the
        // buttons are present even on a fresh game state.
        await page.waitForFunction(() => !!(window.game && window.game.actionBarManager), { timeout: 15000 });
        await page.evaluate(() => window.game.actionBarManager.render());
    });

    test('every visible action button has aria-label and data-tooltip', async ({ page }) => {
        const buttons = page.locator('#action-bar-content .action-btn');
        const count = await buttons.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const btn = buttons.nth(i);
            await expect(btn).toHaveAttribute('aria-label');
            await expect(btn).toHaveAttribute('data-tooltip');
            const label = (await btn.getAttribute('aria-label')) || '';
            expect(label.trim().length).toBeGreaterThan(0);
        }
    });

    test('hovering an action button shows the styled game-tooltip', async ({ page }) => {
        const btn = page.locator('#action-bar-content .action-btn').first();
        await btn.hover();

        const tooltip = page.locator('.game-tooltip');
        await expect(tooltip).toBeVisible({ timeout: 3000 });
        const text = (await tooltip.innerText()).trim();
        expect(text.length).toBeGreaterThan(0);
    });

    test('keyboard focus surfaces the tooltip (no mouse used)', async ({ page }) => {
        const btn = page.locator('#action-bar-content .action-btn').first();
        await btn.focus();

        const tooltip = page.locator('.game-tooltip');
        await expect(tooltip).toBeVisible({ timeout: 3000 });
    });
});
