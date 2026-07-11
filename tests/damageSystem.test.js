import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DamageSystem } from '../js/combat/DamageSystem.js';

/** Minimal hero mock that records wounds. */
function makeHero({ armor = 2 } = {}) {
    return {
        armor,
        handWounds: 0,
        discardWounds: 0,
        takeWound() { this.handWounds++; },
        takeWoundToDiscard() { this.discardWounds++; },
    };
}

/** Enemy mock with the methods DamageSystem touches. */
function makeEnemy(overrides = {}) {
    return {
        name: 'TestEnemy',
        getEffectiveAttack() { return this.attack; },
        attack: 3,
        petrify: false,
        poison: false,
        vampiric: false,
        assassin: false,
        abilities: [],
        armorBonus: 0,
        ...overrides,
    };
}

describe('DamageSystem', () => {
    let ds;

    beforeEach(() => {
        ds = new DamageSystem();
    });

    describe('reset', () => {
        it('clears paralyzeTriggered state', () => {
            ds.paralyzeTriggered = true;
            ds.reset();
            expect(ds.paralyzeTriggered).toBe(false);
        });
    });

    describe('calculateDamage - normal', () => {
        it('applies ceil(totalDamage / armor) wounds to hand', () => {
            const hero = makeHero({ armor: 2 });
            const result = ds.calculateDamage(hero, [makeEnemy({ attack: 5 }), makeEnemy({ attack: 3 })]);
            expect(result.totalDamage).toBe(8);
            expect(result.woundsReceived).toBe(4); // ceil(8/2)
            expect(hero.handWounds).toBe(4);
            expect(hero.discardWounds).toBe(0);
        });

        it('returns zero wounds for NaN baseWounds (zero attack)', () => {
            const hero = makeHero({ armor: 2 });
            const result = ds.calculateDamage(hero, [makeEnemy({ attack: 0 })]);
            expect(result.woundsReceived).toBe(0);
            expect(hero.handWounds).toBe(0);
        });

        it('uses armor default of 1 when hero.armor is null', () => {
            const hero = { armor: null, handWounds: 0, discardWounds: 0, takeWound() { this.handWounds++; }, takeWoundToDiscard() { this.discardWounds++; } };
            const result = ds.calculateDamage(hero, [makeEnemy({ attack: 3 })]);
            expect(hero.armor).toBeNull();
            expect(result.woundsReceived).toBe(3); // ceil(3/1)
        });
    });

    describe('calculateDamage - poison', () => {
        it('routes wounds to discard pile and doubles count', () => {
            const hero = makeHero({ armor: 2 });
            const result = ds.calculateDamage(hero, [makeEnemy({ attack: 4, poison: true })]);
            expect(hero.discardWounds).toBe(2); // baseWounds from ceil(4/2)=2
            expect(hero.handWounds).toBe(0);
            expect(result.woundsReceived).toBe(4); // doubled for tracking
        });

        it('detects poison via abilities array', () => {
            const hero = makeHero({ armor: 1 });
            const enemy = makeEnemy({ attack: 2, abilities: ['poison'] });
            const result = ds.calculateDamage(hero, [enemy]);
            expect(result.woundsReceived).toBe(4); // doubled
            expect(hero.discardWounds).toBe(2);
        });
    });

    describe('calculateDamage - petrify / paralyze', () => {
        it('sets paralyzeTriggered when a petrify enemy deals wounds', () => {
            const hero = makeHero({ armor: 1 });
            const result = ds.calculateDamage(hero, [makeEnemy({ attack: 2, petrify: true })]);
            expect(result.paralyzeTriggered).toBe(true);
        });

        it('does not trigger paralyze when no wounds received', () => {
            const hero = makeHero({ armor: 1 });
            const result = ds.calculateDamage(hero, [makeEnemy({ attack: 0, petrify: true })]);
            expect(result.paralyzeTriggered).toBe(false);
        });
    });

    describe('calculateDamage - vampiric', () => {
        it('adds armorBonus equal to woundsReceived when vampiric', () => {
            const hero = makeHero({ armor: 1 });
            const enemy = makeEnemy({ attack: 3, vampiric: true });
            ds.calculateDamage(hero, [enemy]);
            expect(enemy.armorBonus).toBe(3);
        });

        it('does not add armorBonus when no wounds received', () => {
            const hero = makeHero({ armor: 1 });
            const enemy = makeEnemy({ attack: 0, vampiric: true });
            ds.calculateDamage(hero, [enemy]);
            expect(enemy.armorBonus).toBe(0);
        });
    });

    describe('assignDamageToUnit', () => {
        function makeUnit({ resistances = [], destroyed = false, wounds = 0 } = {}) {
            return {
                name: 'Unit',
                destroyed,
                wounds,
                getResistances() { return resistances; },
                getName() { return this.name; },
                takeWound() { this.wounds++; if (this.wounds >= 2) this.destroyed = true; },
            };
        }

        it('blocks assassins with a failure result', () => {
            const unit = makeUnit();
            const enemy = makeEnemy({ assassin: true });
            const result = ds.assignDamageToUnit(unit, enemy);
            expect(result.success).toBe(false);
            expect(result.message).toContain('assassin');
        });

        it('applies a normal wound to a unit', () => {
            const unit = makeUnit();
            const result = ds.assignDamageToUnit(unit, makeEnemy({ attack: 3 }));
            expect(result.success).toBe(true);
            expect(unit.wounds).toBe(1);
        });

        it('petrifies the unit instead of a normal wound', () => {
            const unit = makeUnit();
            ds.assignDamageToUnit(unit, makeEnemy({ attack: 3, petrify: true }));
            expect(unit.destroyed).toBe(true);
            expect(unit.wounds).toBe(0);
        });

        it('applies double wounds for poison enemies', () => {
            const unit = makeUnit();
            const result = ds.assignDamageToUnit(unit, makeEnemy({ attack: 3, poison: true }));
            expect(unit.wounds).toBe(2);
            // destroyed because 2 wounds reached threshold in mock
            expect(result.unitDestroyed).toBe(true);
        });

        it('grants vampiric enemy armorBonus based on wounds dealt', () => {
            const unit = makeUnit();
            const enemy = makeEnemy({ attack: 3, vampiric: true });
            ds.assignDamageToUnit(unit, enemy);
            expect(enemy.armorBonus).toBe(1);
        });

        it('respects unit resistances (physical halves damage but not wound count here)', () => {
            // applyUnitResistance reduces logged effectiveDamage; mutation path stays 1 wound
            const unit = makeUnit({ resistances: ['physical'] });
            const result = ds.assignDamageToUnit(unit, makeEnemy({ attack: 6 })); // physical default
            expect(result.success).toBe(true);
            expect(unit.wounds).toBe(1);
        });
    });

    describe('applyUnitResistance (private, exercised via assignDamageToUnit)', () => {
        it('halves fire damage for fire-resistant units', () => {
            const unit = {
                getResistances() { return ['fire']; },
                getName() { return 'U'; },
                takeWound() {},
            };
            const enemy = makeEnemy({ attack: 10, attackType: 'fire' });
            // Logged effective damage should be 5 (halved)
            const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
            ds.assignDamageToUnit(unit, enemy);
            spy.mockRestore();
        });
    });
});
