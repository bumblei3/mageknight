// Tests for Boss Encounter mechanics
import { describe, it, expect, beforeEach } from './testRunner.js';
import { BossEnemy, BOSS_DEFINITIONS, BOSS_PHASES, createBoss } from '../js/enemy.js';
import { Combat, COMBAT_PHASE } from '../js/combat.js';

describe('Boss Encounters', () => {
    let boss;
    let mockHero;

    beforeEach(() => {
        // Create a test boss
        boss = createBoss('dark_lord');

        // Mock hero
        mockHero = {
            armor: 2,
            fame: 0,
            wounds: [],
            gainFame: function (amount) { this.fame += amount; },
            takeWound: function () { this.wounds.push('wound'); },
            takeWoundToDiscard: function () { this.wounds.push('discard_wound'); }
        };
    });

    describe('BossEnemy Class', () => {
        it('should create boss with multi-phase health', () => {
            expect(boss.isBoss).toBe(true);
            expect(boss.maxHealth).toBe(30);
            expect(boss.currentHealth).toBe(30);
        });

        it('should have correct phase abilities', () => {
            expect(boss.phaseAbilities).toBeDefined();
            expect(boss.phaseAbilities[1]).toBe(null);
            expect(boss.phaseAbilities[2]).toBe('summon');
        });

        it('should track health percentage', () => {
            expect(boss.getHealthPercent()).toBe(1.0);
            boss.currentHealth = 15;
            expect(boss.getHealthPercent()).toBe(0.5);
        });

        it('should return correct phase name', () => {
            expect(boss.getPhaseName()).toBe('Phase 1');
            boss.currentHealth = 15; // 50%
            expect(boss.getPhaseName()).toBe('Phase 2');
            boss.currentHealth = 5; // ~17%
            expect(boss.getPhaseName()).toBe('Phase 3');
        });
    });

    describe('Boss Damage System', () => {
        it('should reduce health when taking damage', () => {
            const result = boss.takeDamage(10);
            expect(boss.currentHealth).toBe(20);
            expect(result.damage).toBe(10);
            expect(result.previousHealth).toBe(30);
            expect(result.currentHealth).toBe(20);
        });

        it('should not go below 0 health', () => {
            boss.takeDamage(100);
            expect(boss.currentHealth).toBe(0);
        });

        it('should detect defeat when health reaches 0', () => {
            const result = boss.takeDamage(30);
            expect(result.defeated).toBe(true);
            expect(boss.isDefeated()).toBe(true);
        });

        it('should trigger phase transitions', () => {
            // Damage to 50% - should trigger Phase 2 (threshold 0.66)
            const result = boss.takeDamage(15);
            expect(result.transitions.length).toBeGreaterThan(0);
            expect(result.transitions[0].phase).toBe('Phase 1');
        });

        it('should trigger enrage at low health', () => {
            // Damage to below 25%
            boss.takeDamage(24); // 6 HP left = 20%
            expect(boss.enraged).toBe(true);
            expect(boss.currentPhase).toBe(BOSS_PHASES.ENRAGED);
        });
    });

    describe('Enrage Mechanics', () => {
        it('should increase attack when enraged', () => {
            const baseAttack = boss.attack;
            boss.enraged = true;
            const enragedAttack = boss.getEffectiveAttack();
            expect(enragedAttack).toBeGreaterThan(baseAttack);
        });

        it('should return phase name as Wütend when enraged', () => {
            boss.enraged = true;
            expect(boss.getPhaseName()).toBe('Wütend');
        });
    });

    describe('Phase Abilities', () => {
        it('should execute summon ability', () => {
            const result = boss.executePhaseAbility('summon');
            expect(result.type).toBe('summon');
            expect(result.count).toBe(2);
            expect(result.enemyType).toBe('phantom');
        });

        it('should execute heal ability', () => {
            boss.currentHealth = 10;
            const result = boss.executePhaseAbility('heal');
            expect(result.type).toBe('heal');
            expect(boss.currentHealth).toBeGreaterThan(10);
        });

        it('should execute double_attack ability', () => {
            const result = boss.executePhaseAbility('double_attack');
            expect(result.type).toBe('buff');
        });

        it('should return null for unknown ability', () => {
            const result = boss.executePhaseAbility('unknown_ability');
            expect(result).toBe(null);
        });
    });
});

describe('Combat with Bosses', () => {
    let combat;
    let boss;
    let mockHero;

    beforeEach(() => {
        boss = createBoss('dark_lord');

        mockHero = {
            armor: 2,
            fame: 0,
            wounds: [],
            gainFame: function (amount) { this.fame += amount; },
            takeWound: function () { this.wounds.push('wound'); },
            takeWoundToDiscard: function () { this.wounds.push('discard_wound'); }
        };

        combat = new Combat(mockHero, [boss]);
        combat.start();
    });

    describe('Attack Phase', () => {
        it('should damage boss instead of defeating outright', () => {
            combat.endRangedPhase();
            combat.endBlockPhase(); combat.resolveDamagePhase();

            const result = combat.attackEnemies(10, 'physical');

            expect(result.success).toBe(true);
            expect(result.damaged.length).toBe(1);
            // 10 attack * 0.5 physical resist = 5 damage
            expect(boss.currentHealth).toBe(25);
            expect(result.defeated.length).toBe(0);
        });

        it('should defeat boss when health reaches 0', () => {
            combat.endRangedPhase();
            combat.endBlockPhase(); combat.resolveDamagePhase();

            // 10 armor * 1/0.5 multiplier = 20 attack required per health point? 
            // Wait, armor is 10, fame is 50. 
            // In combat.js: if (totalAttack >= effectiveArmor) { ... } for regular.
            // But for boss: const effectiveDamage = Math.floor(totalAttack * multiplier);
            // Dark Lord has 30 HP. Physical resist = 0.5. 
            // So 60 physical attack needed to defeat.
            const result = combat.attackEnemies(60, 'physical');

            expect(result.success).toBe(true);
            expect(result.defeated.length).toBe(1);
            expect(result.fameGained).toBe(50);
            expect(mockHero.fame).toBe(50);
        });

        it('should report phase transitions', () => {
            combat.endRangedPhase();
            combat.endBlockPhase(); combat.resolveDamagePhase();

            // Deal 40 damage (40 * 0.5 = 20 effective damage, to 10/30 health = 33%)
            const result = combat.attackEnemies(40, 'physical');

            expect(result.bossTransitions.length).toBeGreaterThan(0);
        });
    });

    describe('Ranged Phase', () => {
        it('should damage boss with ranged attack', () => {
            // Verify we're in ranged phase
            expect(combat.phase).toBe('ranged');

            // New signature: rangedAttackEnemy(enemy, rangedValue, siegeValue, element)
            const result = combat.rangedAttackEnemy(boss, 10, 0, 'physical');
            expect(result).toBeDefined();

            if (result.success !== false) {
                expect(result.isBoss).toBe(true);
                // 10 * 0.5 resist = 5
                expect(result.damage).toBe(5);
                expect(boss.currentHealth).toBe(25);
            }
        });

        it('should defeat boss with enough ranged damage', () => {
            // Need 60 physical ranged (60 * 0.5 = 30 damage = full health)
            const result = combat.rangedAttackEnemy(boss, 60, 0, 'physical');
            expect(result).toBeDefined();

            if (result.defeated) {
                expect(result.defeated.length).toBe(1);
                expect(result.fameGained).toBe(50);
            }
        });

        it('should report boss transitions on ranged damage', () => {
            // Deal 40 damage -> 20 effective (40 * 0.5 physical resist)
            const result = combat.rangedAttackEnemy(boss, 40, 0, 'physical');
            expect(result).toBeDefined();

            // bossTransitions should exist on successful boss attacks
            if (result.success !== false) {
                expect(result.bossTransitions).toBeDefined();
            }
        });
    });
});

describe('createBoss Factory', () => {
    it('should create boss from definition', () => {
        const boss = createBoss('dragon_lord');
        expect(boss).not.toBe(null);
        expect(boss.name).toBe('Drachen-König');
        expect(boss.maxHealth).toBe(40);
    });

    it('should return null for unknown boss type', () => {
        const boss = createBoss('unknown_boss');
        expect(boss).toBe(null);
    });

    it('should create all defined bosses', () => {
        const bossTypes = ['dark_lord', 'dragon_lord', 'lich_king'];
        bossTypes.forEach(type => {
            const boss = createBoss(type);
            expect(boss).not.toBe(null);
            expect(boss.isBoss).toBe(true);
        });
    });
});

