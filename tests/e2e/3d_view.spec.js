import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('3D View Functionality', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should toggle 3D view on button click', async ({ page }) => {
        const toggleBtn = page.locator('#toggle-3d-btn');
        const container3D = page.locator('#game-container-3d');
        const canvas2D = page.locator('.canvas-layer');

        await test.step('Initial State Check', async () => {
            await expect(container3D).toBeHidden();
            await expect(canvas2D).toBeVisible();
            await expect(toggleBtn).toBeVisible();
        });

        await test.step('Activate 3D Mode', async () => {
            console.log('Clicking 3D Toggle...');
            await toggleBtn.click({ force: true });
            await page.waitForTimeout(500);
        });

        await test.step('Verify 3D Visible / 2D Hidden', async () => {
            await expect(container3D).toBeVisible();
            await expect(canvas2D).toBeHidden();
        });
    });
});
