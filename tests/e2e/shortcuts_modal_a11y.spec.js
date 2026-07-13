import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * Browser-side regression for ShortcutsModal accessibility (UI hardening,
 * option B): focus moves into the dialog on open, Escape closes it, and Tab
 * is trapped inside the modal instead of escaping to the page behind.
 */

test.describe('ShortcutsModal Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        const flow = new GameFlow(page);
        await flow.ensureGameStarted();
        // Open via Settings -> Shortcuts (use evaluate to click through overlays)
        await page.evaluate(() => {
            const btn = document.getElementById('settings-btn');
            if (btn) btn.click();
        });
        await page.waitForSelector('#settings-shortcuts-btn', { timeout: 10000 });
        await page.evaluate(() => {
            const btn = document.getElementById('settings-shortcuts-btn');
            if (btn) btn.click();
        });
        await expect(page.locator('#shortcuts-modal')).toBeVisible({ timeout: 10000 });
    });

    test('focus is moved into the modal on open', async ({ page }) => {
        // Wait for focus to land inside the dialog (deferred one frame)
        await page.waitForFunction(
            () => {
                const el = document.activeElement;
                return !!el && !!el.closest('#shortcuts-modal');
            },
            { timeout: 5000 }
        );
        const insideModal = await page.evaluate(() => {
            const el = document.activeElement;
            return !!el && !!el.closest('#shortcuts-modal');
        });
        expect(insideModal).toBe(true);
    });

    test('Escape closes the modal', async ({ page }) => {
        await page.keyboard.press('Escape');
        await expect(page.locator('#shortcuts-modal')).toBeHidden({ timeout: 5000 });
    });

    test('Tab is trapped inside the modal', async ({ page }) => {
        // Focus the close button, then Tab repeatedly. The focus must never
        // escape to a control outside the dialog (e.g. the settings trigger).
        const closeBtn = page.locator('#shortcuts-close');
        await closeBtn.focus();
        for (let i = 0; i < 6; i++) {
            await page.keyboard.press('Tab');
        }
        const escapedToTrigger = await page.evaluate(() => {
            const el = document.activeElement;
            return !!el && el.id === 'settings-shortcuts-btn';
        });
        expect(escapedToTrigger).toBe(false);
        // And the modal is still open (focus stayed within it)
        await expect(page.locator('#shortcuts-modal')).toBeVisible();
    });
});
