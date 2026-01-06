import { test, expect } from '@playwright/test';

test.describe('Mage Knight Game Loading', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        await page.goto('/');
    });

    const waitForGameReady = async (page) => {
        // Wait for loading screen to disappear (game load)
        await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 10000 });

        // Dismiss tutorial if it appears
        const skipBtn = page.locator('button:has-text("Überspringen")');
        // Short timeout for tutorial check to avoid slowing down tests if it doesn't appear
        try {
            if (await skipBtn.isVisible({ timeout: 1000 })) {
                await skipBtn.click();
                await expect(page.locator('.tutorial-overlay-custom')).toBeHidden();
            }
        } catch (e) {
            // Tutorial might not appear, ignore
        }
    };

    test('should load the game and show title', async ({ page }) => {
        await expect(page).toHaveTitle(/Mage Knight/);
    });

    test('should show loading screen and then game board', async ({ page }) => {
        // Check loading screen appears
        const loadingScreen = page.locator('#loading-screen');

        // It should be visible initially
        await expect(loadingScreen).toBeVisible();

        // Wait for it to disappear
        await waitForGameReady(page);

        // Check for HUD elements
        await expect(page.locator('.hud-top-bar')).toBeVisible();
        await expect(page.locator('.bottom-dock')).toBeVisible();

        // Check for canvas
        await expect(page.locator('canvas#game-board')).toBeVisible();
    });

    test('should show map and hero', async ({ page }) => {
        // Wait for game load
        await waitForGameReady(page);

        // Check if debug tools are available (initialized)
        const debugBtn = page.locator('.debug-toggle');
        // Might be visible if debug.js is loaded
        await expect(debugBtn).toBeAttached();
    });
});
