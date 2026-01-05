import { test, expect } from '@playwright/test';

test.describe('3D View Functionality', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        await page.goto('/');
        // Wait for game load
        await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 10000 });

        // Skip Tutorial if present
        const skipBtn = page.locator('button:has-text("Überspringen")');
        if (await skipBtn.isVisible()) {
            console.log('Skipping tutorial...');
            await skipBtn.click();
            await expect(page.locator('.tutorial-overlay-custom')).toBeHidden();
        }
    });

    test('should toggle 3D view on button click', async ({ page }) => {
        const toggleBtn = page.locator('#toggle-3d-btn');
        const container3D = page.locator('#game-container-3d');
        const canvas2D = page.locator('.canvas-layer');

        // Initial state: 3D hidden, 2D visible
        await expect(container3D).toBeHidden();
        await expect(canvas2D).toBeVisible();

        // Check if button exists
        await expect(toggleBtn).toBeVisible();

        // Click toggle
        console.log('Clicking 3D Toggle...');
        await toggleBtn.click();

        // Wait for transition (state update)
        await page.waitForTimeout(500);

        // Expect 3D visible, 2D hidden
        // Note: usage of style.display 'block'/'none' usually works with toBeVisible/Hidden
        await expect(container3D).toBeVisible();
        await expect(canvas2D).toBeHidden();

        // Toggle back
        await toggleBtn.click();
        await page.waitForTimeout(500);

        await expect(container3D).toBeHidden();
        await expect(canvas2D).toBeVisible();
    });
});
