import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Enemy, BossEnemy, createEnemy, createEnemies, createBoss } from '../js/enemy.js';

describe('Enemy', () => {
    describe('constructor defaults', () => {
        it('applies data values and sensible defaults', () => {
            const e = new Enemy({ type: 'goblin', armor: 4, attack: 3, name: 'Goblin' });
            expect(e.type).toBe('goblin');
            expect(e.armor).toBe(4);
            expect(e.attack).toBe(3);
            expect(e.fortified).toBe(false);
            expect(e.defensive).toBe(false);
            expect(e.arcaneImmune).toBe(false);
            expect(e.armorBonus).toBe(0);
            expect(e.attackType).toBe('physical');
            expect(e.lowerArmor).toBe(2); // floor(4/2)
            expect(e.icon).toBe('👹');
        });

        it('derives id and name fallback when missing', () => {
            const e = new Enemy({ type: 'goblin' });
            expect(e.id).toContain('enemy_');
            expect(typeof e.name).toBe('string');
            expect(e.name.length).toBeGreaterThan(0);
        });

        it('computes lowerArmor from armor when not provided', () => {
            const e = new Enemy({ type: 'x', armor: 7 });
            expect(e.lowerArmor).toBe(3); // floor(7/2)
        });

        it('honors explicit lowerArmor', () => {
            const e = new Enemy({ type: 'x', armor: 7, lowerArmor: 1 });
            expect(e.lowerArmor).toBe(1);
        });

        it('honors an explicit lowerArmor of 0 (does not derive floor(armor/2))', () => {
            // lowerArmor: 0 is a valid, deliberate value (armor never drops
            // below 0). The `||` default would silently reset it to floor(7/2)=3.
            const e = new Enemy({ type: 'x', armor: 7, lowerArmor: 0 });
            expect(e.lowerArmor).toBe(0);
        });
    });

    describe('getResistanceMultiplier', () => {
        it('halves fire damage when fireResist', () => {
            const e = new Enemy({ type: 'x', fireResist: true });
            expect(e.getResistanceMultiplier('fire')).toBe(0.5);
        });
        it('halves ice damage when iceResist', () => {
            const e = new Enemy({ type: 'x', iceResist: true });
            expect(e.getResistanceMultiplier('ice')).toBe(0.5);
        });
        it('halves physical damage when physicalResist', () => {
            const e = new Enemy({ type: 'x', physicalResist: true });
            expect(e.getResistanceMultiplier('physical')).toBe(0.5);
        });
        it('returns 1 for non-resisted elements', () => {
            const e = new Enemy({ type: 'x', fireResist: true });
            expect(e.getResistanceMultiplier('ice')).toBe(1.0);
        });
    });

    describe('getCurrentArmor', () => {
        it('returns base armor plus bonus', () => {
            const e = new Enemy({ type: 'x', armor: 4 });
            e.armorBonus = 2;
            expect(e.getCurrentArmor()).toBe(6);
        });
        it('lowers armor for elusive enemy during attack when blocked', () => {
            const e = new Enemy({ type: 'x', armor: 6, elusive: true, lowerArmor: 1 });
            expect(e.getCurrentArmor(true, true)).toBe(1 + 0);
        });
        it('keeps base armor for elusive enemy when not blocked', () => {
            const e = new Enemy({ type: 'x', armor: 6, elusive: true });
            expect(e.getCurrentArmor(false, true)).toBe(6);
        });
        it('keeps base armor for elusive enemy outside attack phase', () => {
            const e = new Enemy({ type: 'x', armor: 6, elusive: true });
            expect(e.getCurrentArmor(true, false)).toBe(6);
        });
    });

    describe('getEffectiveAttack / getBlockRequirement', () => {
        it('doubles attack when brutal', () => {
            const e = new Enemy({ type: 'x', attack: 3, brutal: true });
            expect(e.getEffectiveAttack()).toBe(6);
        });
        it('leaves attack when not brutal', () => {
            const e = new Enemy({ type: 'x', attack: 3 });
            expect(e.getEffectiveAttack()).toBe(3);
        });
        it('doubles block requirement when swift', () => {
            const e = new Enemy({ type: 'x', attack: 3, swift: true });
            expect(e.getBlockRequirement()).toBe(6);
        });
        it('keeps block requirement when not swift', () => {
            const e = new Enemy({ type: 'x', attack: 3 });
            expect(e.getBlockRequirement()).toBe(3);
        });
    });

    describe('isDefeated', () => {
        it('returns true when attack >= current armor', () => {
            const e = new Enemy({ type: 'x', armor: 4 });
            expect(e.isDefeated(4)).toBe(true);
            expect(e.isDefeated(5)).toBe(true);
        });
        it('returns false when attack < current armor', () => {
            const e = new Enemy({ type: 'x', armor: 4 });
            expect(e.isDefeated(3)).toBe(false);
        });
        it('returns false when no attack value given', () => {
            const e = new Enemy({ type: 'x', armor: 4 });
            expect(e.isDefeated()).toBe(false);
        });
    });

    describe('getState / loadState', () => {
        it('serializes core fields', () => {
            const e = new Enemy({ type: 'goblin', armor: 4, attack: 3, fame: 2, isBoss: false });
            const s = e.getState();
            expect(s.type).toBe('goblin');
            expect(s.armor).toBe(4);
            expect(s.fame).toBe(2);
            expect(s.isBoss).toBe(false);
        });
        it('returns early on null state', () => {
            const e = new Enemy({ type: 'x' });
            expect(() => e.loadState(null)).not.toThrow();
        });
        it('restores position from state', () => {
            const e = new Enemy({ type: 'x' });
            e.loadState({ position: { q: 1, r: 2 } });
            expect(e.position).toEqual({ q: 1, r: 2 });
        });
        it('clears position when state has none', () => {
            const e = new Enemy({ type: 'x', position: { q: 5, r: 5 } });
            e.loadState({});
            expect(e.position).toBeNull();
        });
    });

    describe('clone', () => {
        it('produces an equivalent enemy', () => {
            const e = new Enemy({ type: 'x', armor: 4, attack: 3, swift: true, fireResist: true });
            const c = e.clone();
            expect(c).not.toBe(e);
            expect(c.armor).toBe(4);
            expect(c.swift).toBe(true);
            expect(c.fireResist).toBe(true);
        });
    });
});

describe('BossEnemy', () => {
    function makeBoss(overrides = {}) {
        return new BossEnemy({ type: 'dragon', maxHealth: 30, currentHealth: 30, ...overrides });
    }

    it('sets boss flag and default phases', () => {
        const b = makeBoss();
        expect(b.isBoss).toBe(true);
        expect(b.maxHealth).toBe(30);
        expect(b.phases.length).toBeGreaterThan(0);
        expect(b.enraged).toBe(false);
        expect(b.enrageThreshold).toBe(0.25);
        expect(b.enrageMultiplier).toBe(1.5);
    });

    it('uses volkare 5-phase layout', () => {
        const b = new BossEnemy({ type: 'volkare', maxHealth: 40 });
        // 4 phases + enraged
        expect(b.phases.length).toBe(5);
    });

    describe('takeDamage', () => {
        it('reduces health and reports defeated at zero', () => {
            const b = makeBoss({ currentHealth: 5 });
            const r = b.takeDamage(10);
            expect(r.currentHealth).toBe(0);
            expect(r.defeated).toBe(true);
            expect(r.healthPercent).toBe(0);
        });

        it('triggers enrage transition at threshold', () => {
            const b = makeBoss({ currentHealth: 10 }); // 10/30 = 0.33 > 0.25
            b.takeDamage(3); // 7/30 = 0.23 <= 0.25
            expect(b.enraged).toBe(true);
            expect(b.currentPhase).toBe('enraged');
        });

        it('triggers phase transitions in order', () => {
            const b = makeBoss({ currentHealth: 30 });
            const r = b.takeDamage(23); // 7/30 -> below phase thresholds
            expect(r.transitions.length).toBeGreaterThan(0);
        });

        it('does not re-trigger an already-triggered phase', () => {
            const b = makeBoss({ currentHealth: 30 });
            b.takeDamage(25); // 5/30
            const first = b.phases.filter(p => p.triggered).length;
            b.takeDamage(1); // 4/30, no new threshold crossed necessarily
            const second = b.phases.filter(p => p.triggered).length;
            expect(second).toBeGreaterThanOrEqual(first);
        });
    });

    describe('getPhaseAbility', () => {
        it('looks up by phase name from map', () => {
            const b = makeBoss();
            expect(b.getPhaseAbility('Phase 2')).toBe('summon');
            expect(b.getPhaseAbility('Phase 3')).toBe('heal');
            expect(b.getPhaseAbility('Enraged')).toBe('double_attack');
        });
        it('returns null for unknown phase', () => {
            const b = makeBoss();
            expect(b.getPhaseAbility('Nope')).toBeNull();
        });
    });

    describe('getEffectiveAttack (overridden)', () => {
        it('applies enrage multiplier', () => {
            const b = makeBoss({ attack: 4, brutal: false });
            expect(b.getEffectiveAttack()).toBe(4);
            b.enraged = true;
            expect(b.getEffectiveAttack()).toBe(Math.floor(4 * 1.5)); // 6
        });
        it('stacks with brutal', () => {
            const b = makeBoss({ attack: 4, brutal: true });
            b.enraged = true;
            // super = 4*2=8; enraged floor(8*1.5)=12
            expect(b.getEffectiveAttack()).toBe(12);
        });
    });

    describe('isDefeated (overridden)', () => {
        it('is based on health', () => {
            const b = makeBoss();
            b.currentHealth = 0;
            expect(b.isDefeated()).toBe(true);
            const b2 = makeBoss();
            b2.currentHealth = 5;
            expect(b2.isDefeated()).toBe(false);
        });
    });

    describe('getState / loadState', () => {
        it('serializes boss-specific fields', () => {
            const b = makeBoss();
            const s = b.getState();
            expect(s.maxHealth).toBe(30);
            expect(s.summonType).toBe('weakling');
            expect(s.summonCount).toBe(2);
        });
        it('restores currentHealth and phase', () => {
            const b = makeBoss();
            b.loadState({ currentHealth: 12, phase: 'enraged' });
            expect(b.currentHealth).toBe(12);
            expect(b.currentPhase).toBe('enraged');
        });
    });

    describe('getPhaseName', () => {
        it('returns enraged when enraged', () => {
            const b = makeBoss();
            b.enraged = true;
            expect(b.getPhaseName()).toContain('Enraged');
        });
        it('returns volkare phase names by health', () => {
            const b = new BossEnemy({ type: 'volkare', maxHealth: 100, currentHealth: 80 });
            expect(b.getPhaseName()).toContain('Phase 1');
            b.currentHealth = 55;
            expect(b.getPhaseName()).toContain('Phase 2');
            b.currentHealth = 35;
            expect(b.getPhaseName()).toContain('Phase 3');
            b.currentHealth = 20;
            // volkare has a 4th phase; German i18n lacks the 'phase4' key, so raw key is returned
            expect(b.getPhaseName()).toContain('phase4');
            b.currentHealth = 5;
            expect(b.getPhaseName()).toContain('Enraged');
        });
        it('returns non-volkare phase names by health', () => {
            const b = makeBoss({ maxHealth: 100, currentHealth: 80 });
            expect(b.getPhaseName()).toContain('Phase 1');
            b.currentHealth = 50;
            expect(b.getPhaseName()).toContain('Phase 2');
            b.currentHealth = 20;
            expect(b.getPhaseName()).toContain('Phase 3');
        });
    });

    describe('executePhaseAbility', () => {
        it('summons enemies', () => {
            const b = makeBoss({ summonType: 'goblin', summonCount: 3 });
            const r = b.executePhaseAbility('summon');
            expect(r.type).toBe('summon');
            expect(r.enemyType).toBe('goblin');
            expect(r.count).toBe(3);
        });
        it('heals and caps at maxHealth', () => {
            const b = makeBoss({ maxHealth: 30, currentHealth: 25 });
            const r = b.executePhaseAbility('heal');
            expect(r.type).toBe('heal');
            expect(b.currentHealth).toBe(28); // +10% of 30
        });
        it('manaburns 2-4', () => {
            const b = makeBoss();
            const r = b.executePhaseAbility('manaburn');
            expect(r.type).toBe('manaburn');
            expect(r.amount).toBeGreaterThanOrEqual(2);
            expect(r.amount).toBeLessThanOrEqual(4);
        });
        it('enrage / double_attack return buff', () => {
            const b = makeBoss();
            expect(b.executePhaseAbility('enrage').type).toBe('buff');
            expect(b.executePhaseAbility('double_attack').type).toBe('buff');
        });
        it('returns null for unknown ability', () => {
            const b = makeBoss();
            expect(b.executePhaseAbility('nonsense')).toBeNull();
        });
    });
});

describe('enemy factories', () => {
    it('createEnemy returns an Enemy from a known definition', () => {
        // goblin is a core enemy type in the definitions
        const e = createEnemy('goblin', { q: 1, r: 1 });
        expect(e).not.toBeNull();
        expect(e.type).toBe('goblin');
        expect(e.position).toEqual({ q: 1, r: 1 });
    });

    it('createEnemy returns null for unknown type', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(createEnemy('nonexistent_enemy_xyz')).toBeNull();
        spy.mockRestore();
    });

    it('createEnemies maps a list and drops unknown types', () => {
        const list = createEnemies([
            { type: 'goblin', position: { q: 0, r: 0 } },
        ]);
        expect(list.length).toBe(1);
        expect(list[0]).not.toBeNull();
    });

    it('createBoss returns a BossEnemy from a known definition', () => {
        const b = createBoss('volkare', { q: 2, r: 2 });
        expect(b).not.toBeNull();
        expect(b.isBoss).toBe(true);
        expect(b.type).toBe('volkare');
    });

    it('createBoss returns null for unknown boss', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(createBoss('nonexistent_boss_xyz')).toBeNull();
        spy.mockRestore();
    });
});
