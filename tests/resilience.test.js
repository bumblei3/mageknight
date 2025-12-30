import { describe, it, expect, beforeEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { setupGlobalMocks } from './test-mocks.js';
import { MANA_COLORS } from '../js/constants.js';

describe('Resilience & State Drift Tests', () => {
    let game;

    beforeEach(() => {
        setupGlobalMocks();
        document.body.innerHTML = '<canvas id="game-board"></canvas>';
        game = new MageKnightGame();
    });

    it('should maintain consistent card count over many pseudo-random actions', () => {
        const initialDeckSize = game.hero.deck.length + game.hero.hand.length + game.hero.discard.length;

        // Simulate 50 actions (play, draw, end turn)
        for (let i = 0; i < 50; i++) {
            if (game.hero.hand.length > 0) {
                // Play a random card
                const cardIndex = Math.floor(Math.random() * game.hero.hand.length);
                game.hero.playCard(cardIndex, false);
            } else {
                game.hero.endTurn();
                // game.hero.drawCards() is automatically called by endTurn() in some versions, 
                // but let's be explicit if we want to ensure cards are in hand.
                game.hero.drawCards();
            }

            // Periodically check consistency
            const currentTotal = game.hero.deck.length + game.hero.hand.length + game.hero.discard.length;
            expect(currentTotal).toBe(initialDeckSize);
        }
    });

    it('should handle NaN or null inputs gracefully in core methods', () => {
        // Hero movement
        game.hero.moveTo(NaN, undefined);

        // Hero takes damage
        game.hero.takeWound(null);

        // Mana management
        expect(game.hero.hasMana(null)).toBe(false);
        expect(game.hero.spendMana(undefined)).toBe(false);

        // Combat attack
        if (game.combat) {
            game.combat.attackEnemies(NaN);
        }
    });

    it('should not crash on invalid card playing', () => {
        expect(game.hero.playCard(-1, false)).toBe(null);
        expect(game.hero.playCard(999, true)).toBe(null);
    });

    it('should handle multiple rapid reset calls gracefully', () => {
        game.startNewGame();
        game.startNewGame();
        game.startNewGame();
    });
});
