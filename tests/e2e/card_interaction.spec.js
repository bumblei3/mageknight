
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

    test('should play basic card effect by clicking (auto-play without mana)', async ({ page }) => {
        // Initial state
        const initialPoints = await page.evaluate(() => window.game.hero.movementPoints);
        expect(initialPoints).toBe(0);

        // Click Stamina card (Green) - use pointer events to match HandRenderer
        // Since no mana is available, the basic effect should auto-play without modal
        const card = page.locator('.card', { hasText: 'Stamina' });
        await card.dispatchEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 });
        await card.dispatchEvent('pointerup', { button: 0, clientX: 0, clientY: 0 });

        // No modal should appear (auto-play basic effect)
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

        // Click it using pointer events
        await woundCard.dispatchEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 });
        await woundCard.dispatchEvent('pointerup', { button: 0, clientX: 0, clientY: 0 });

        // Hand size should NOT change (3 cards)
        const handSize = await page.locator('#hand-cards .card').count();
        expect(handSize).toBe(3);
    });

    test('should open modal for strong effect if mana is available', async ({ page }) => {
        // Give usable mana to hero (tempMana is what spendMana checks)
        await page.evaluate(() => {
            window.game.hero.tempMana = ['green'];
        });

        // Click Stamina card (Green) using pointer events
        const card = page.locator('.card', { hasText: 'Stamina' });
        await card.dispatchEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 });
        await card.dispatchEvent('pointerup', { button: 0, clientX: 0, clientY: 0 });

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
