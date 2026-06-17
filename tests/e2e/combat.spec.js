import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Combat Flow', () => {
    let gameFlow;

    test.beforeEach(async ({ page }) => {
        gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should initiate and win a combat encounter', async ({ page }) => {
        await test.step('Setup: Spawn weak enemy and initiate combat', async () => {
            await page.evaluate(() => {
                const game = window.game;

                // Spawn a very weak enemy at (1, 0)
                const enemy = game.enemyAI.generateEnemy('plains', 1);
                enemy.name = 'Test Orc';
                enemy.position = { q: 1, r: 0 };
                enemy.armor = 1;
                enemy.health = 1;
                enemy.attack = 1;
                game.enemies.push(enemy);

                // Ensure hex (1,0) exists and is revealed
                let hex = game.hexGrid.getHex(1, 0);
                if (!hex) {
                    game.hexGrid.logic.addHex(1, 0, 'plains');
                    hex = game.hexGrid.getHex(1, 0);
                }
                hex.revealed = true;

                // Give hero a strong attack card
                game.hero.hand.push({
                    id: 'test_attack',
                    name: 'Test Attack',
                    color: 'red',
                    basicEffect: { attack: 5 },
                    type: 'action',
                    isWound: () => false,
                    canPlaySideways: () => true,
                    getEffect: function(strong) { return strong ? (this.strongEffect || {}) : this.basicEffect; }
                });

                // Render hand with click handler
                game.ui.renderHandCards(game.hero.hand, (i, c) => {
                    game.interactionController.handleCardClick(i, c);
                });

                // Initiate combat directly
                game.initiateCombat(enemy);
            });

            await expect.poll(async () => {
                return await page.evaluate(() => !!window.game.combat);
            }, { timeout: 5000 }).toBe(true);
        });

        await test.step('Skip through combat phases', async () => {
            // Wait for combat UI to be ready
            await page.waitForTimeout(1000);

            // Click through phases: Ranged -> Block -> Attack
            const actionBtn = page.locator('#execute-attack-btn');

            // Ranged phase - skip
            if (await actionBtn.isVisible({ timeout: 3000 })) {
                const text = await actionBtn.textContent();
                if (text.includes('Fernkampf') || text.includes('Ranged')) {
                    await actionBtn.click();
                    await page.waitForTimeout(500);
                }
            }

            // Block phase - skip
            if (await actionBtn.isVisible({ timeout: 3000 })) {
                const text = await actionBtn.textContent();
                if (text.includes('Block')) {
                    await actionBtn.click();
                    await page.waitForTimeout(500);
                }
            }

            // Play attack card - use evaluate to bypass HUD overlay
            await page.evaluate(() => {
                const game = window.game;
                const attackCard = game.hero.hand.find(c => c.name === 'Test Attack');
                if (attackCard) {
                    const index = game.hero.hand.indexOf(attackCard);
                    game.interactionController.handleCardClick(index, attackCard);
                }
            });
            await page.waitForTimeout(500);

            // Handle damage phase if it appears
            if (await actionBtn.isVisible({ timeout: 3000 })) {
                const text = await actionBtn.textContent();
                if (text.includes('Schaden') || text.includes('Damage') || text.includes('akzeptieren') || text.includes('Accept')) {
                    await actionBtn.click();
                    await page.waitForTimeout(500);
                }
            }

            // Execute attack
            if (await actionBtn.isVisible({ timeout: 3000 })) {
                const text = await actionBtn.textContent();
                if (text.includes('Angriff') || text.includes('Attack') || text.includes('Kampf') || text.includes('Combat')) {
                    await actionBtn.click();
                }
            }
        });

        await test.step('Verify victory', async () => {
            // Debug: log combat state
            const combatState = await page.evaluate(() => {
                const c = window.game.combat;
                return {
                    exists: !!c,
                    phase: c?.phase,
                    enemies: c?.enemies?.length,
                    attackTotal: window.game.combatOrchestrator?.combatAttackTotal
                };
            });
            console.log('Combat state:', JSON.stringify(combatState));

            await expect.poll(async () => {
                return await page.evaluate(() => !window.game.combat);
            }, { timeout: 10000 }).toBe(true);

            // Check log for victory message
            const logText = await page.locator('#game-log').innerText();
            expect(logText).toMatch(/Sieg|victory|besiegt/i);
        });
    });
});
