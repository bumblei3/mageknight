import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockElement, createMockCanvas, createSpy, createMockContext } from './test-mocks.js';

describe('Long Session - Integration', () => {
    let game;
    let originalGetElementById, originalQuerySelector;

    beforeEach(() => {
        originalGetElementById = global.document.getElementById;
        originalQuerySelector = global.document.querySelector;

        global.document.getElementById = (id) => {
            const el = createMockElement('div');
            el.id = id;
            if (id === 'game-board') el.getContext = () => createMockContext();
            return el;
        };
        global.document.querySelector = () => createMockElement('div');

        game = new MageKnightGame();
        // Mock heavy systems to avoid actual timers/loops
        game.sound = { play: () => { }, success: () => { } };
        game.particles = { start: () => { }, stop: () => { }, burst: () => { }, addParticle: () => { } };
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        global.document.getElementById = originalGetElementById;
        global.document.querySelector = originalQuerySelector;
    });

    it('should maintain state over a 3-turn sequence', () => {
        // Turn 1: Initialization
        expect(game.turnNumber).toBe(0);
        const initialDeckSize = game.hero.deck.length;

        // Turn 0: End Turn
        game.endTurn();
        expect(game.turnNumber).toBe(1);

        // Turn 1: Gain Fame (combat result simulation)
        game.ui.showLevelUpModal = createSpy((level, data, callback) => {
            // Simulate selecting first skill and card
            callback({ skill: data.skills[0], card: data.cards[0] });
        });

        game.gainFame(15); // Level up happens at 10
        expect(game.hero.level).toBe(2);
        expect(game.hero.skills.length).toBeGreaterThan(0);

        // Turn 1: End Turn
        game.endTurn();
        expect(game.turnNumber).toBe(2);

        // Turn 3: Check day/night transition if applicable (requires timeManager)
        // The game cycles day/night after turns? Or rounds? 
        // Let's check consistency
        // Turn 3: Check day/night transition if applicable (requires timeManager)
        // The game cycles day/night after turns? Or rounds? 
        // Let's check consistency
        expect(game.hero.fame).toBeGreaterThanOrEqual(15);
        expect(game.hero.level).toBe(2);
    });

    it('should survive save/load in the middle of a session', () => {
        game.hero.fame = 25;
        game.turnNumber = 4;

        const state = game.getGameState();
        const newGame = new MageKnightGame();
        newGame.loadGameState(state);

        expect(newGame.hero.fame).toBe(25);
        expect(newGame.turnNumber).toBe(4);
    });
});
