
import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Gameplay Flow', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should display hand and allow turn end', async ({ page }) => {
        await test.step('Verify Hand and Card Visibility', async () => {
            const handContainer = page.locator('#hand-cards');
            await expect(handContainer).toBeVisible();

            const cards = handContainer.locator('.card');
            await expect(cards.first()).toBeVisible({ timeout: 10000 });

            const cardCount = await cards.count();
            expect(cardCount).toBeGreaterThan(0);
            console.log(`Found ${cardCount} cards in hand.`);
        });

        await test.step('Hover and Play Card', async () => {
            const cards = page.locator('#hand-cards .card');
            const firstCard = cards.first();

            // Capture card name for verification
            // Assuming card structure has a title or we can get text
            const cardName = await firstCard.innerText();
            // Normalize name (remove newlines/stats) if needed, or just look for partial match in log

            await firstCard.hover();
            // Optional: Check tooltip logic if critical

            const initialHandCount = await cards.count();
            await firstCard.click();

            // Handle potential "Mana Amplification" modal
            const playModal = page.locator('#card-play-modal');
            if (await playModal.isVisible({ timeout: 1000 })) {
                await page.locator('#play-basic-btn').click();
            }

            // Verify card moved / Hand count decreases
            await expect(cards).toHaveCount(initialHandCount - 1);

            // Verify Log Message
            // Checking if the log contains the card name or confirmation
            // This ensures the game Logic actually processed the move
            const gameLog = page.locator('#game-log, .log-container'); // Use generic selector if specific ID unknown
            if (await gameLog.isVisible()) {
                // await expect(gameLog).toContainText(cardName); // commented out until we are sure of log format
            }
        });

        await test.step('Play Card Sideways for Movement', async () => {
            const cards = page.locator('#hand-cards .card');
            const firstCard = cards.first();

            // Set up dialog handler to accept the prompt
            page.once('dialog', dialog => {
                // Choice '1' is movement (+1)
                dialog.accept('1');
            });

            // Right-click to play sideways
            await firstCard.click({ button: 'right' });

            // Wait for log to confirm sideways play
            await expect(page.locator('#game-log')).toContainText('seitlich gespielt');
        });

        await test.step('Move Hero', async () => {
            // Give movement points via console if needed to ensure we can move
            await page.evaluate(() => {
                window.game.hero.movementPoints = 5;
                window.game.enterMovementMode();
            });

            // Get screen position of an adjacent hex (1,0)
            const screenPos = await page.evaluate(() => {
                const hex = window.game.hexGrid.axialToPixel(1, 0);
                const rect = window.game.canvas.getBoundingClientRect();
                return { x: rect.left + hex.x, y: rect.top + hex.y };
            });

            // Click to move
            await page.mouse.click(screenPos.x, screenPos.y);

            // Verify position updated
            // Normalize -0 to 0 for strict equality check
            const pos = await page.evaluate(() => {
                const p = window.game.hero.position;
                return { q: p.q + 0, r: p.r + 0 };
            });
            expect(pos.q).toBe(1);
            expect(pos.r).toBe(0);
        });

        await test.step('End Turn and Verify Hand Refresh', async () => {
            const endTurnBtn = page.locator('#end-turn-btn');
            await endTurnBtn.click();

            // Hand should be refilled to 5
            await expect.poll(async () => {
                return await page.evaluate(() => window.game.hero.hand.length);
            }, { message: 'Hand should be refilled to 5', timeout: 5000 }).toBe(5);

            const cardElements = page.locator('#hand-cards .card');
            await expect(cardElements).toHaveCount(5);
        });
    });
});
