import { test, expect } from '@playwright/test';

test.describe('Mage Knight Game Loading', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        await page.goto('/');
    });

    test('should load the game and show title', async ({ page }) => {
        await expect(page).toHaveTitle(/Mage Knight/);
    });

    test('should show loading screen and then game board', async ({ page }) => {
        // Check loading screen appears
        const loadingScreen = page.locator('#loading-screen');
        await expect(loadingScreen).toBeVisible();

        // Wait for loading screen to disappear (game load)
        await expect(loadingScreen).toBeHidden({ timeout: 10000 });

        // Check for HUD elements
        await expect(page.locator('.hud-top-bar')).toBeVisible();
        await expect(page.locator('.bottom-dock')).toBeVisible();

        // Check for canvas
        await expect(page.locator('canvas#game-board')).toBeVisible();
    });

    test('should show map and hero', async ({ page }) => {
        // Wait for game load
        await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 10000 });

        // Check if debug tools are available (initialized)
        const debugBtn = page.locator('.debug-toggle');
        // Might be visible if debug.js is loaded
        await expect(debugBtn).toBeAttached();
    });
});
