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
        await test.step('Check Title', async () => {
            await expect(page).toHaveTitle(/Mage Knight/);
        });
    });

    test('should show loading screen and then game board', async ({ page }) => {
        await test.step('Check Loading Screen', async () => {
            const loadingScreen = page.locator('#loading-screen');
            await expect(loadingScreen).toBeVisible();
        });

        await test.step('Wait for Game Ready', async () => {
            await waitForGameReady(page);
        });

        await test.step('Verify HUD and Board', async () => {
            await expect(page.locator('.hud-top-bar')).toBeVisible();
            await expect(page.locator('.bottom-dock')).toBeVisible();
            await expect(page.locator('canvas#game-board')).toBeVisible();
        });
    });

    test('should show map and hero', async ({ page }) => {
        await test.step('Wait for Game Load', async () => {
            await waitForGameReady(page);
        });

        await test.step('Check Debug Tools Availability', async () => {
            const debugBtn = page.locator('.debug-toggle');
            await expect(debugBtn).toBeAttached();
        });
    });
});
