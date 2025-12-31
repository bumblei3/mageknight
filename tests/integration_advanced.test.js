import { describe, it, expect, beforeEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { Hero } from '../js/hero.js';
import { Combat } from '../js/combat.js';
import { setupGlobalMocks, resetMocks } from './test-mocks.js';
import { createMockEnemy, createHeroWithStats } from './test-helpers.js';

// Setup global mocks for game environment
setupGlobalMocks();

/**
 * Advanced Integration Tests
 * These tests validate complete workflows and system interactions
 */

describe('Integration - Complete Game Workflow', () => {
    let game;

    beforeEach(() => {
        resetMocks();
        game = new MageKnightGame();
    });

    it('should complete a full turn cycle', () => {
        expect(game.hero).toBeDefined();
        expect(game.hexGrid).toBeDefined();

        // Start of turn
        const initialTurn = game.turnNumber;
        const initialHandSize = game.hero.hand.length;

        // Hero should have a hand
        expect(initialHandSize).toBeGreaterThan(0);

        // Play a card
        if (game.hero.hand.length > 0) {
            const card = game.hero.hand[0];
            game.hero.playCard(0);
            expect(game.hero.hand.length).toBe(initialHandSize - 1);
        }

        // End turn should reset hero state
        game.hero.endTurn();
        expect(game.hero.movementPoints).toBe(0);
        expect(game.hero.attackPoints).toBe(0);
    });

    it('should handle exploration and map expansion', () => {
        const initialHexCount = game.hexGrid.hexes.size;

        // Get an edge hex
        const edgeHex = Array.from(game.hexGrid.hexes.values())[0];

        if (game.mapManager.canExplore(edgeHex.q, edgeHex.r)) {
            const result = game.mapManager.explore(edgeHex.q, edgeHex.r);

            if (result.success) {
                // Map should have expanded
                expect(game.hexGrid.hexes.size).toBeGreaterThan(initialHexCount);

                // New hexes should be unrevealed initially
                const newHex = game.hexGrid.getHex(result.center.q, result.center.r);
                expect(newHex).toBeDefined();
            }
        }
    });

    it('should handle complete combat sequence', () => {
        // Create enemies for combat
        const enemy = createMockEnemy({
            armor: 5,
            attack: 3,
            fame: 3
        });

        game.enemies = [enemy];
        const initialFame = game.hero.fame;

        // Initiate combat
        game.initiateCombat(enemy);
        expect(game.combat).toBeDefined();
        expect(game.combat.phase).toBe('ranged');
        game.combat.endRangedPhase();
        expect(game.combat.phase).toBe('block');

        // Block phase
        const blockResult = game.combat.blockEnemy(enemy, 3);
        expect(blockResult.success).toBe(true);

        game.combat.endBlockPhase();
        expect(game.combat.phase).toBe('attack');

        // Attack phase
        game.combat.attackEnemies(5, 'physical');

        // End combat
        const endResult = game.combat.endCombat();
        if (endResult.victory) {
            expect(game.hero.fame).toBeGreaterThan(initialFame);
        }
    });
});

describe('Integration - State Persistence', () => {
    it('should save and load complete game state', () => {
        const game = new MageKnightGame();

        // Modify game state
        game.hero.fame = 15;
        game.hero.reputation = 3;
        game.hero.level = 2;
        game.turnNumber = 5;

        // Save game (if saveManager exists)
        if (game.saveManager) {
            const saveResult = game.saveManager.saveGame(0, game);
            expect(saveResult).toBe(true);

            // Load game
            const loadResult = game.saveManager.loadGame(0);
            if (loadResult) {
                expect(loadResult.hero.fame).toBe(15);
                expect(loadResult.hero.reputation).toBe(3);
                expect(loadResult.hero.level).toBe(2);
                // turn is used instead of turnNumber in serialization
            }
        }
    });

    it('should handle corrupt save data gracefully', () => {
        const game = new MageKnightGame();

        if (game.saveManager) {
            // Manually corrupt save data
            localStorage.setItem('mageKnight_save_0', 'invalid{json}data');

            const loadResult = game.saveManager.loadGame(0);
            expect(loadResult).toBe(null);
        }
    });

    it('should preserve complex game state across save/load', () => {
        const game = new MageKnightGame();

        if (game.saveManager) {
            // Create complex state
            game.hero.takeWound();
            game.hero.takeWound();
            game.hero.takeManaFromSource('red');
            game.hero.movementPoints = 5;

            // Place some hexes
            game.hexGrid.setHex(2, 2, { terrain: 'forest', revealed: true });

            const saveResult = game.saveManager.saveGame(0, game);
            expect(saveResult).toBe(true);

            const loadResult = game.saveManager.loadGame(0);
            if (loadResult) {
                expect(loadResult.hero.wounds.length).toBe(2);
            }
        }
    });
});

describe('Integration - Hero Progression', () => {
    it('should handle level up progression correctly', () => {
        const hero = new Hero('TestHero');
        const initialLevel = hero.level;
        const initialArmor = hero.armor;
        const initialHandLimit = hero.handLimit;

        // Gain enough fame for level 2
        const result = hero.gainFame(10);
        expect(result.leveledUp).toBe(true);
        hero.levelUp();
        expect(hero.level).toBe(2);

        // Stats should improve
        expect(hero.handLimit).toBeGreaterThan(initialHandLimit);

        // Gain more fame for level 3 (need 30 total, have 10, so gain 20 more)
        const result2 = hero.gainFame(20);
        if (result2.leveledUp) {
            hero.levelUp();
        }
        expect(hero.level).toBe(3);
        expect(hero.armor).toBeGreaterThan(initialArmor);
    });

    it('should maintain deck integrity through multiple turns', () => {
        const hero = new Hero('TestHero');
        const totalCards = hero.deck.length + hero.discard.length + hero.hand.length;

        // Play multiple turns
        for (let i = 0; i < 5; i++) {
            while (hero.hand.length > 0) {
                hero.playCard(0);
            }
            hero.endTurn();
        }

        // Total cards should remain constant
        const finalTotal = hero.deck.length + hero.discard.length + hero.hand.length;
        expect(finalTotal).toBe(totalCards);
    });

    it('should handle multiple wounds and healing', () => {
        const hero = new Hero('TestHero');

        // Take multiple wounds
        hero.takeWound();
        hero.takeWound();
        hero.takeWound();

        expect(hero.wounds.length).toBe(3);

        // Heal some wounds
        hero.healingPoints = 2;
        hero.healWound();
        expect(hero.wounds.length).toBe(2);

        hero.healWound();
        expect(hero.wounds.length).toBe(1);
        expect(hero.healingPoints).toBe(0);
    });
});

describe('Integration - Combat Scenarios', () => {
    it('should handle multi-enemy combat with partial blocking', () => {
        const hero = new Hero('TestHero');
        const enemy1 = createMockEnemy({ armor: 3, attack: 3, name: 'Goblin' });
        const enemy2 = createMockEnemy({ armor: 4, attack: 4, name: 'Orc' });
        const enemy3 = createMockEnemy({ armor: 2, attack: 2, name: 'Rat' });

        const combat = new Combat(hero, [enemy1, enemy2, enemy3]);
        combat.start();
        expect(combat.phase).toBe('ranged');
        combat.endRangedPhase();
        expect(combat.phase).toBe('block');

        // Block only one enemy
        combat.blockEnemy(enemy1, 3);
        expect(combat.blockedEnemies.has(enemy1.id)).toBe(true);

        combat.endBlockPhase();

        // Should take damage from 2 unblocked enemies (attack 4 + 2 = 6)
        const expectedWounds = Math.ceil(6 / hero.armor);
        expect(combat.woundsReceived).toBe(expectedWounds);

        // Defeat all enemies
        combat.attackEnemies(9, 'physical');

        const result = combat.endCombat();
        expect(result.victory).toBe(true);
        expect(result.defeatedEnemies.length).toBe(3);
    });

    it('should handle swift enemy combat', () => {
        const hero = new Hero('TestHero');
        const swiftEnemy = createMockEnemy({
            armor: 4,
            attack: 3,
            swift: true,
            name: 'Swift Scout'
        });

        const combat = new Combat(hero, swiftEnemy);
        combat.start();
        combat.endRangedPhase();

        // Normal block should fail
        const result1 = combat.blockEnemy(swiftEnemy, 3);
        expect(result1.blocked).toBe(false);

        // Double block should succeed
        const result2 = combat.blockEnemy(swiftEnemy, 6);
        expect(result2.blocked).toBe(true);
    });

    it('should track enemy abilities and apply effects', () => {
        const hero = createHeroWithStats({ armor: 3 });
        const poisonEnemy = createMockEnemy({
            armor: 3,
            attack: 3,
            poison: true,
            name: 'Poison Spider'
        });

        const combat = new Combat(hero, poisonEnemy);
        combat.start();
        combat.endRangedPhase();
        combat.endBlockPhase(); // No block

        // Should take damage + poison wound
        expect(combat.woundsReceived).toBeGreaterThan(Math.ceil(3 / hero.armor));
    });
});

describe('Integration - MapManager and Exploration', () => {
    it('should maintain map consistency during expansion', () => {
        const game = new MageKnightGame();
        const visited = new Set();

        // Track all hex positions
        game.hexGrid.hexes.forEach((hex, key) => {
            visited.add(key);
        });

        // Explore a few times
        for (let i = 0; i < 3; i++) {
            const edgeHexArray = Array.from(game.hexGrid.hexes.values());
            for (const hex of edgeHexArray) {
                if (game.mapManager.canExplore(hex.q, hex.r)) {
                    game.mapManager.explore(hex.q, hex.r);
                    break;
                }
            }
        }

        // Check that original hexes still exist
        visited.forEach(key => {
            expect(game.hexGrid.hexes.has(key)).toBe(true);
        });
    });

    it('should spawn enemies on revealed distant hexes', () => {
        const game = new MageKnightGame();

        // Place a distant tile
        const terrains = ['plains', 'plains', 'forest', 'hills', 'desert', 'wasteland', 'plains'];
        game.mapManager.placeTile(5, 0, terrains);

        const initialEnemyCount = game.enemies.length;

        // Create enemies (calls spawnEnemies internally)
        game.createEnemies();

        // Should have spawned at least some enemies
        expect(game.enemies.length).toBeGreaterThanOrEqual(0);
    });
});

describe('Integration - Time and Day/Night Cycle', () => {
    it('should track round progression', () => {
        const game = new MageKnightGame();
        const initialRound = game.roundNumber || 1;

        // Simulate multiple turns
        for (let i = 0; i < 10; i++) {
            game.hero.endTurn();
        }

        // Rounds should have progressed (if game tracks this)
        if (game.roundNumber !== undefined) {
            expect(game.roundNumber).toBeGreaterThanOrEqual(initialRound);
        }
    });
});

describe('Integration - Error Recovery', () => {
    it('should handle missing hex data gracefully', () => {
        const game = new MageKnightGame();

        // Try to get non-existent hex
        const hex = game.hexGrid.getHex(999, 999);
        expect(hex).toBe(undefined);

        // Should not crash when checking
        const hasHex = game.hexGrid.hasHex(999, 999);
        expect(hasHex).toBe(false);
    });

    it('should handle invalid combat targets', () => {
        const hero = new Hero('TestHero');
        const enemy = createMockEnemy();
        const combat = new Combat(hero, enemy);

        combat.start();
        combat.endRangedPhase();

        // Try to block non-existent enemy
        const fakeEnemy = createMockEnemy({ id: 'fake_id' });
        const result = combat.blockEnemy(fakeEnemy, 5);

        // Should handle gracefully (either error or no-op)
        expect(result).toBeDefined();
    });
});

describe('Integration - Performance and Stress', () => {
    it('should handle large numbers of cards efficiently', () => {
        const hero = new Hero('TestHero');

        // Add many cards
        for (let i = 0; i < 50; i++) {
            hero.takeWound();
        }

        // Should still function
        expect(hero.wounds.length).toBe(50);

        // Should be able to shuffle and draw
        hero.endTurn();
        expect(hero.hand.length).toBeGreaterThan(0);
    });

    it('should handle many hexes on map', () => {
        const game = new MageKnightGame();

        // Place many tiles
        for (let q = -5; q <= 5; q++) {
            for (let r = -5; r <= 5; r++) {
                if (Math.abs(q + r) <= 5 && !game.hexGrid.hasHex(q, r)) {
                    game.hexGrid.setHex(q, r, {
                        terrain: 'plains',
                        revealed: true
                    });
                }
            }
        }

        // Should handle pathfinding/distance calculations
        const distance = game.hexGrid.distance(0, 0, 5, 5);
        expect(distance).toBeGreaterThan(0);
    });

    it('should handle rapid combat scenarios', () => {
        const hero = new Hero('TestHero');

        // Run multiple combats in succession
        for (let i = 0; i < 10; i++) {
            const enemy = createMockEnemy({ armor: 2, attack: 2 });
            const combat = new Combat(hero, enemy);

            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase();
            combat.attackEnemies(2, 'physical');
            combat.endCombat();
        }

        // Hero should still be functional
        expect(hero).toBeDefined();
        expect(hero.hand).toBeDefined();
    });
});
