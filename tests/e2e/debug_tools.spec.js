import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Mage Knight Gameplay', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should allow toggling debug panel', async ({ page }) => {
        await test.step('Open Debug Panel', async () => {
            const toggleBtn = page.locator('.debug-toggle');
            await expect(toggleBtn).toBeVisible();
            await toggleBtn.click();
        });

        await test.step('Verify Content and Close', async () => {
            const panel = page.locator('.debug-panel');
            await expect(panel).toBeVisible();
            await expect(page.locator('h3:has-text("Debug Tools")')).toBeVisible();

            await page.locator('.debug-panel .close-btn').click();
            await expect(panel).toBeHidden();
        });
    });

    test('should allow opening unit hiring modal', async ({ page }) => {
        await test.step('Open Debug and Add Unit', async () => {
            await page.locator('.debug-toggle').click();
            await page.locator('button:has-text("Add Unit")').click();
        });

        await test.step('Verify Log and Unit Display', async () => {
            const log = page.locator('#debug-log-container');
            await expect(log).toContainText('Debug: Added');
            await expect(page.locator('.unit-card')).toBeVisible();
        });
    });

    test('should display FPS counter when toggled', async ({ page }) => {
        await test.step('Enable FPS Counter', async () => {
            await page.locator('.debug-toggle').click();
            await page.locator('button:has-text("Toggle FPS")').click();
        });

        await test.step('Verify Overlay', async () => {
            await expect(page.locator('#perf-overlay')).toBeVisible();
            await expect(page.locator('#perf-overlay')).toContainText('FPS:');
        });
    });
});
