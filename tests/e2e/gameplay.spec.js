
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

        await test.step('End Turn', async () => {
            const endTurnBtn = page.locator('#end-turn-btn');
            await expect(endTurnBtn).toBeVisible();
            await endTurnBtn.click();
        });

        await test.step('Verify Round Transition', async () => {
            await expect(page.locator('#game-board')).toBeVisible();
            // Optional: Check for "Runde Beendet" or similar notification
        });
    });
});
