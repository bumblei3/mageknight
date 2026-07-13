import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * Browser-side regression for the loading-screen lifecycle (UI hardening,
 * option A). Verifies that on a successful start the loading screen is hidden
 * (not stuck on an infinite spinner) and no error-recovery UI leaks into the
 * live game.
 */

test.describe('Loading Screen Lifecycle', () => {
    test('loading screen is hidden after the game starts', async ({ page }) => {
        const flow = new GameFlow(page);
        await flow.ensureGameStarted();

        // The loading screen must be gone (hidden + removed from DOM).
        await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 15000 });
    });

    test('no error-recovery UI is present on a healthy start', async ({ page }) => {
        const flow = new GameFlow(page);
        await flow.ensureGameStarted();

        // If the error state were showing, this block would be in the DOM.
        await expect(page.locator('.loading-error-actions')).toHaveCount(0);
    });

    test('game is fully interactive after load (action bar present)', async ({ page }) => {
        const flow = new GameFlow(page);
        await flow.ensureGameStarted();
        await page.waitForFunction(() => !!(window.game && window.game.actionBarManager), { timeout: 15000 });
        await page.evaluate(() => window.game.actionBarManager.render());

        const btn = page.locator('#action-bar-content .action-btn').first();
        await expect(btn).toBeVisible({ timeout: 5000 });
    });
});
