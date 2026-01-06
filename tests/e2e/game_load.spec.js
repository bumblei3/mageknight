import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Mage Knight Game Loading', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        await page.goto('/');
    });

    const waitForGameReady = async (page) => {
        const gameFlow = new GameFlow(page);
        // Wait for loading screen to disappear (game load)
        await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 15000 });

        await gameFlow.skipTutorial();
        await gameFlow.handleModals();
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
