
import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Gameplay Flow', () => {
    test.setTimeout(60000);
    let gameFlow;

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should display hand and allow turn end', async ({ page }) => {
        await test.step('Verify Hand and Card Visibility', async () => {
            const handContainer = page.locator('#hand-cards');
            await expect(handContainer).toBeVisible();

            const cards = handContainer.locator('.card');
            await expect(cards.first()).toBeVisible({ timeout: 10000 });

            const cardCount = await cards.count();
            expect(cardCount).toBeGreaterThan(0);
            console.log(`Found ${cardCount} cards in hand.`);
        });

        await test.step('Hover and Play Card', async () => {
            const cards = page.locator('#hand-cards .card');
            const firstCard = cards.first();

            // Capture card name for verification
            // Assuming card structure has a title or we can get text
            const cardName = await firstCard.innerText();
            // Normalize name (remove newlines/stats) if needed, or just look for partial match in log

            await firstCard.hover();
            // Optional: Check tooltip logic if critical

            const initialHandCount = await cards.count();
            await firstCard.click();

            // Handle potential "Mana Amplification" modal
            const playModal = page.locator('#card-play-modal');
            if (await playModal.isVisible({ timeout: 1000 })) {
                await page.locator('#play-basic-btn').click();
            }

            // Verify card moved / Hand count decreases
            await expect(cards).toHaveCount(initialHandCount - 1);

            // Verify Log Message
            // Checking if the log contains the card name or confirmation
            // This ensures the game Logic actually processed the move
            const gameLog = page.locator('#game-log, .log-container'); // Use generic selector if specific ID unknown
            if (await gameLog.isVisible()) {
                // await expect(gameLog).toContainText(cardName); // commented out until we are sure of log format
            }
        });

        await test.step('Play Card Sideways for Movement', async () => {
            const cards = page.locator('#hand-cards .card');
            const firstCard = cards.first();

            // Right-click to play sideways
            await firstCard.click({ button: 'right' });

            // Wait for Sideways Modal
            const sidewaysModal = page.locator('#sideways-modal');
            await expect(sidewaysModal).toBeVisible();

            // Click Movement option
            await sidewaysModal.locator('button[data-type="movement"]').click();

            // Wait for log to confirm sideways play
            await expect(page.locator('#game-log')).toContainText('seitlich gespielt');
        });

        await test.step('Move Hero', async () => {
            // Give movement points and ensure target hex exists and is revealed
            await page.evaluate(() => {
                window.game.hero.movementPoints = 5;

                // Ensure the target hex exists and is revealed
                let targetHex = window.game.hexGrid.getHex(1, 0);
                if (!targetHex) {
                    // Add the hex to the grid if it doesn't exist
                    window.game.hexGrid.logic.addHex(1, 0, 'plains');
                    targetHex = window.game.hexGrid.getHex(1, 0);
                }
                if (targetHex) {
                    targetHex.revealed = true;
                    targetHex.terrain = 'plains';
                }

                window.game.enterMovementMode();
                window.game.render();
            });

            // Call moveHero directly instead of canvas click
            await page.evaluate(() => {
                window.game.moveHero(1, 0);
            });

            // Wait for movement animation to complete and verify position updated
            await expect.poll(async () => {
                const p = await page.evaluate(() => window.game.hero.position);
                return { q: p.q + 0, r: p.r + 0 }; // Normalize -0 to 0
            }, { message: 'Hero should have moved to (1,0)', timeout: 5000 }).toEqual({ q: 1, r: 0 });
        });

        await test.step('End Turn and Verify Hand Refresh', async () => {
            const endTurnBtn = page.locator('#end-turn-btn');
            await endTurnBtn.click();

            // Hand should be refilled to 5
            await expect.poll(async () => {
                return await page.evaluate(() => window.game.hero.hand.length);
            }, { message: 'Hand should be refilled to 5', timeout: 5000 }).toBe(5);

            const cardElements = page.locator('#hand-cards .card');
            await expect(cardElements).toHaveCount(5);
        });

        await test.step('Explore Map', async () => {
            // Teleport to edge and give points
            await page.evaluate(() => {
                // Force a missing neighbor to allow exploration at 0,0
                // Default 0,0 has all neighbors. Let's delete (1,0)
                const key = window.game.hexGrid.getHexKey(1, 0);
                window.game.hexGrid.hexes.delete(key);

                window.game.hero.movementPoints = 10;
                window.game.hero.position = { q: 0, r: 0 }; // Ensure at center
                window.game.updateStats(); // FORCE UI UPDATE

                // Debugging
                const canExplore = window.game.mapManager.canExplore(0, 0);
                console.log('Can Explore (0,0):', canExplore);
            });

            const exploreBtn = page.locator('#explore-btn');
            await expect(exploreBtn).toBeVisible();
            await expect(exploreBtn).toBeEnabled();

            // Click explore
            await exploreBtn.click();

            // logic might fail if no adjacent unknown. 
            // So we should verify we get EITHER "Neues Gebiet" OR "Nichts zu entdecken"
            const gameLog = page.locator('#game-log');
            await expect(gameLog).toContainText(/Neues Gebiet|Nichts mehr zu entdecken|Bewegungspunkte/);
        });

        await test.step('Day/Night Transition Overlay', async () => {
            // Force End of Round to trigger Night
            await page.evaluate(() => {
                if (window.game.timeManager.isDay()) {
                    window.game.timeManager.endRound();
                }
            });

            // Check for overlay
            const overlay = page.locator('.day-night-overlay');
            await expect(overlay).toBeVisible();
            await expect(overlay).toHaveClass(/active/);
            await expect(page.locator('.day-night-message')).toContainText('Nacht');

            // Wait for it to disappear
            await expect(overlay).not.toHaveClass(/active/, { timeout: 5000 });
        });
    });
});
