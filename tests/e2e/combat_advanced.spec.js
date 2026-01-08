import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Advanced Combat Mechanics', () => {
    test.setTimeout(90000);
    let gameFlow;

    test.beforeEach(async ({ page }) => {
        gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should handle full combat flow with debug assistance', async ({ page }) => {
        await test.step('Setup: Add Mana and Spawn Enemy', async () => {
            await page.locator('.debug-toggle').click();
            await page.locator('button:has-text("Max Crystals")').click();

            // Spawn Orc at (1,0) using proper factory
            await page.evaluate(() => {
                const enemy = window.game.enemyAI.generateEnemy('plains', 1);
                enemy.name = 'Kringel';
                enemy.position = { q: 1, r: 0 };
                enemy.armor = 1; // Weakened for test reliability
                enemy.health = 1;

                window.game.enemies.push(enemy);

                // Reveal hex
                const hex = window.game.hexGrid.getHex(1, 0);
                if (hex) {
                    hex.revealed = true;
                    hex.terrain = 'plains';
                }

                window.game.addLog('Spawned Orc at 1,0', 'info');
                window.game.render();
            });

            // Verify Orc is spawned
            const log = page.locator('#game-log');
            await expect(log).toContainText('Spawned Orc at 1,0');

            // Close debug toggle to avoid intercepting clicks
            await page.locator('.debug-toggle').click();
        });

        await test.step('Start Combat via API Trigger', async () => {
            // Trigger combat directly to avoid movement-related flakiness
            await page.evaluate(() => {
                const enemy = window.game.enemies.find(e => e.name === 'Kringel');
                if (enemy) {
                    window.game.combatOrchestrator.initiateCombat(enemy);
                }
            });

            // Combat panel should appear
            const combatPanel = page.locator('#combat-panel');
            await expect(combatPanel).toBeVisible({ timeout: 15000 });
            await expect(combatPanel).toContainText('Kringel'); // Default orc name
        });

        await test.step('Play Ranged Attack', async () => {
            // Find a card that can do attack (Angriff)
            // Use regex to be flexible with German/English or specific card names
            const attackCard = page.locator('.card').filter({ hasText: /Angriff|Attack|Rage|Zorn/ }).first();

            if (await attackCard.count() > 0) {
                await attackCard.click();
            } else {
                // Fallback: Click first card and hope
                await page.locator('#hand-cards .card').first().click();
            }

            // If strong play modal appears, use strong effect (since we have mana)
            const strongBtn = page.locator('#play-strong-btn');
            if (await strongBtn.isVisible({ timeout: 2000 })) {
                await strongBtn.click();
            }

            // End ranged phase via central attack button
            const actionBtn = page.locator('#execute-attack-btn');
            await expect(actionBtn).toContainText(/Fernkampf beenden/);
            await actionBtn.click();
        });

        await test.step('Handle Block and Damage', async () => {
            // End Block phase if present
            const actionBtn = page.locator('#execute-attack-btn');
            if (await actionBtn.isVisible()) {
                const text = await actionBtn.textContent();
                if (text.includes('Blocken beenden')) {
                    await actionBtn.click();
                }
            }

            // Handle Damage Phase (Main Button or Modal)
            // Wait a moment for phase transition
            await page.waitForTimeout(500);

            // Check if main button entered Damage Acceptance state ("Schaden akzeptieren")
            if (await actionBtn.isVisible() && (await actionBtn.textContent()).includes('Schaden akzeptieren')) {
                await actionBtn.click();
            } else {
                // Fallback: Assign damage modal might appear
                const assignDamageModal = page.locator('#damage-assignment-modal');
                if (await assignDamageModal.isVisible({ timeout: 2000 })) {
                    await page.locator('.damage-target-hero').click();
                    await page.locator('#confirm-damage-btn').click();
                }
            }
        });

        await test.step('Perform Attack and Finish', async () => {
            // Force attack value to ensure victory regardless of card draw or enemy armor
            // This is crucial because standard card plays might yield 0 attack if they aren't Attack cards
            await page.evaluate(() => {
                if (window.game.combatOrchestrator) {
                    window.game.combatOrchestrator.combatAttackTotal = 100;
                    window.game.combatOrchestrator.updateCombatTotals(); // Update UI to reflect power
                }
            });

            // Final attack phase
            const actionBtn = page.locator('#execute-attack-btn');
            await expect(actionBtn).toContainText(/Angriff ausführen/);
            await actionBtn.click();
        });

        await test.step('Verify Combat End', async () => {
            // Wait for combat panel to close
            const combatPanel = page.locator('#combat-panel');
            await expect(combatPanel).toBeHidden({ timeout: 15000 });
        });
    });
});
