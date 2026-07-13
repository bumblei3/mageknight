import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * Browser-side regression for enemy-card intel tooltips (UI usefulness).
 *
 * The combat enemy cards now surface a rich hover/keyboard tooltip with
 * armor / attack / abilities (previously only a native title in ranged/block
 * phase). Verifies the rich .tooltip-enemy actually appears in the live game.
 */

test.describe('Enemy Card Intel Tooltip', () => {
    test.beforeEach(async ({ page }) => {
        const flow = new GameFlow(page);
        await flow.ensureGameStarted();

        await page.evaluate(() => {
            const game = window.game;
            const enemy = game.enemyAI.generateEnemy('plains', 3);
            enemy.name = 'Test Golem';
            enemy.position = { q: 1, r: 0 };
            enemy.armor = 4;
            enemy.attack = 7;
            enemy.fortified = true;
            enemy.poison = true;
            game.enemies.push(enemy);

            let hex = game.hexGrid.getHex(1, 0);
            if (!hex) {
                game.hexGrid.logic.addHex(1, 0, 'plains');
                hex = game.hexGrid.getHex(1, 0);
            }
            hex.revealed = true;

            game.initiateCombat(enemy);
        });

        // Wait for the enemy card to render
        await expect(page.locator('.enemy-card')).toHaveCount(1, { timeout: 8000 });
    });

    test('enemy card shows a rich tooltip on hover', async ({ page }) => {
        const card = page.locator('.enemy-card').first();
        // Dispatch a real mouseenter (Playwright's .hover() actionability can
        // misfire on cards inside a transformed combat panel)
        await card.dispatchEvent('mouseenter');

        const tooltip = page.locator('.game-tooltip .tooltip-enemy');
        await expect(tooltip).toBeVisible({ timeout: 5000 });

        // The rich tooltip must carry the enemy's armor and attack stats
        await expect(tooltip).toContainText('4'); // armor
        await expect(tooltip).toContainText('7'); // attack
        await expect(tooltip).toContainText('Test Golem');
    });

    test('enemy card is keyboard-focusable and shows tooltip on focus', async ({ page }) => {
        const card = page.locator('.enemy-card').first();
        await expect(card).toHaveAttribute('tabindex', '0');

        await card.focus();
        const tooltip = page.locator('.game-tooltip .tooltip-enemy');
        await expect(tooltip).toBeVisible({ timeout: 5000 });
        await expect(tooltip).toContainText('Test Golem');
    });
});
