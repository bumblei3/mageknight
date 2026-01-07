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
            await page.waitForTimeout(1000);
        });

        await test.step('Verify 3D Toggle Attempted', async () => {
            // In headless CI, WebGL may not be available, so 3D container might stay hidden
            // Check if the toggle was attempted by verifying the button is still interactive
            const isWebGLAvailable = await page.evaluate(() => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                } catch (e) {
                    return false;
                }
            });

            if (isWebGLAvailable) {
                await expect(container3D).toBeVisible();
                await expect(canvas2D).toBeHidden();
            } else {
                // WebGL not available - just verify no crash occurred
                console.log('WebGL not available in CI environment - skipping visibility assertion');
                await expect(toggleBtn).toBeVisible(); // Still interactive
            }
        });
    });
});
