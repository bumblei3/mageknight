import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Unit Management', () => {
    test.setTimeout(60000);
    let gameFlow;

    test.beforeEach(async ({ page }) => {
        gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should allow adding and viewing units', async ({ page }) => {
        await test.step('Open Debug and Add Unit', async () => {
            const debugToggle = page.locator('.debug-toggle');
            await debugToggle.click();

            const addUnitBtn = page.locator('button:has-text("Add Unit")');
            await addUnitBtn.click();

            // Verify debug log
            const debugLog = page.locator('#debug-log-container');
            await expect(debugLog).toContainText('Debug: Added unit');
        });

        await test.step('Verify Unit Card in UI', async () => {
            const unitCard = page.locator('.unit-card');
            await expect(unitCard).toBeVisible();
            await expect(unitCard).toContainText('Debug Unit');
        });

        await test.step('Check Unit Tooltip', async () => {
            const unitCard = page.locator('.unit-card').first();

            // Hover to trigger tooltip
            await unitCard.hover();
            // Optional: Dispatch mouseenter manually as backup
            await unitCard.evaluate(el => el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })));

            const tooltip = page.locator('.game-tooltip');
            // Tooltips use rAF and opacity, so be patient
            await expect(tooltip).toBeVisible({ timeout: 5000 });
            await expect(tooltip).toContainText('Debug Unit');
        });
    });
});
