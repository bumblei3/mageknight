import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';

// Mock global.confirm
const originalConfirm = global.confirm;

describe('Game Reset', () => {
    let game;

    beforeEach(() => {
        game = new MageKnightGame();
        // Mock confirm to always return true
        global.confirm = () => true;
    });

    afterEach(() => {
        // Restore confirm
        global.confirm = originalConfirm;
    });

    it('should reset game state on reset()', () => {
        // Modify state
        game.turnNumber = 5;
        game.hero.movementPoints = 3;

        // Call reset
        game.reset();

        // Verify reset
        expect(game.turnNumber).toBe(0);
        expect(game.hero.movementPoints).toBe(0);
        expect(game.gameState).toBe('playing');
    });

    it('should re-initialize hero and map on reset()', () => {
        const originalHeroId = game.hero.id; // Assuming hero has ID or we check object reference
        const originalMapManager = game.mapManager;

        game.reset();

        expect(game.hero).not.toBe(originalHeroId); // Should be new object
        expect(game.mapManager).not.toBe(originalMapManager);
    });

    it('should not reset if confirm is cancelled', () => {
        global.confirm = () => false;
        game.turnNumber = 5;

        game.reset();

        expect(game.turnNumber).toBe(5);
    });
});
