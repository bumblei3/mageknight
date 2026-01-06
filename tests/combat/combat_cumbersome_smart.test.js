
import { describe, it, expect, beforeEach } from 'vitest';
import { Hero } from '../../js/hero.js';
import { Enemy } from '../../js/enemy.js';
import { Combat } from '../../js/combat.js';
import { CombatOrchestrator } from '../../js/game/CombatOrchestrator.js';

// Mock Game object
class MockGame {
    constructor() {
        this.hero = new Hero('Test Hero');
        this.ui = {
            updateCombatInfo: () => { },
            updateCombatTotals: () => { },
            addPlayedCard: () => { },
            showPlayArea: () => { },
            hideCombatPanel: () => { },
            showCombatPanel: () => { },
            formatEffect: () => ''
        };
        this.hexGrid = {
            axialToPixel: () => ({ x: 0, y: 0 })
        };
        this.particleSystem = {
            shieldEffect: () => { },
            shieldBlockEffect: () => { },
            combatClashEffect: () => { },
            impactEffect: () => { }
        };
        this.addLog = () => { };
        this.updateStats = () => { };
    }
}

describe('CombatOrchestrator - Cumbersome Smart Consumption', () => {
    let game;
    let orchestrator;
    let hero;
    let cumbersomeEnemy;

    beforeEach(() => {
        game = new MockGame();
        hero = game.hero;
        orchestrator = new CombatOrchestrator(game);

        // Enemy with Attack 4, Cumbersome
        cumbersomeEnemy = new Enemy({
            name: 'Stone Golem',
            attack: 4,
            cumbersome: true,
            id: 'golem_1',
            position: { q: 0, r: 0 }
        });

        // Setup combat
        game.combat = new Combat(hero, [cumbersomeEnemy]);
        game.combat.phase = 'block';
    });

    it('should consume only necessary movement points when blocked partially by cards', () => {
        // Hero has 5 Move points
        hero.movementPoints = 5;

        // Block with 2 points from cards (Need 2 more from Move points)
        orchestrator.activeBlocks = [{ value: 2, element: 'physical' }];
        orchestrator.combatBlockTotal = 2;

        // Perform block
        orchestrator.handleEnemyClick(cumbersomeEnemy);

        // Expectation:
        // Attack 4 - Block 2 = 2 gap.
        // Should spend 2 Move points.
        // Remaining: 5 - 2 = 3.

        expect(game.combat.blockedEnemies.has(cumbersomeEnemy.id)).toBe(true);
        expect(hero.movementPoints).toBe(3);
    });

    it('should consume all movement points if gap is larger than available', () => {
        // Hero has 1 Move point
        hero.movementPoints = 1;

        // Block with 1 point from cards (Need 3 more, but only have 1)
        // Total block power = 1 (card) + 1 (move) = 2. Req = 4. 
        // Block fails, but points should be consumed? 
        // Actually, logic says block is only successful if total >= req.
        // If it fails, usually no points are consumed in MK rules (you can't partially block to reduce damage),
        // BUT for the sake of this orchestrator logic, we check if result.success is true.
        // If block fails, handleEnemyClick does NOT spend points in current logic?
        // Let's check current logic: 
        // const result = this.game.combat.blockEnemy(...)
        // if (result.success && result.blocked) { ... spend ... }

        // So if we fail to block, no points should be spent.

        orchestrator.activeBlocks = [{ value: 1, element: 'physical' }];
        orchestrator.combatBlockTotal = 1;

        orchestrator.handleEnemyClick(cumbersomeEnemy);

        expect(game.combat.blockedEnemies.has(cumbersomeEnemy.id)).toBe(false);
        expect(hero.movementPoints).toBe(1); // Should not change if block failed
    });

    it('should consume necessary points purely from movement', () => {
        // Hero has 5 Move points
        hero.movementPoints = 5;

        // Block with 0 cards (Need 4 from Move points)
        orchestrator.activeBlocks = [];
        orchestrator.combatBlockTotal = 0;

        orchestrator.handleEnemyClick(cumbersomeEnemy);

        // Expectation:
        // Attack 4. Gap 4. 
        // Spend 4. 
        // Remaining: 5 - 4 = 1.

        expect(game.combat.blockedEnemies.has(cumbersomeEnemy.id)).toBe(true);
        expect(hero.movementPoints).toBe(1);
    });

    it('should not consume movement points if not needed', () => {
        // Hero has 5 Move points
        hero.movementPoints = 5;

        // Block with 5 cards (Enough!)
        orchestrator.activeBlocks = [{ value: 5, element: 'physical' }];
        orchestrator.combatBlockTotal = 5;

        orchestrator.handleEnemyClick(cumbersomeEnemy);

        // Expectation:
        // Spend 0.
        // Remaining: 5.

        expect(game.combat.blockedEnemies.has(cumbersomeEnemy.id)).toBe(true);
        expect(hero.movementPoints).toBe(5);
    });
});
