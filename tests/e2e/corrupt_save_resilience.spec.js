import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * Browser-side regression coverage for the Save/Load data-integrity fixes
 * from the unit foundation work (Rounds 5-7):
 *   - GameStateManager.loadGameState must tolerate a null entry inside the
 *     enemies array (reconstituteEnemy(null) used to crash on null.isBoss).
 *   - Hero.loadState via idsToCards must drop null/foreign objects from card
 *     lists instead of letting them leak into deck/hand/discard.
 *
 * These are exercised end-to-end here: we craft a deliberately corrupt save
 * object, push it through the real loadGameState path in the browser, and
 * assert the game does not throw and remains playable.
 */
test.describe('Corrupt save resilience (foundation regression)', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        page.on('console', (msg) => console.log(`BROWSER LOG: ${msg.text()}`));
        await page.addInitScript(() => {
            window.isTestEnvironment = true;
        });
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('tolerates a null entry inside the enemies array on load', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Capture a real, valid save first, then poison the enemies array.
            window.game.stateManager.saveGame('corrupt_enemies_probe');
            const valid = window.game.stateManager.loadGameRaw('corrupt_enemies_probe');
            const poisoned = JSON.parse(JSON.stringify(valid));
            poisoned.enemies = [null, ...(poisoned.enemies || [])];

            // Capture any thrown error so the test can assert, not crash the page.
            let threw = null;
            let ok = false;
            try {
                ok = window.game.stateManager.loadGameState(poisoned);
            } catch (e) {
                threw = String(e && e.message ? e.message : e);
            }
            return { threw, ok, enemies: window.game.entityManager.enemies.length };
        });

        expect(result.threw, `loadGameState threw on null-enemy: ${result.threw}`).toBeNull();
        expect(result.ok).toBe(true);
        // No null entries should have leaked into the live enemy list.
        const hasNull = await page.evaluate(() =>
            window.game.entityManager.enemies.some((e) => e === null || e === undefined)
        );
        expect(hasNull).toBe(false);
    });

    test('drops null/foreign card entries from hero card lists on load', async ({ page }) => {
        const result = await page.evaluate(() => {
            window.game.stateManager.saveGame('corrupt_cards_probe');
            const valid = window.game.stateManager.loadGameRaw('corrupt_cards_probe');
            const poisoned = JSON.parse(JSON.stringify(valid));
            // Poison the hero deck with a null and a non-Card foreign object.
            poisoned.hero = poisoned.hero || {};
            poisoned.hero.deck = [null, { foo: 'bar' }, ...((poisoned.hero.deck) || [])];

            let threw = null;
            let ok = false;
            try {
                ok = window.game.stateManager.loadGameState(poisoned);
            } catch (e) {
                threw = String(e && e.message ? e.message : e);
            }
            return { threw, ok };
        });

        expect(result.threw, `loadGameState threw on corrupt card list: ${result.threw}`).toBeNull();
        expect(result.ok).toBe(true);

        // The deck must contain only real Card instances (no null / foreign objects).
        const clean = await page.evaluate(() => {
            const deck = window.game.hero.deck;
            return deck.every(
                (c) => c !== null && c !== undefined && typeof c === 'object' && typeof c.id !== 'undefined'
            );
        });
        expect(clean).toBe(true);
    });

    test('game remains playable after loading a corrupt save', async ({ page }) => {
        await page.evaluate(() => {
            window.game.stateManager.saveGame('corrupt_playable_probe');
            const valid = window.game.stateManager.loadGameRaw('corrupt_playable_probe');
            const poisoned = JSON.parse(JSON.stringify(valid));
            poisoned.enemies = [null];
            poisoned.hero = poisoned.hero || {};
            poisoned.hero.deck = [null, { foo: 'bar' }];
            window.game.stateManager.loadGameState(poisoned);
        });

        // The HUD and board must still be present and the game still 'playing'.
        await expect(page.locator('.hud-top-bar')).toBeVisible();
        await expect(page.locator('canvas#game-board')).toBeVisible();
        const state = await page.evaluate(() => window.game.gameState);
        expect(state).toBe('playing');
    });
});
