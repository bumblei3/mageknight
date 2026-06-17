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
            // Wait for unit card to be rendered
            await page.waitForFunction(() => {
                const card = document.querySelector('.unit-card');
                return card && card.textContent.includes('Debug Unit');
            }, { timeout: 10000 });

            const unitCard = page.locator('.unit-card').first();
            await expect(unitCard).toBeVisible();
            await expect(unitCard).toContainText('Debug Unit');
        });

        await test.step('Check Unit Tooltip', async () => {
            // Wait for card to be ready
            await page.waitForSelector('.unit-card', { state: 'visible', timeout: 5000 });

            // Trigger tooltip via evaluate
            await page.evaluate(() => {
                const card = document.querySelector('.unit-card');
                if (card) {
                    card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                }
            });

            // Give time for tooltip to appear
            await page.waitForTimeout(500);

            // Wait for tooltip
            const tooltip = page.locator('.game-tooltip');
            await expect(tooltip).toBeVisible({ timeout: 10000 });
            await expect(tooltip).toContainText('Debug Unit');
        });
    });
});
