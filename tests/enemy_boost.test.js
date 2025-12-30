
import { describe, it, expect, beforeEach } from './testRunner.js';
import {
    Enemy,
    BossEnemy,
    BOSS_PHASES,
    createEnemy,
    createBoss,
    createEnemies,
    ENEMY_TYPES
} from '../js/enemy.js';

describe('Enemy System Coverage Boost', () => {

    describe('Enemy Base Class', () => {
        it('should initialize with defaults', () => {
            const enemy = new Enemy({ type: 'test' });
            expect(enemy.id).toBeDefined();
            expect(enemy.displayPosition).toBeUndefined(); // Checking if position is handled correctly (it's called "position" in data)
            expect(enemy.armor).toBe(0);
        });

        it('should calculate effective attack for brutal enemies', () => {
            const normal = new Enemy({ attack: 3 });
            expect(normal.getEffectiveAttack()).toBe(3);

            const brutal = new Enemy({ attack: 3, brutal: true });
            expect(brutal.getEffectiveAttack()).toBe(6);
        });

        it('should calculate block requirement for swift enemies', () => {
            const normal = new Enemy({ attack: 3 });
            expect(normal.getBlockRequirement()).toBe(3);

            const swift = new Enemy({ attack: 3, swift: true });
            expect(swift.getBlockRequirement()).toBe(6);
        });

        it('should handle resistances', () => {
            const fireResist = new Enemy({ fireResist: true });
            expect(fireResist.getResistanceMultiplier('fire')).toBe(0.5);
            expect(fireResist.getResistanceMultiplier('ice')).toBe(1.0);

            const iceResist = new Enemy({ iceResist: true });
            expect(iceResist.getResistanceMultiplier('ice')).toBe(0.5);

            const physResist = new Enemy({ physicalResist: true });
            expect(physResist.getResistanceMultiplier('physical')).toBe(0.5);
        });

        it('should clone correctly', () => {
            const original = new Enemy({
                type: 'orc',
                name: 'Orc',
                attack: 5,
                fireResist: true
            });
            const clone = original.clone();

            expect(clone).not.toBe(original);
            expect(clone.type).toBe(original.type);
            expect(clone.attack).toBe(original.attack);
            expect(clone.fireResist).toBe(true);
        });
    });

    describe('BossEnemy Logic', () => {
        let boss;

        beforeEach(() => {
            // Manual construction for controlled testing
            boss = new BossEnemy({
                name: 'Test Boss',
                type: 'boss',
                maxHealth: 100,
                phases: [
                    { threshold: 0.5, name: 'Half HP', triggered: false },
                    { threshold: 0.2, name: 'Low HP', triggered: false }
                ],
                enrageThreshold: 0.1,
                enrageMultiplier: 2,
                phaseAbilities: {
                    'Half HP': 'summon',
                    'Low HP': 'heal',
                    'Enraged': 'smash'
                }
            });
        });

        it('should initialize correctly as boss', () => {
            expect(boss.isBoss).toBe(true);
            expect(boss.currentHealth).toBe(100);
            expect(boss.currentPhase).toBe(BOSS_PHASES.PHASE_1);
        });

        it('should handle damage and standard defeat', () => {
            const result = boss.takeDamage(10);
            expect(result.currentHealth).toBe(90);
            expect(result.damage).toBe(10);
            expect(result.defeated).toBe(false);
        });

        it('should trigger phase transitions', () => {
            // Drop below 50%
            const result = boss.takeDamage(60); // 100 -> 40
            expect(boss.currentHealth).toBe(40);
            expect(result.transitions.length).toBeGreaterThan(0);

            const transition = result.transitions.find(t => t.phase === 'Half HP');
            expect(transition).toBeDefined();
            expect(transition.ability).toBe('summon');
        });

        it('should trigger enrage', () => {
            // Drop below 10%
            const result = boss.takeDamage(95); // 100 -> 5
            expect(boss.enraged).toBe(true);

            const transition = result.transitions.find(t => t.phase === 'Enraged');
            expect(transition).toBeDefined();
        });

        it('should increase attack when enraged', () => {
            boss.attack = 10;
            boss.enrageMultiplier = 2;
            expect(boss.getEffectiveAttack()).toBe(10);

            boss.enraged = true;
            expect(boss.getEffectiveAttack()).toBe(20);
        });

        it('should report correct phase name', () => {
            // Default logic in getPhaseName relies on standard thresholds if not overridden, 
            // but let's test the method with currentHealth

            // 100/100 -> > 0.66 -> Phase 1
            expect(boss.getPhaseName()).toBe('Phase 1');

            boss.takeDamage(50); // 50/100 = 0.5 -> > 0.33 -> Phase 2
            expect(boss.getPhaseName()).toBe('Phase 2');

            boss.takeDamage(20); // 30/100 = 0.3 -> <= 0.33 -> Phase 3
            expect(boss.getPhaseName()).toBe('Phase 3');

            boss.enraged = true;
            expect(boss.getPhaseName()).toBe('Wütend');
        });

        it('should execute phase abilities', () => {
            // Summon
            boss.summonType = 'minion';
            boss.summonCount = 3;
            const summonResult = boss.executePhaseAbility('summon');
            expect(summonResult.type).toBe('summon');
            expect(summonResult.count).toBe(3);

            // Heal
            boss.currentHealth = 50;
            const healResult = boss.executePhaseAbility('heal');
            expect(healResult.type).toBe('heal');
            expect(boss.currentHealth).toBeGreaterThan(50);

            // Enrage/Buff
            const buffResult = boss.executePhaseAbility('enrage');
            expect(buffResult.type).toBe('buff');

            const unknownResult = boss.executePhaseAbility('unknown');
            expect(unknownResult).toBeNull();
        });
    });

    describe('Factory Functions', () => {
        it('should create valid enemies from keys', () => {
            const orc = createEnemy(ENEMY_TYPES.ORC);
            expect(orc).toBeDefined();
            expect(orc.type).toBe(ENEMY_TYPES.ORC);

            const unknown = createEnemy('invalid_key');
            expect(unknown).toBeNull();
        });

        it('should create multiple enemies', () => {
            const list = [
                { type: ENEMY_TYPES.ORC, position: { q: 0, r: 0 } },
                { type: ENEMY_TYPES.ROBBER, position: { q: 1, r: -1 } }
            ];
            const enemies = createEnemies(list);
            expect(enemies.length).toBe(2);
            expect(enemies[0].type).toBe(ENEMY_TYPES.ORC);
            expect(enemies[1].position).toEqual({ q: 1, r: -1 });
        });

        it('should create bosses from definitions', () => {
            const darkLord = createBoss('dark_lord');
            expect(darkLord).toBeDefined();
            expect(darkLord.isBoss).toBe(true);
            expect(darkLord.name).toBe('Dunkler Lord');

            const unknown = createBoss('invalid_boss');
            expect(unknown).toBeNull();
        });
    });
});
