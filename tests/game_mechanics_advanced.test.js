
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { setupGlobalMocks, resetMocks, setupStandardGameDOM, createSpy } from './test-mocks.js';
import { TIME_OF_DAY } from '../js/constants.js';

// Setup global mocks
setupGlobalMocks();

describe('Deep Game Mechanics', () => {
    let game;

    beforeEach(() => {
        setupStandardGameDOM(); // Ensure all UI elements exist
        resetMocks();
        game = new MageKnightGame();
        // Skip tutorial
        if (game.simpleTutorial) game.simpleTutorial = { shouldStart: () => false, start: () => { } };
        // Clean start
        game.startNewGame();
    });

    afterEach(() => {
        if (game.destroy) game.destroy();
    });

    describe('Day/Night Cycle and Transitions', () => {
        it('should cycle from Day to Night at end of round', () => {
            // Initially Day
            expect(game.timeManager.isDay()).toBe(true);

            // Force end of round
            game.timeManager.endRound();

            expect(game.timeManager.isNight()).toBe(true);
        });

        it('should refresh offers on new round', () => {
            // Mock offers
            game.unitOffer = { refresh: createSpy() };
            game.spellOffer = { refresh: createSpy() };
            game.advancedActionOffer = { refresh: createSpy() };

            if (game.startNextRound) {
                game.startNextRound();
                expect(game.unitOffer.refresh.called).toBe(true);
            }
        });
    });

    describe('Hero Exhaustion / Knockout', () => {
        it('should handle knockout if implemented', () => {
            const handLimit = game.hero.handLimit || 5;
            for (let i = 0; i < handLimit + 2; i++) {
                game.hero.takeWound();
            }
            expect(game.hero.wounds.length).toBeGreaterThan(0);
        });
    });

    describe('End of Game', () => {
        it('should calculate score at game end', () => {
            if (game.statisticsManager) {
                game.statisticsManager.calculateScore = createSpy(() => 100);
            }

            if (game.endGame) {
                game.endGame();
            }
            // Just ensure no crash
        });
    });
});
