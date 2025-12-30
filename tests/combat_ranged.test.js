
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { Combat, COMBAT_PHASE } from '../js/combat.js';
import { createSpy } from './test-mocks.js';

describe('Combat Ranged Phase Integration', () => {
    let game;
    let enemy;

    beforeEach(() => {
        game = new MageKnightGame();

        enemy = {
            id: 'e1',
            name: 'Orc',
            armor: 4,
            attack: 3,
            fame: 2,
            getResistanceMultiplier: () => 1, // Normal
            getEffectiveAttack: () => 3,
            currentHealth: 1,
            maxHealth: 1
        };

        // Setup UI mocks
        game.ui = {
            addLog: createSpy(),
            showCombatPanel: createSpy(),
            updateCombatInfo: createSpy(),
            updateCombatTotals: createSpy(),
            renderUnitsInCombat: createSpy(),
            updatePhaseIndicator: createSpy(),
            updateStats: createSpy(),
            renderHand: createSpy(),
            renderHandCards: createSpy(),
            updateHeroStats: createSpy(),
            updateMovementPoints: createSpy(),
            renderUnits: createSpy(),
            setButtonEnabled: createSpy(),
            elements: {
                playedCards: { getBoundingClientRect: () => ({ top: 0, right: 0 }) },
                exploreBtn: { style: {} },
                visitBtn: { style: {} }
            }
        };
        game.particleSystem = { impactEffect: createSpy() };

        game.initiateCombat(enemy);
    });

    it('should start in RANGED phase', () => {
        expect(game.combat.phase).toBe(COMBAT_PHASE.RANGED);
        expect(game.ui.showCombatPanel.callCount).toBe(1);
    });

    it('should transition to BLOCK phase when executeAttackAction (End Phase) is called', () => {
        game.executeAttackAction(); // In Ranged phase, this is "End Phase"

        expect(game.combat.phase).toBe(COMBAT_PHASE.BLOCK);
        expect(game.ui.addLog.calls.some(c => c[0].includes('Block-Phase'))).toBe(true);
    });

    it('should handle Ranged Attack properly', () => {
        // Give player Ranged Attack points
        game.combatRangedTotal = 5; // Enough for Armor 4

        // Execute executed via handleEnemyClick
        game.handleEnemyClick(game.combat.enemies[0]);

        // Since it was the only enemy, combat should end
        expect(game.combat).toBeNull();
        expect(game.ui.addLog.calls.some(c => c[0].includes('besiegt'))).toBe(true);
        expect(game.combatRangedTotal).toBe(0); // Should reset after hit (simplified logic)
    });

    it('should FAIL Ranged Attack if insufficient damage', () => {
        game.combatRangedTotal = 2; // Not enough for Armor 4

        game.handleEnemyClick(game.combat.enemies[0]);

        expect(game.combat.enemies.length).toBe(1); // Enemy still alive
        expect(game.ui.addLog.calls.some(c => c[0].includes('zu schwach'))).toBe(true);
    });
});
