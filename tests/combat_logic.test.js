
import { describe, it, expect, beforeEach } from './testRunner.js';
import { Combat, COMBAT_PHASE } from '../js/combat.js';

describe('Combat System', () => {
    let combat;
    let mockHero;
    let mockEnemy;
    let mockUnit;

    beforeEach(() => {
        mockHero = {
            armor: 3,
            hand: [],
            discard: [],
            takeWound: function () { this.hand.push({ type: 'wound' }); },
            takeWoundToDiscard: function () { this.discard.push({ type: 'wound' }); },
            gainFame: () => { }
        };

        mockEnemy = {
            id: 'orc_1',
            name: 'Orc',
            armor: 4,
            currentHealth: 4,
            maxHealth: 4,
            attack: 3,
            fame: 2,
            getResistanceMultiplier: (element) => element === 'fire' ? 0.5 : 1, // Weak to fire
            getEffectiveAttack: () => 3,
            getBlockRequirement: () => 3,
            takeDamage: (amount) => {
                mockEnemy.currentHealth -= amount;
                return {
                    healthPercent: mockEnemy.currentHealth / mockEnemy.maxHealth,
                    defeated: mockEnemy.currentHealth <= 0,
                    transitions: []
                };
            }
        };

        mockUnit = {
            type: 'swordsmen',
            isReady: () => true,
            activate: () => { },
            getAbilities: () => [{ type: 'block', value: 2 }, { type: 'attack', value: 2 }],
            getName: () => 'Swordsmen'
        };

        combat = new Combat(mockHero, [mockEnemy]);
    });

    describe('Phases', () => {
        it('should start in NOT_IN_COMBAT', () => {
            expect(combat.phase).toBe(COMBAT_PHASE.NOT_IN_COMBAT);
        });

        it('should transition to RANGED phase on start', () => {
            const result = combat.start();
            expect(result.phase).toBe(COMBAT_PHASE.RANGED);
            expect(combat.phase).toBe(COMBAT_PHASE.RANGED);
        });

        it('should transition RANGED -> BLOCK', () => {
            combat.start();
            combat.endRangedPhase();
            expect(combat.phase).toBe(COMBAT_PHASE.BLOCK);
        });

        it('should transition BLOCK -> DAMAGE', () => {
            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase();
            expect(combat.phase).toBe(COMBAT_PHASE.ATTACK); // damagePhase returns nextPhase: ATTACK
        });
    });

    describe('Ranged Phase', () => {
        beforeEach(() => {
            combat.start();
        });

        it('should allow ranged attacks', () => {
            const result = combat.rangedAttackEnemy(mockEnemy, 4);
            expect(result.success).toBe(true);
            expect(result.defeated.length).toBe(1);
        });

        it('should fail if attack is too low', () => {
            const result = combat.rangedAttackEnemy(mockEnemy, 2);
            expect(result.success).toBe(false);
            expect(combat.defeatedEnemies.length).toBe(0);
        });

        it('should handle resistance multipliers', () => {
            // Enemy weak to fire (0.5 multiplier -> effective armor doubled? No, effectiveArmor = armor / multiplier)
            // Wait, logic is: effectiveArmor = armor / multiplier. 
            // If multiplier 0.5 (resistance), effectiveArmor = 4 / 0.5 = 8.
            // If multiplier 2 (weakness), effectiveArmor = 4 / 2 = 2.

            // Let's re-read combat.js: 
            // const effectiveArmor = enemy.armor / multiplier;
            // standard resistance multiplier is usually < 1 for resistance? Or > 1?
            // Usually 0.5 means half damage taken, or double armor.

            // Test implementation assumes weak to fire means multiplier 0.5 (doubles effective armor).
            // Wait, if weak to fire, it should be easier to kill. Multiplier should be > 1.
            // Let's adjust mock: weak to fire -> 2.0 multiplier.

            mockEnemy.getResistanceMultiplier = (el) => el === 'fire' ? 2.0 : 1.0;

            const result = combat.rangedAttackEnemy(mockEnemy, 2, false, 'fire');
            // Effective armor = 4 / 2 = 2. Attack 2 should kill.
            expect(result.success).toBe(true);
        });

        it('should fail ranged attack in wrong phase', () => {
            combat.endRangedPhase(); // Now in BLOCK
            const result = combat.rangedAttackEnemy(mockEnemy, 5);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Block Phase', () => {
        beforeEach(() => {
            combat.start();
            combat.endRangedPhase();
        });

        it('should allow blocking', () => {
            const result = combat.blockEnemy(mockEnemy, 3);
            expect(result.success).toBe(true);
            expect(result.blocked).toBe(true);
            expect(combat.blockedEnemies.has(mockEnemy.id)).toBe(true);
        });

        it('should fail block if too low', () => {
            const result = combat.blockEnemy(mockEnemy, 2);
            expect(result.success).toBe(true); // Action successful
            expect(result.blocked).toBe(false); // But block failed
            expect(combat.blockedEnemies.has(mockEnemy.id)).toBe(false);
        });

        it('should include unit block points', () => {
            combat.unitBlockPoints = 1;
            const result = combat.blockEnemy(mockEnemy, 2); // 2 + 1 = 3
            expect(result.blocked).toBe(true);
        });
    });

    describe('Damage Phase', () => {
        beforeEach(() => {
            combat.start();
            combat.endRangedPhase();
        });

        it('should calculate damage from unblocked enemies', () => {
            // No block
            const result = combat.endBlockPhase(); // Triggers damagePhase

            // Enemy attack 3, Hero Armor 3. 3/3 = 1 wound.
            expect(result.woundsReceived).toBe(1);
            expect(mockHero.hand.length).toBe(1);
        });

        it('should take no damage if blocked', () => {
            combat.blockEnemy(mockEnemy, 3);
            const result = combat.endBlockPhase();

            expect(result.woundsReceived).toBe(0);
        });
    });

    describe('Attack Phase', () => {
        beforeEach(() => {
            combat.start();
            combat.endRangedPhase();
            combat.endBlockPhase(); // Transition to ATTACK
        });

        it('should attack enemies', () => {
            const result = combat.attackEnemies(4);
            expect(result.success).toBe(true);
            expect(result.defeated.length).toBe(1);
        });

        it('should fail attack if too low', () => {
            const result = combat.attackEnemies(3); // Armor 4
            expect(result.success).toBe(false); // Should be false if no enemies defeated? 
            // Logic: success set to true if regular enemies defeated logic block passes OR bosses loop runs.
            // If regular enemies exist and totalAttack < totalArmor => push message, success stays false.
            expect(combat.defeatedEnemies.length).toBe(0);
        });
    });

    describe('Unit Activation', () => {
        it('should activate unit and add bonus', () => {
            combat.start();
            combat.endRangedPhase(); // Block Phase

            const result = combat.activateUnit(mockUnit); // Has block 2
            expect(result.success).toBe(true);
            expect(combat.unitBlockPoints).toBe(2);
            expect(combat.activatedUnits.has(mockUnit.type)).toBe(true);
        });

        it('should not activate twice', () => {
            combat.start();
            combat.activateUnit(mockUnit);
            const result = combat.activateUnit(mockUnit);
            expect(result.success).toBe(false);
        });
    });

    describe('Combo System', () => {
        it('should detect mono-color combo', () => {
            const cards = [
                { color: 'red', isWound: () => false },
                { color: 'red', isWound: () => false },
                { color: 'red', isWound: () => false }
            ];
            const combo = combat.detectCombo(cards);
            expect(combo).not.toBeNull();
            expect(combo.type).toBe('mono_color');
        });

        it('should detect rainbow combo', () => {
            const cards = [
                { color: 'red', isWound: () => false },
                { color: 'blue', isWound: () => false },
                { color: 'green', isWound: () => false },
                { color: 'white', isWound: () => false }
            ];
            const combo = combat.detectCombo(cards);
            expect(combo).not.toBeNull();
            expect(combo.type).toBe('rainbow');
        });
    });
});
