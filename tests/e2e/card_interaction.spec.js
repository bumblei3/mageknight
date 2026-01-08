
import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow';

test.describe('Card Interaction Flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.goto('/');
        await page.locator('#loading-screen').waitFor({ state: 'hidden', timeout: 15000 });

        // Setup game state
        await page.evaluate(() => {
            console.log('Setting up test state...');
            const Game = window.game;
            // Ensure we have a clean state without enemies nearby for interaction tests
            Game.mapManager.hexGrid.setHex(0, 0, { terrain: 'plains' });
            Game.hero.reset();
            Game.hero.position = { q: 0, r: 0 };

            // Finding cards: Check both deck and current hand (since game auto-draws)
            const allCards = [...Game.hero.deck, ...Game.hero.hand];
            const stamina = allCards.find(c => c.id === 'stamina' || c.name === 'Stamina');
            const promise = allCards.find(c => c.id === 'promise' || c.name === 'Promise');

            // clear hand first
            Game.hero.hand = [];

            if (stamina) Game.hero.hand.push(stamina);
            if (promise) Game.hero.hand.push(promise);

            // Add a wound
            Game.hero.takeWound();

            Game.ui.handRenderer.renderHandCards(Game.hero.hand,
                (i, c) => {
                    console.log('Card clicked:', i, c.name);
                    Game.interactionController.handleCardClick(i, c);
                },
                (i, c) => Game.interactionController.handleCardRightClick(i, c)
            );
            Game.ui.updateHeroStats(Game.hero);
        });
    });

    test('should play basic card effect by clicking', async ({ page }) => {
        // Initial state
        const initialPoints = await page.evaluate(() => window.game.hero.movementPoints);
        expect(initialPoints).toBe(0);

        // Click Stamina card (Green)
        const card = page.locator('.card', { hasText: 'Stamina' });
        await card.click();

        // Modal should appear
        const modal = page.locator('#card-play-modal');
        await expect(modal).toBeVisible();

        // Click Basic
        await page.locator('#play-basic-btn').click();

        // Verify movement points increased (Stamina gives 2)
        await expect(async () => {
            const points = await page.evaluate(() => window.game.hero.movementPoints);
            expect(points).toBe(2);
        }).toPass();

        // Verify card moved (hand size 3 -> 2)
        const handSize = await page.locator('#hand-cards .card').count();
        expect(handSize).toBe(2);
    });

    test('should show error when clicking wound card', async ({ page }) => {
        const woundCard = page.locator('.card.wound-card');
        await expect(woundCard).toBeVisible();

        // Click it
        await woundCard.click();

        // Hand size should NOT change (3 cards)
        const handSize = await page.locator('#hand-cards .card').count();
        expect(handSize).toBe(3);
    });

    test('should open modal for strong effect if mana is available', async ({ page }) => {
        // Give usable mana to hero (tempMana is what spendMana checks)
        await page.evaluate(() => {
            window.game.hero.tempMana = ['green'];
        });

        // Click Stamina card (Green)
        const card = page.locator('.card', { hasText: 'Stamina' });
        await card.click();

        // Modal should appear
        const modal = page.locator('#card-play-modal');
        await expect(modal).toBeVisible();

        // Click "Play Strong"
        await page.locator('#play-strong-btn').click();

        // Verify strong effect (Stamina Strong = 4 movement)
        await expect(async () => {
            const points = await page.evaluate(() => window.game.hero.movementPoints);
            expect(points).toBe(4);
        }).toPass();
    });

    test('should play card sideways via right click', async ({ page }) => {
        // Right click Promise card (White)
        const card = page.locator('.card', { hasText: 'Promise' });
        await card.click({ button: 'right' });

        // Sideways modal should appear
        const modal = page.locator('#sideways-modal');
        await expect(modal).toBeVisible();

        // Choose "Block" (+1 Block)
        await page.locator('.sideways-btn.block').click();

        // Verify block points increased
        await expect(async () => {
            const points = await page.evaluate(() => window.game.hero.blockPoints);
            expect(points).toBe(1);
        }).toPass();
    });
});
