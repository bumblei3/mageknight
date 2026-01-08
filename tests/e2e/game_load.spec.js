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

    test('should persist state after save and reload', async ({ page }) => {
        test.setTimeout(120000); // Increase timeout for heavy reload/load sequence
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();

        await test.step('Modify Game State', async () => {
            // Play a card to change hand size
            const cards = page.locator('#hand-cards .card');
            const initialCount = await cards.count();
            expect(initialCount).toBeGreaterThan(0);

            await cards.first().click();

            // Handle mana modal if it appears
            const playModal = page.locator('#card-play-modal');
            if (await playModal.isVisible({ timeout: 1000 })) {
                await page.locator('#play-basic-btn').click();
            }

            // Verify card played
            await expect(cards).toHaveCount(initialCount - 1);

            // Move hero
            await page.evaluate(() => {
                window.game.hero.movementPoints = 5;
                window.game.hero.position = { q: 2, r: 1 };
            });
        });

        await test.step('Save Game', async () => {
            await page.evaluate(() => {
                console.log('Saving game...');
                window.game.stateManager.saveGame('e2e_test_slot');
            });
        });

        // Get expected values before reload
        const expectedPos = await page.evaluate(() => window.game.hero.position);
        const expectedHandSize = await page.evaluate(() => window.game.hero.hand.length);

        await test.step('Reload Page', async () => {
            console.log('Reloading page...');
            await page.reload();
            await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 60000 });

            // Wait for game instance to be ready
            await page.waitForFunction(() => !!window.game && !!window.game.stateManager);
        });

        await test.step('Load Game', async () => {
            await page.evaluate(() => {
                console.log('Loading game...');
                if (!window.game || !window.game.stateManager) {
                    throw new Error('Game or StateManager not initialized');
                }

                // Force close any blocking modals (scenario/hero selection) that might auto-appear
                document.querySelectorAll('.modal, .site-modal').forEach(el => el.classList.remove('active'));

                const success = window.game.stateManager.loadGame('e2e_test_slot');
                console.log('Game loaded result:', success);
            });

            // Wait for state to be applied
            await page.waitForTimeout(1000);
        });

        await test.step('Verify Restored State', async () => {
            const pos = await page.evaluate(() => window.game.hero.position);
            const handSize = await page.evaluate(() => window.game.hero.hand.length);

            expect(pos.q).toBe(expectedPos.q);
            expect(pos.r).toBe(expectedPos.r);
            expect(handSize).toBe(expectedHandSize);
        });
    });
});
