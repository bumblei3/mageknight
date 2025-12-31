
import { describe, it, expect, beforeEach } from './testRunner.js';
import { Combat } from '../js/combat.js';
import { Enemy } from '../js/enemy.js';
import { Hero } from '../js/hero.js';
import { COMBAT_PHASES } from '../js/constants.js';

describe('Combat Coverage Boost', () => {
    let combat;
    let hero;
    let enemies;

    beforeEach(() => {
        hero = new Hero('TestHero', { q: 0, r: 0 });
        enemies = [
            new Enemy('orc', { q: 1, r: 0 }),
            new Enemy('goblin', { q: 1, r: 1 })
        ];
        combat = new Combat(hero, enemies);
    });

    describe('blockPhase damage calculation', () => {
        it('should calculate total damage from unblocked enemies', () => {
            // Advance to block phase
            combat.phase = COMBAT_PHASES.BLOCK;

            // Block one enemy
            combat.blockedEnemies.add(enemies[0].id);

            const result = combat.blockPhase();

            // Only the second enemy's attack should count
            expect(result.totalDamage).toBe(enemies[1].getEffectiveAttack());
            expect(result.blockedEnemies.length).toBe(1);
        });

        it('should calculate zero damage when all enemies blocked', () => {
            combat.phase = COMBAT_PHASES.BLOCK;

            // Block all enemies
            enemies.forEach(e => combat.blockedEnemies.add(e.id));

            const result = combat.blockPhase();
            expect(result.totalDamage).toBe(0);
        });

        it('should calculate full damage when no enemies blocked', () => {
            combat.phase = COMBAT_PHASES.BLOCK;

            const result = combat.blockPhase();

            const expectedDamage = enemies.reduce((sum, e) => sum + e.getEffectiveAttack(), 0);
            expect(result.totalDamage).toBe(expectedDamage);
        });
    });

    describe('endRangedPhase transitions', () => {
        it('should transition to BLOCK phase when enemies remain', () => {
            combat.phase = COMBAT_PHASES.RANGED;

            const result = combat.endRangedPhase();

            expect(result.phase).toBe(COMBAT_PHASES.BLOCK);
            expect(result.message).toContain('Block');
        });

        it('should return error if not in RANGED phase', () => {
            combat.phase = COMBAT_PHASES.BLOCK;

            const result = combat.endRangedPhase();

            expect(result.error).toBeDefined();
        });
    });
});
