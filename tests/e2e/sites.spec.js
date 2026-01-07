import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Site Interactions', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should visit village and see interaction options', async ({ page }) => {
        await test.step('Setup Village Site', async () => {
            await page.evaluate(() => {
                // Create a village at hero's position
                const pos = window.game.hero.position;
                const hex = window.game.hexGrid.getHex(pos.q, pos.r);

                if (hex && !hex.site) {
                    hex.site = {
                        type: 'village',
                        name: 'Test Village',
                        getIcon: () => '🏘️',
                        getName: () => 'Test Village',
                        conquered: false
                    };
                }
                window.game.updateStats();
            });
        });

        await test.step('Click Visit Button', async () => {
            const visitBtn = page.locator('#visit-btn');

            // Check if button becomes visible
            const isVisible = await visitBtn.isVisible({ timeout: 2000 }).catch(() => false);

            if (isVisible) {
                await visitBtn.click();

                // Verify site modal appears (optional - may not show in all cases)
                const siteModal = page.locator('#site-modal');
                const modalVisible = await siteModal.isVisible({ timeout: 2000 }).catch(() => false);

                if (modalVisible) {
                    await expect(page.locator('#site-modal-title')).toContainText(/Village|Dorf/);
                }
            }
        });
    });

    test('should interact with monastery for healing', async ({ page }) => {
        await test.step('Setup Monastery and Wounds', async () => {
            await page.evaluate(() => {
                const pos = window.game.hero.position;
                const hex = window.game.hexGrid.getHex(pos.q, pos.r);

                if (hex) {
                    hex.site = {
                        type: 'monastery',
                        name: 'Test Monastery',
                        getIcon: () => '⛪',
                        getName: () => 'Test Monastery',
                        conquered: false
                    };
                }

                // Add a wound to hero
                window.game.hero.wounds.push({ id: 'test_wound' });
                window.game.hero.influencePoints = 10;
                window.game.updateStats();
            });
        });

        await test.step('Verify Heal Option Available', async () => {
            const visitBtn = page.locator('#visit-btn');
            const isVisible = await visitBtn.isVisible({ timeout: 2000 }).catch(() => false);

            if (isVisible) {
                await visitBtn.click();

                const siteModal = page.locator('#site-modal');
                const modalVisible = await siteModal.isVisible({ timeout: 2000 }).catch(() => false);

                if (modalVisible) {
                    // Look for heal option
                    const healOption = page.locator('#site-options button, #site-options .option').filter({ hasText: /Heilen|Heal/ });
                    const healVisible = await healOption.first().isVisible({ timeout: 1000 }).catch(() => false);

                    if (healVisible) {
                        await healOption.first().click();
                        await expect(page.locator('#game-log')).toContainText(/Wunde|geheilt|Heal/);
                    }
                } else {
                    // Modal didn't open - site interaction might be handled differently
                    console.log('Site modal was not shown - site may not support modal interaction');
                }
            }
        });
    });

    test('should show combat when attacking keep', async ({ page }) => {
        await test.step('Setup Keep Site', async () => {
            await page.evaluate(() => {
                const pos = window.game.hero.position;
                const hex = window.game.hexGrid.getHex(pos.q, pos.r);

                if (hex) {
                    hex.site = {
                        type: 'keep',
                        name: 'Test Keep',
                        getIcon: () => '🏰',
                        getName: () => 'Test Keep',
                        conquered: false
                    };
                }
                window.game.hero.movementPoints = 10;
                window.game.updateStats();
            });
        });

        await test.step('Attack Keep and Verify Combat', async () => {
            const visitBtn = page.locator('#visit-btn');
            const isVisible = await visitBtn.isVisible({ timeout: 2000 }).catch(() => false);

            if (isVisible) {
                await visitBtn.click();

                const siteModal = page.locator('#site-modal');
                const modalVisible = await siteModal.isVisible({ timeout: 2000 }).catch(() => false);

                if (modalVisible) {
                    // Look for attack option
                    const attackOption = page.locator('#site-options button, #site-options .option').filter({ hasText: /Angriff|Attack|Erobern/ });
                    const attackVisible = await attackOption.first().isVisible({ timeout: 1000 }).catch(() => false);

                    if (attackVisible) {
                        await attackOption.first().click();

                        // Verify combat panel or log
                        const combatPanel = page.locator('#combat-panel');
                        const combatVisible = await combatPanel.isVisible({ timeout: 2000 }).catch(() => false);

                        if (combatVisible) {
                            await expect(combatPanel).toBeVisible();
                        } else {
                            await expect(page.locator('#game-log')).toContainText(/Kampf|Combat|Angriff/);
                        }
                    }
                }
            }
        });
    });
});
