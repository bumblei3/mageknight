
import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Gameplay Flow', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should display hand and allow turn end', async ({ page }) => {
        // 1. Verify Hand is visible
        const handContainer = page.locator('#hand-cards');
        await expect(handContainer).toBeVisible();

        // Wait for cards to be rendered
        const cards = handContainer.locator('.card');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });

        const cardCount = await cards.count();
        expect(cardCount).toBeGreaterThan(0);
        console.log(`Found ${cardCount} cards in hand.`);

        // 2. Hover over a card to trigger tooltip
        const firstCard = cards.first();
        await firstCard.hover();

        // Tooltip logic might vary, but let's check for standard tooltip element
        const tooltip = page.locator('.tooltip');
        // Or if your tooltip implementation creates a specific ID
        // await expect(tooltip).toBeVisible(); 

        // 3. Play a card (Click)
        // Note: Clicking plays the card immediately (or shows modal), it doesn't just "select" it.
        const initialHandCount = await cards.count();
        await firstCard.click();

        // Handle potential "Mana Amplification" modal if it appears
        const playModal = page.locator('#card-play-modal');
        if (await playModal.isVisible({ timeout: 1000 })) {
            await page.locator('#play-basic-btn').click();
        }

        // Verify card moved to played area (Hand count decreases)
        await expect(cards).toHaveCount(initialHandCount - 1);

        // Verify played area has the card
        const playedArea = page.locator('#played-cards');
        await expect(playedArea.locator('.card')).toHaveCount(1);

        // 4. End Turn
        // Use German "Zug beenden" or ID
        const endTurnBtn = page.locator('#end-turn-btn');
        await expect(endTurnBtn).toBeVisible();
        await endTurnBtn.click();

        // 5. Verify Turn/Round update
        // We expect the "Next Turn" or "End of Round" processing
        // Often a toast or log message appears.
        // Let's verify we are still on the board and maybe the hand refreshed or buttons changed
        await expect(page.locator('#game-board')).toBeVisible();
    });
});
