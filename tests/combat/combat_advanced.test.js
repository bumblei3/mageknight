import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MageKnightGame } from '../../js/game.js';
import { createEnemy } from '../../js/enemy.js';
import {
    createMockWindow,
    createMockDocument,
    resetMocks
} from '../test-mocks.js';

describe('Advanced Combat Coverage', () => {
    let game;

    beforeEach(() => {
        document.body.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.id = 'game-board';
        document.body.appendChild(canvas);
        game = new MageKnightGame();
    });

    afterEach(() => {
        resetMocks();
    });

    describe('Combat Logic Deep Dive', () => {
        it('should handle activateUnitInCombat correctly', () => {
            game.combat = {
                activateUnit: (unit) => ({ success: true, message: 'Unit Activated' })
            };

            // Mock UI/Particles
            game.renderUnitsInCombat = () => { };
            game.updateStats = () => { };
            game.addLog = () => { };
            game.hexGrid.axialToPixel = () => ({ x: 0, y: 0 });
            game.particleSystem.buffEffect = () => { };

            game.activateUnitInCombat({ name: 'Unit' });
        });

        it('should handle endBlockPhase with enemy blocking', () => {
            const enemy = createEnemy('orc');
            game.combat = {
                phase: 'block',
                enemies: [enemy],
                blockEnemy: (e, total) => ({ blocked: true }),
                endBlockPhase: () => ({ woundsReceived: 1, message: 'Took damage' }),
                getPredictedOutcome: () => null // Added for UI compatibility
            };
            game.combatBlockTotal = 10;

            // Mock dependencies
            game.addLog = () => { };
            game.ui.updateCombatInfo = () => { };
            game.renderUnitsInCombat = () => { };
            game.updatePhaseIndicator = () => { };
            game.updateStats = () => { };
            game.updateCombatTotals = () => { };
            game.hexGrid.axialToPixel = () => ({ x: 0, y: 0 });
            game.particleSystem.damageSplatter = () => { };
            game.particleSystem.triggerShake = () => { };
            game.particleSystem.createDamageNumber = () => { };
            game.particleSystem.fireAttackEffect = () => { };
            game.particleSystem.iceAttackEffect = () => { };
            game.particleSystem.lightningAttackEffect = () => { };
            game.combat.enemy = { attackType: 'physical' };

            game.endBlockPhase();

            expect(game.combatBlockTotal).toBe(0);
        });

        it('should handle executeAttackAction variants', () => {
            game.combat = { phase: 'ranged' };
            let rangedEnded = false;
            game.endRangedPhase = () => { rangedEnded = true; return { message: 'Ended' }; };
            game.combat.endRangedPhase = () => { rangedEnded = true; return { message: 'Ended' }; };

            // Case 1: Ranged skip
            game.executeAttackAction();
            expect(rangedEnded).toBe(true);

            // Case 2: Attack execution
            game.combat.phase = 'attack';
            game.combatAttackTotal = 5;
            const enemy = createEnemy('orc');
            enemy.position = { q: 1, r: 0 };
            enemy.position = { q: 1, r: 0 };
            game.combat.enemies = [enemy];
            game.combat.enemy = enemy; // Fix: Set active enemy for calculation

            // Mock
            game.hexGrid.axialToPixel = () => ({ x: 10, y: 20 });
            game.particleSystem.impactEffect = () => { };

            let attackExecuted = false;
            game.combat.attackEnemies = () => { attackExecuted = true; return { success: true, message: 'Victory', defeated: [] }; };
            game.endCombat = () => { };

            game.executeAttackAction();
            expect(attackExecuted).toBe(true);
        });
    });
});
