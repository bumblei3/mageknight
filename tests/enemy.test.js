import { describe, it, expect, beforeEach } from './testRunner.js';
import { Enemy, BossEnemy, ENEMY_TYPES, BOSS_PHASES, createEnemy, createBoss, createEnemies, ENEMY_DEFINITIONS } from '../js/enemy.js';
import { setLanguage } from '../js/i18n/index.js';

describe('Enemy System', () => {
    beforeEach(() => {
        setLanguage('de');
    });

    it('should create an enemy with correct properties', () => {
        const enemy = new Enemy({
            type: ENEMY_TYPES.ORC,
            name: 'Test Orc',
            armor: 3,
            attack: 2,
            fame: 2
        });

        expect(enemy.name).toBe('Test Orc');
        expect(enemy.armor).toBe(3);
        expect(enemy.attack).toBe(2);
        expect(enemy.fame).toBe(2);
        expect(enemy.isDefeated(2)).toBe(false);
        expect(enemy.isDefeated(3)).toBe(true);
    });

    it('should handle brutal ability', () => {
        const enemy = new Enemy({
            name: 'Brutal Orc',
            attack: 3,
            brutal: true
        });

        expect(enemy.getEffectiveAttack()).toBe(6);
    });

    it('should handle swift ability', () => {
        const enemy = new Enemy({
            name: 'Swift Orc',
            attack: 3,
            swift: true
        });

        expect(enemy.getBlockRequirement()).toBe(6);
    });

    it('should clone enemy', () => {
        const original = new Enemy({
            name: 'Original',
            armor: 5,
            fireResist: true
        });

        const clone = original.clone();

        expect(clone.name).toBe('Original');
        expect(clone.armor).toBe(5);
        expect(clone.fireResist).toBe(true);
        expect(clone === original).toBe(false);
    });

    it('should create enemy from factory', () => {
        const orc = createEnemy(ENEMY_TYPES.ORC);

        expect(orc).toBeDefined();
        expect(orc.type).toBe(ENEMY_TYPES.ORC);
        expect(orc.name).toBe(ENEMY_DEFINITIONS[ENEMY_TYPES.ORC].name);
    });

    it('should return null for unknown enemy type', () => {
        const unknown = createEnemy('unknown_type');
        expect(unknown).toBeNull();
    });

    it('should create enemy with position', () => {
        const pos = { q: 1, r: -1 };
        const orc = createEnemy(ENEMY_TYPES.ORC, pos);

        expect(orc.position).toEqual(pos);
    });

    it('should have correct resistances', () => {
        const draconum = createEnemy(ENEMY_TYPES.DRACONUM);

        expect(draconum.fireResist).toBe(true);
        expect(draconum.iceResist).toBe(false); // Default false
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

            const transition = result.transitions.find(t => t.phase === (setLanguage('de') && 'Wütend' || 'Wütend'));
            // Since we set de in beforeEach, it should be Wütend
            expect(transition).toBeDefined();
        });

        it('should increase attack when enraged', () => {
            boss.attack = 10;
            boss.enrageMultiplier = 2;
            expect(boss.getEffectiveAttack()).toBe(10);

            boss.enraged = true;
            expect(boss.getEffectiveAttack()).toBe(20);
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
        });
    });

    describe('Factory Functions Extended', () => {
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
        });
    });
});
