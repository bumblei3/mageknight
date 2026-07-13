import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * Browser-side regression coverage for the corrupt-null-enemy data-integrity
 * fixes from the unit foundation work (Rounds 15-18):
 *   - Combat.getState() must skip a null enemy in this.enemies (combat.ts:430).
 *   - GameStateManager.getGameState() must skip null enemies in both
 *     combat.enemies and entityManager.enemies.
 *   - ScenarioManager.checkVictory() -> checkBossDefeated() must skip null
 *     enemies in game.enemies.
 *
 * These are exercised end-to-end: we inject a null enemy into the live
 * combat/enemy lists, then run the real serialize/victory paths in the browser
 * and assert no exception is thrown and the game keeps working.
 */
test.describe('Corrupt null-enemy resilience (foundation regression)', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        page.on('console', (msg) => console.log(`BROWSER LOG: ${msg.text()}`));
        await page.addInitScript(() => {
            window.isTestEnvironment = true;
        });
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('serializes combat state with a null enemy without crashing', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Enter a combat if not already, then poison combat.enemies with null.
            let threw = null;
            let ok = false;
            try {
                if (!window.game.combat) {
                    // Start a minimal combat via the public API if available.
                    window.game.startCombat ? window.game.startCombat() : null;
                }
                const combat = window.game.combat;
                if (combat && Array.isArray(combat.enemies)) {
                    combat.enemies = [combat.enemies[0], null].filter(Boolean).concat([null]);
                }
                // getGameState serializes combat.enemies + entityManager.enemies.
                const state = window.game.stateManager.getGameState();
                ok = !!state;
            } catch (e) {
                threw = String(e && e.message ? e.message : e);
            }
            return { threw, ok };
        });

        expect(result.threw, `getGameState threw on null combat enemy: ${result.threw}`).toBeNull();
        expect(result.ok).toBe(true);
    });

    test('entityManager.enemies with a null entry still serializes', async ({ page }) => {
        const result = await page.evaluate(() => {
            let threw = null;
            let count = -1;
            try {
                if (window.game.entityManager && Array.isArray(window.game.entityManager.enemies)) {
                    window.game.entityManager.enemies = window.game.entityManager.enemies.concat([null]);
                }
                const state = window.game.stateManager.getGameState();
                count = state.enemies.length;
            } catch (e) {
                threw = String(e && e.message ? e.message : e);
            }
            return { threw, count };
        });

        expect(result.threw, `getGameState threw on null entityManager enemy: ${result.threw}`).toBeNull();
        expect(result.count).toBeGreaterThanOrEqual(0);
    });

    test('checkVictory does not crash with a null enemy in game.enemies', async ({ page }) => {
        const result = await page.evaluate(() => {
            let threw = null;
            let victory = null;
            try {
                if (Array.isArray(window.game.enemies)) {
                    window.game.enemies = window.game.enemies.concat([null]);
                }
                // Force a volkare scenario so checkBossDefeated runs over game.enemies.
                window.game.scenarioManager.loadScenario('volkare_quest');
                const v = window.game.scenarioManager.checkVictory();
                victory = v ? (v.victory === true) : false;
            } catch (e) {
                threw = String(e && e.message ? e.message : e);
            }
            return { threw, victory };
        });

        expect(result.threw, `checkVictory threw on null game enemy: ${result.threw}`).toBeNull();
        expect(typeof result.victory).toBe('boolean');
    });
});
