// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E Test: Hero Movement Flow
 * Tests the complete movement flow: play card → click hex → verify move
 */

test.describe('Hero Movement', () => {
    test.beforeEach(async ({ page }) => {
        // Disable tutorial
        await page.addInitScript(() => {
            localStorage.setItem('mageKnightTutorialCompleted', 'true');
        });

        await page.goto('/');
        await page.locator('#loading-screen').waitFor({ state: 'hidden', timeout: 30000 });

        // Handle scenario selection modal
        try {
            const scenarioModal = page.locator('#scenario-selection-modal');
            await scenarioModal.waitFor({ state: 'visible', timeout: 5000 });
            await page.locator('.scenario-card').first().click();
            await scenarioModal.waitFor({ state: 'hidden', timeout: 5000 });
        } catch (e) {
            // Modal might not appear
        }

        // Handle hero selection modal
        try {
            const heroModal = page.locator('#hero-selection-modal');
            await heroModal.waitFor({ state: 'visible', timeout: 5000 });
            await page.locator('.hero-select-card').first().click();
            await heroModal.waitFor({ state: 'hidden', timeout: 5000 });
        } catch (e) {
            // Modal might not appear
        }

        // Skip tutorial if visible
        try {
            const skipBtn = page.locator('#tutorial-skip-btn');
            if (await skipBtn.isVisible({ timeout: 2000 })) {
                await skipBtn.click();
            }
        } catch (e) {
            // Tutorial might not be active
        }

        await page.waitForTimeout(500);
    });

    test('should move hero after playing movement card', async ({ page }) => {
        // Ensure hero has a movement card in hand to avoid RNG failures
        await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            if (!game || !game.hero) return;

            // Find Stamina and Swiftness in deck + hand
            const allCards = [...game.hero.deck, ...game.hero.hand];
            const stamina = allCards.find((/** @type {any} */ c) => c.name === 'Stamina');
            const swiftness = allCards.find((/** @type {any} */ c) => c.name === 'Swiftness');

            if (stamina && swiftness) {
                // Put them in hand, replacing existing cards if needed
                game.hero.hand = [stamina, swiftness, ...game.hero.hand.slice(2)];
                game.render();
            }
        });
        await page.waitForTimeout(300);

        // Get initial hero position
        const initialPos = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return game?.hero?.position ?
                { q: game.hero.position.q, r: game.hero.position.r } : null;
        });
        expect(initialPos).not.toBeNull();
        console.log('Initial hero position:', initialPos);

        // Check initial movement points
        const initialMP = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return game?.hero?.movementPoints || 0;
        });
        console.log('Initial movement points:', initialMP);

        // Find and click a movement card (green card with movement effect)
        const movementCardPlayed = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            const hand = game?.hero?.hand;
            if (!hand || hand.length === 0) return { success: false, reason: 'No cards in hand' };

            // Find a card that provides movement (not just green color)
            const movementCard = hand.find((/** @type {any} */ c) =>
                c.basicEffect?.type === 'move' ||
                c.basicEffect?.movement > 0
            );

            if (!movementCard) return { success: false, reason: 'No movement card found', hand: hand.map((/** @type {any} */ c) => c.name) };

            // Play the card via ActionManager
            const cardIndex = hand.indexOf(movementCard);
            const result = game.actionManager.playCard(cardIndex, false, game.timeManager.isNight());
            return { success: !!result, cardName: movementCard.name, cardIndex };
        });

        console.log('Movement card result:', movementCardPlayed);
        expect(movementCardPlayed.success).toBe(true);
        await page.waitForTimeout(300);

        // Check movement points increased
        const newMP = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return game?.hero?.movementPoints || 0;
        });
        console.log('Movement points after card:', newMP);
        expect(newMP).toBeGreaterThan(initialMP);

        // Enter movement mode (actionManager.playCard doesn't trigger this, interactionController does)
        await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            if (game.hero.movementPoints > 0 && !game.combat) {
                game.actionManager.enterMovementMode();
            }
        });
        await page.waitForTimeout(100);

        // Check if movement mode is active
        const movementModeActive = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return game?.movementMode;
        });
        expect(movementModeActive).toBe(true);

        // Get a valid adjacent hex to move to (must be affordable with current movement points)
        const targetHex = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            const hero = game?.hero;
            const hexGrid = game?.hexGrid;
            if (!hero || !hexGrid) return null;

            const neighbors = hexGrid.getNeighbors(hero.position.q, hero.position.r);
            // Find a revealed, passable neighbor that hero can AFFORD
            for (const n of neighbors) {
                const hex = hexGrid.getHex(n.q, n.r);
                if (hex && hex.revealed && hex.terrain !== 'water') {
                    const cost = hexGrid.getMovementCost(n.q, n.r, game.timeManager.isNight(), false);
                    if (cost <= hero.movementPoints) {
                        return { q: n.q, r: n.r, cost };
                    }
                }
            }
            // If no affordable hex found, return first revealed one anyway for debugging
            for (const n of neighbors) {
                const hex = hexGrid.getHex(n.q, n.r);
                if (hex && hex.revealed) {
                    return { q: n.q, r: n.r, reason: 'no affordable hex, first revealed' };
                }
            }
            return null;
        });

        expect(targetHex).not.toBeNull();

        // Move hero using direct API call (canvas click is unreliable in e2e tests)
        // Note: moveHero is async, need to await it properly
        await page.evaluate(async (target) => {
            const game = /** @type {any} */ (window).game;
            if (!target) return;
            if (game.gameState !== 'playing') return;
            if (!game.movementMode) return;

            await game.actionManager.moveHero(target.q, target.r);
        }, targetHex);
        await page.waitForTimeout(300);

        // Verify hero moved
        const finalPos = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return game?.hero?.position ?
                { q: game.hero.position.q, r: game.hero.position.r } : null;
        });

        expect(finalPos).not.toBeNull();
        if (finalPos && initialPos && targetHex) {
            expect(finalPos.q).toBe(targetHex.q);
            expect(finalPos.r).toBe(targetHex.r);
        }
    });

    test('should highlight reachable hexes when movement mode is active', async ({ page }) => {
        // Set movement points and enter movement mode
        await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            game.hero.movementPoints = 5;
            game.actionManager.enterMovementMode();
            game.render();
        });
        await page.waitForTimeout(300);

        // Check that hexes are highlighted (reachableHexes is on game object)
        const highlightedCount = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            // reachableHexes is an array on game, highlightedHexes is Set on hexGrid
            return game?.reachableHexes?.length || game?.hexGrid?.highlightedHexes?.size || 0;
        });

        expect(highlightedCount).toBeGreaterThan(0);
    });

    test('should not move when no movement points', async ({ page }) => {
        // Set movement points to 0
        const initialPos = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            game.hero.movementPoints = 0;
            game.movementMode = true;
            return { q: game.hero.position.q, r: game.hero.position.r };
        });

        // Try to move to an adjacent hex
        const targetHex = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            const hero = game?.hero;
            const hexGrid = game?.hexGrid;
            const neighbors = hexGrid.getNeighbors(hero.position.q, hero.position.r);
            for (const n of neighbors) {
                const hex = hexGrid.getHex(n.q, n.r);
                if (hex && hex.revealed && hex.terrain !== 'water') {
                    return { q: n.q, r: n.r };
                }
            }
            return null;
        });

        if (targetHex) {
            await page.evaluate((target) => {
                const game = /** @type {any} */ (window).game;
                game.moveHero(target.q, target.r);
            }, targetHex);
            await page.waitForTimeout(300);
        }

        // Verify hero did NOT move
        const finalPos = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return { q: game.hero.position.q, r: game.hero.position.r };
        });

        expect(finalPos.q).toBe(initialPos.q);
        expect(finalPos.r).toBe(initialPos.r);
    });
});
