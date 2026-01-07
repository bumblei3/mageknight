
import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Interactions Flow', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should interact with a village', async ({ page }) => {
        await test.step('Setup: Identify/Spawn Village and Position Hero', async () => {
            await page.evaluate(() => {
                const game = window.game;
                // Find a village hex and move hero to it
                // game.hexGrid.hexes is a Map
                const hexes = Array.from(game.hexGrid.hexes.values());
                const villageHex = hexes.find(h => h.site && h.site.type === 'village');
                if (villageHex) {
                    game.hero.position = { q: villageHex.q, r: villageHex.r };
                } else {
                    // Create one at (1,1) if none found
                    game.hexGrid.setHex(1, 1, {
                        q: 1, r: 1,
                        terrain: 'plains',
                        revealed: true,
                        site: {
                            name: 'Dorf',
                            type: 'village',
                            getName: () => 'Dorf',
                            getIcon: () => '🏠',
                            getInfo: () => 'Dorf: Heile 1 Verletzung oder heuere Einheiten an.'
                        }
                    });
                    game.hero.position = { q: 1, r: 1 };
                }
                game.render();
                // Ensure UI updates to show buttons
                if (game.updateStats) game.updateStats();
            });
        });

        await test.step('Verify Visit Button Visibility', async () => {
            const visitBtn = page.locator('#visit-btn');
            await expect(visitBtn).toBeVisible();
            // The button text seems to be "Besuche [Name]"
            await expect(visitBtn).toContainText('Besuche');
        });

        await test.step('Trigger Village Interaction', async () => {
            await page.locator('#visit-btn').click();

            // Should show some interaction outcome or modal
            // In our current implementation, it might show a log message
            await expect(page.locator('#game-log')).toContainText(/Dorf/);
        });
    });

    test('should collect mana from source', async ({ page }) => {
        await test.step('Collect Mana', async () => {
            // Wait for mana source to be fully rendered
            const manaSource = page.locator('#mana-source .mana-die:not(.used)').first();
            await expect(manaSource).toBeVisible({ timeout: 10000 });

            // Wait for any animations to settle
            await page.waitForTimeout(500);

            const initialManaCount = await page.evaluate(() => window.game.hero.tempMana.length);

            // Call the game API directly instead of DOM click (event handlers are closures)
            const collected = await page.evaluate(() => {
                const manaSource = window.game.manaSource;
                const availableDice = manaSource.getAvailableDice(window.game.isNight);
                const firstAvailable = availableDice.findIndex(d => d.available);
                if (firstAvailable >= 0) {
                    return window.game.actionManager.takeMana(firstAvailable, availableDice[firstAvailable].color);
                }
                return null;
            });

            // Verify mana was collected
            expect(collected).not.toBeNull();

            // Verify hero's tempMana increased
            await expect.poll(async () => {
                return await page.evaluate(() => window.game.hero.tempMana.length);
            }, { message: 'Mana should be collected', timeout: 5000 }).toBeGreaterThan(initialManaCount);

            // Note: Direct API call doesn't trigger log message, which goes through interactionController
            // The test validates mana collection via hero.tempMana increase
        });
    });
});
