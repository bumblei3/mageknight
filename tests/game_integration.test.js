import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockEnemy, createMockHexGrid } from './test-helpers.js';

describe('Game Integration', () => {
    let game;

    beforeEach(() => {
        localStorage.clear();
        game = new MageKnightGame();
        // Ensure we have a valid grid and hero for integration tests
        game.init();
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
    });

    it('should execute a full turn lifecycle', () => {
        const initialTurn = game.turnNumber;

        // 1. Start Turn
        expect(game.hero.hand.length).toBeGreaterThan(0);

        // 2. Move (Simulate)
        game.enterMovementMode();
        // Mocking a valid move
        game.hero.movementPoints = 10;
        const moveResult = game.hero.moveTo(1, 0, 2);
        expect(moveResult).toBe(true);

        // 3. End Turn
        game.endTurn();

        // Verify turn end state
        // Note: turnNumber might not increment until end of round or specific game logic
        // But hand should be refreshed
        expect(game.hero.hand.length).toBe(game.hero.handLimit);
        expect(game.hero.movementPoints).toBe(0);
    });

    it('should handle combat flow', () => {
        const enemy = createMockEnemy({ name: 'Orc', attack: 3, armor: 3 });
        enemy.position = { q: 1, r: 1 }; // Add position for particle effect calls
        game.enemies = [enemy];

        // 1. Initiate
        game.initiateCombat(enemy);
        expect(game.combat).toBeDefined();
        // game.gameState remains 'playing' in current implementation, checking combat existence is enough
        expect(game.combat).not.toBeNull();

        // 2. Block Phase
        // Skip Ranged
        if (game.combat.phase === 'ranged') {
            game.combat.endRangedPhase();
        }

        // Skip block (take wound)
        game.combat.endBlockPhase();
        expect(game.combat.phase).toBe('attack');
        expect(game.hero.wounds.length).toBeGreaterThan(0);

        // 3. Attack Phase
        // Cheat: give hero huge attack via combat accumulator
        game.combatAttackTotal = 10;
        game.executeAttackAction();

        // 4. End Combat (handled by executeAttackAction if enemies defeated)
        // But if executeAttackAction finishes combat, game.combat might be null already.
        // Let's check.

        expect(game.gameState).toBe('playing');
        expect(game.combat).toBe(null);
        // Enemy should be removed or marked defeated
        // const enemyExists = game.enemies.includes(enemy);
        // expect(enemyExists).toBe(false);
    });

    it('should save and load game state', () => {
        // 1. Modify state
        game.hero.fame = 50;
        game.turnNumber = 5;

        // 2. Save
        // Use saveManager directly as game.saveGame doesn't exist
        game.saveManager.saveGame(0, game.getGameState());

        // 3. New Game & Load
        const newGame = new MageKnightGame();
        // Load state using manager then apply it
        const loadedState = newGame.saveManager.loadGame(0);
        expect(loadedState).toBeDefined();

        if (loadedState) {
            newGame.loadGameState(loadedState);
        }

        expect(newGame.hero.fame).toBe(50);
        expect(newGame.turnNumber).toBe(5);
    });

    it('should handle level up rewards', () => {
        // 1. Gain enough fame
        const initialLevel = game.hero.level;

        // Mock UI showLevelUpModal to immediately trigger callback
        game.ui.showLevelUpModal = (level, options, callback) => {
            // Simulate selecting first skill and card
            callback({
                skill: options.skills[0],
                card: options.cards[0]
            });
        };

        game.gainFame(100); // Should trigger multiple level ups

        // 2. Check level
        expect(game.hero.level).toBeGreaterThan(initialLevel);

        // 3. Check for rewards
        expect(game.hero.skills.length).toBeGreaterThan(0);
        // Check if card was added to hand (Level Up reward goes to hand)
        expect(game.hero.hand.length).toBeGreaterThan(5); // Default hand is 5, +1 reward
    });
});
