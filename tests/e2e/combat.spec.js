import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Combat Flow', () => {
    let gameFlow;

    test.beforeEach(async ({ page }) => {
        gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should initiate and win a combat encounter', async ({ page }) => {
        await test.step('Setup: Identify/Spawn Enemy and Prepare Hand', async () => {
            // Cheat to add a weak enemy at a known location AND give cards
            await page.evaluate(() => {
                const game = window.game;
                // Add a weak enemy adjacent to hero (Hero starts at 0,0)
                // Use factory since Enemy class is not global
                // Terrain 'plains' -> Orc usually
                const enemy = window.game.enemyAI.generateEnemy('plains', 1);

                // Override stats for deterministic test
                enemy.name = 'Orc Grunt';
                enemy.position = { q: 1, r: 0 };
                enemy.armor = 2;
                enemy.health = 2;
                enemy.attack = 1;

                game.enemies.push(enemy);
                game.entityManager.enemies.push(enemy); // Ensure sync

                // Mock helper for cards since Card class is not global
                const createMockCard = (data) => ({
                    ...data,
                    getEffect: function (useStrong) { return useStrong ? this.strongEffect : this.basicEffect; },
                    canPlaySideways: function () { return true; }, // simplified
                    isWound: function () { return false; },
                    clone: function () { return createMockCard(this); }
                });

                // Give Hero specific cards for combat (Block 2, Attack 2)
                game.hero.hand = [
                    createMockCard({ id: 'c1', name: 'Block Test', color: 'blue', basicEffect: { block: 2 }, type: 'action' }),
                    createMockCard({ id: 'c2', name: 'Attack Test', color: 'red', basicEffect: { attack: 2 }, type: 'action' }),
                ];
                // Properly bind the card click handler to the interaction controller
                game.ui.renderHandCards(game.hero.hand, (index, card) => {
                    game.interactionController.handleCardClick(index, card);
                });

                // Grant movement points and enable movement mode so clicking the enemy triggers attack
                game.hero.movementPoints = 5;
                game.enterMovementMode();

                game.render();
            });
        });

        await test.step('Initiate Combat', async () => {
            // Get screen position of the enemy hex (1,0)
            const screenPos = await page.evaluate(() => {
                const hex = window.game.hexGrid.axialToPixel(1, 0);
                const rect = window.game.canvas.getBoundingClientRect();
                return { x: rect.left + hex.x, y: rect.top + hex.y };
            });

            // Click on enemy hex to select it
            await page.mouse.click(screenPos.x, screenPos.y);

            // Verify Combat has started via game state or UI
            await expect.poll(async () => {
                return await page.evaluate(() => !!window.game.combat);
            }, { message: 'Combat should have started', timeout: 5000 }).toBe(true);

            // Verify Combat Panel UI
            await expect(page.locator('#combat-panel')).toBeVisible();
        });

        await test.step('Ranged Phase', async () => {
            // Skip Ranged Phase (we have no ranged cards)
            // Button should say "Fernkampf beenden -> Blocken"
            await expect(page.locator('#execute-attack-btn')).toHaveText(/Fernkampf beenden/);
            await page.locator('#execute-attack-btn').click();
        });

        await test.step('Block Phase', async () => {
            // Verify we are in Block Phase
            await expect(page.locator('#execute-attack-btn')).toHaveText(/Blocken beenden/);

            // Play Block Card (Index 0 in our mocked hand)
            const cards = page.locator('.card');
            await cards.nth(0).click();

            // End Block Phase (advance to Attack/Damage)
            await page.locator('#execute-attack-btn').click();
        });

        // Since we blocked fully (2 Block vs 1 Attack), the Damage Phase is skipped!
        // The game auto-advances to Attack Phase.

        // So we skip the Damage Phase step in the test expectation or make it conditional.
        // In this specific test case, we know we blocked fully.

        await test.step('Attack Phase', async () => {
            // Verify we are in Attack Phase
            await expect(page.locator('#execute-attack-btn')).toHaveText(/Angriff ausführen/);
            // Depending on game flow, we might need to click "End Block Phase" 
            // OR if blocking is done automatically/instantly, we move to attack.
            // Let's assume we need to play the Attack card now.
            // Note: If card 0 was removed, the next card is at index 0 again.

            // Play Attack Card by finding the card with specific text
            // This is more robust than nth(0) if the blocked card remains or order changes
            await page.locator('.card', { hasText: 'Attack Test' }).click();

            // Execute Attack
            await page.locator('#execute-attack-btn').click();
        });

        await test.step('Verify Victory', async () => {
            // Combat should end after successful attack
            await expect.poll(async () => {
                return await page.evaluate(() => !window.game.combat);
            }, { message: 'Combat should have ended', timeout: 5000 }).toBe(true);

            // Verify Enemy Defeated via game log
            // The Enemy class doesn't track defeated state - it's computed.
            // After combat, defeated enemies are removed from combat.enemies but may persist elsewhere.
            // The definitive proof of victory is the game log message.
            await expect(page.locator('#game-log')).toContainText(/Victory over Orc Grunt/);
        });
    });
});
