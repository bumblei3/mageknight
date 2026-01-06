
import { describe, it, expect, beforeEach } from 'vitest';
import { CombatOrchestrator } from '../js/game/CombatOrchestrator.js';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { Combat } from '../js/combat.js'; // We need actual Combat class for orchestrator to work? Or mock it?
// The updated Orchestrator uses new Combat(hero, enemies)
// Let's mock Combat to test just the orchestration logic passing arrays

class MockCombat {
    constructor(hero, enemies) {
        this.enemies = Array.isArray(enemies) ? enemies : [enemies];
        this.started = false;
        this.phase = 'RANGED';
    }
    start() { this.started = true; }
}

class MockGame {
    constructor() {
        this.logs = [];
        this.gameState = 'playing';
        this.combat = null;
        this.hero = { position: { q: 0, r: 0 } };
        this.ui = {
            showCombatPanel: (enemies) => { this.shownEnemies = enemies; },
            updateCombatInfo: () => { },
            updateCombatTotals: () => { }
        };
        this.updatePhaseIndicator = () => { };

        // Mock global for test env if needed, but we pass game to managers
    }
    addLog(msg) { this.logs.push(msg); }
}

// Override global Combat for test if possible, but module imports are static.
// Instead, we will test that Orchestrator acts correctly given the logic we wrote, using a real Combat object logic
// or just trust the integration test we are writing. 
// Actually, let's verify SiteInteractionManager produces arrays first.

describe('Multi-Enemy Encounters', () => {
    let siteManager;
    let game;
    let orchestrator;

    beforeEach(() => {
        game = new MockGame();
        // We need to overwrite InitiateCombat on game because siteManager calls game.initiateCombat
        game.initiateCombat = (enemies) => {
            game.combatEnemies = enemies; // Capture what was passed
        };

        siteManager = new SiteInteractionManager(game);
    });

    it('exploreLabyrinth should spawn 2 enemies', () => {
        siteManager.exploreLabyrinth();

        expect(game.combatEnemies).toBeTruthy();
        expect(Array.isArray(game.combatEnemies)).toBe(true);
        expect(game.combatEnemies.length).toBe(2);

        // Detailed check on enemy types
        const types = game.combatEnemies.map(e => e.type);
        // Valid types from our random logic
        const validTypes = ['mage', 'golem', 'draconum', 'orc_khan'];
        expect(validTypes.includes(types[0])).toBe(true);
        expect(validTypes.includes(types[1])).toBe(true);
    });

    it('exploreSpawningGrounds should spawn 2 enemies', () => {
        siteManager.exploreSpawningGrounds();

        expect(game.combatEnemies).toBeTruthy();
        expect(Array.isArray(game.combatEnemies)).toBe(true);
        expect(game.combatEnemies.length).toBe(2);

        // Second enemy is always a rat/minion
        expect(game.combatEnemies[1].type).toBe('rat');
    });

    // We can also test the orchestrator handles arrays
    it('CombatOrchestrator initiateCombat should handle arrays', () => {
        // We need a real orchestrator here
        const realOrchestrator = new CombatOrchestrator(game);
        // And we need to inject the MockCombat into global scope or similar? 
        // Since we can't easily mock ESM imports in this simple runner, 
        // we will rely on checking the side effects on game.ui

        // We need to revert the game.initiateCombat override or use a new game object
        const game2 = new MockGame();
        // Add minimal hexGrid for pixel calc if needed (it's not used in initiateCombat)
        game2.hexGrid = { axialToPixel: () => ({ x: 0, y: 0 }) };

        const orch = new CombatOrchestrator(game2);

        const enemies = [{ name: 'E1', id: 1 }, { name: 'E2', id: 2 }];
        orch.initiateCombat(enemies);

        // Check if UI was called with array
        expect(game2.shownEnemies).toBeTruthy();
        expect(game2.shownEnemies.length).toBe(2);
        expect(game2.shownEnemies[0].name).toBe('E1');
    });
});
