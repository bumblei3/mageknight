import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * Browser-side regression for the combat panel visibility bug (UI hardening).
 *
 * The combat panel sits in the right sidebar, which previously extended to
 * `calc(100vh - 100px)` and was overlapped by the fixed bottom hand/action
 * dock (height 320px) — so the enemy cards and the execute button were
 * hidden behind it. Verifies the panel (and its execute button) is fully
 * above the bottom dock after a real combat start.
 */

test.describe('Combat Panel Visibility', () => {
    test.beforeEach(async ({ page }) => {
        const flow = new GameFlow(page);
        await flow.ensureGameStarted();
        await page.evaluate(() => {
            const game = window.game;
            game.hero.position = { q: 1, r: 0 };
            const enemy = game.enemyAI.generateEnemy('plains', 1);
            enemy.name = 'Test Orc';
            enemy.position = { q: 1, r: 0 };
            enemy.armor = 3;
            enemy.health = 3;
            enemy.attack = 2;
            game.enemies.push(enemy);
            let hex = game.hexGrid.getHex(1, 0);
            if (!hex) {
                game.hexGrid.logic.addHex(1, 0, 'plains');
                hex = game.hexGrid.getHex(1, 0);
            }
            hex.revealed = true;
            // Real engagement path
            game.interactionController.selectHex(1, 0);
        });
        await expect(page.locator('#combat-panel')).toBeVisible({ timeout: 8000 });
    });

    test('combat panel interactive controls sit above the bottom dock', async ({ page }) => {
        // The execute button is the key control — it must be fully on-screen
        // and not overlapped by the fixed bottom hand/action dock.
        const btn = page.locator('#execute-attack-btn');
        await expect(btn).toBeVisible({ timeout: 5000 });

        const clearOfDock = await page.evaluate(() => {
            const btn = document.getElementById('execute-attack-btn');
            const dock = document.querySelector('.bottom-dock');
            if (!btn || !dock) return false;
            const br = btn.getBoundingClientRect();
            const dr = dock.getBoundingClientRect();
            return br.bottom <= dr.top + 1; // whole button above dock top
        });
        expect(clearOfDock, 'execute button must not be hidden behind the bottom dock').toBe(true);
    });

    test('enemy cards and execute button are visible (not hidden by dock)', async ({ page }) => {
        const btn = page.locator('#execute-attack-btn');
        await expect(btn).toBeVisible({ timeout: 5000 });

        const btnHiddenByDock = await page.evaluate(() => {
            const btn = document.getElementById('execute-attack-btn');
            const dock = document.querySelector('.bottom-dock');
            if (!btn || !dock) return false;
            const br = btn.getBoundingClientRect();
            const dr = dock.getBoundingClientRect();
            // Button center must sit above the dock's top edge
            return br.top + br.height / 2 > dr.top;
        });
        expect(btnHiddenByDock).toBe(false);

        // At least one enemy card is rendered and within the visible area
        const enemyVisible = await page.locator('.enemy-card').first().isVisible();
        expect(enemyVisible).toBe(true);
    });
});
