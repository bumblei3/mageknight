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

        // Find and click a movement card (green card)
        const movementCardPlayed = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            const hand = game?.hero?.hand;
            if (!hand || hand.length === 0) return { success: false, reason: 'No cards in hand' };

            // Find a movement card
            const movementCard = hand.find((/** @type {any} */ c) =>
                c.type === 'movement' ||
                c.basicEffect?.type === 'movement' ||
                c.color === 'green'
            );

            if (!movementCard) return { success: false, reason: 'No movement card found', hand: hand.map((/** @type {any} */ c) => c.name) };

            // Play the card
            const cardIndex = hand.indexOf(movementCard);
            game.playCard(cardIndex, 'basic');
            return { success: true, cardName: movementCard.name, cardIndex };
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

        // Check if movement mode is active
        const movementModeActive = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return game?.movementMode;
        });
        console.log('Movement mode active:', movementModeActive);
        expect(movementModeActive).toBe(true);

        // Get a valid adjacent hex to move to
        const targetHex = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            const hero = game?.hero;
            const hexGrid = game?.hexGrid;
            if (!hero || !hexGrid) return null;

            const neighbors = hexGrid.getNeighbors(hero.position.q, hero.position.r);
            // Find a revealed, passable neighbor
            for (const n of neighbors) {
                const hex = hexGrid.getHex(n.q, n.r);
                if (hex && hex.revealed && hex.terrain !== 'water') {
                    return { q: n.q, r: n.r };
                }
            }
            return null;
        });

        console.log('Target hex:', targetHex);
        expect(targetHex).not.toBeNull();

        // Convert hex to pixel coordinates and click
        const clickPos = await page.evaluate((target) => {
            const game = /** @type {any} */ (window).game;
            const hexGrid = game?.hexGrid;
            if (!hexGrid || !target) return null;
            const pixel = hexGrid.axialToPixel(target.q, target.r);
            return pixel;
        }, targetHex);

        console.log('Click position:', clickPos);
        expect(clickPos).not.toBeNull();

        // Get canvas bounding rect and click
        const canvas = page.locator('#game-board');
        const canvasBox = await canvas.boundingBox();
        expect(canvasBox).not.toBeNull();

        if (canvasBox && clickPos) {
            // Scale pixel coordinates to screen coordinates
            const screenX = canvasBox.x + (clickPos.x / 1600) * canvasBox.width;
            const screenY = canvasBox.y + (clickPos.y / 1200) * canvasBox.height;

            console.log('Screen click:', { screenX, screenY });
            await page.mouse.click(screenX, screenY);
            await page.waitForTimeout(500);
        }

        // Verify hero moved
        const finalPos = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return game?.hero?.position ?
                { q: game.hero.position.q, r: game.hero.position.r } : null;
        });
        console.log('Final hero position:', finalPos);

        expect(finalPos).not.toBeNull();
        if (finalPos && initialPos) {
            expect(finalPos.q !== initialPos.q || finalPos.r !== initialPos.r).toBe(true);
        }
    });

    test('should highlight reachable hexes when movement mode is active', async ({ page }) => {
        // Play a movement card programmatically
        await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            game.hero.movementPoints = 5;
            game.movementMode = true;
            game.actionManager.updateReachableHexes();
            game.render();
        });
        await page.waitForTimeout(300);

        // Check that hexes are highlighted
        const highlightedCount = await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            return game?.hexGrid?.highlightedHexes?.size || 0;
        });

        console.log('Highlighted hexes:', highlightedCount);
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
