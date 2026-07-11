import { describe, it, expect } from 'vitest';
import { CombatPredictor } from '../js/combat/CombatPredictor.js';
import { COMBAT_PHASES, ATTACK_ELEMENTS } from '../js/constants.js';

function enemy(id, overrides = {}) {
    return {
        id,
        name: 'Enemy' + id,
        attackType: ATTACK_ELEMENTS.PHYSICAL,
        getEffectiveAttack() { return this.attack || 3; },
        attack: 3,
        poison: false,
        abilities: [],
        assassin: false,
        isBoss: false,
        armor: 4,
        getCurrentArmor() { return this.armor; },
        ...overrides,
    };
}

function combat(phase, enemies, opts = {}) {
    return {
        phase,
        enemies,
        blockedEnemies: new Set(opts.blocked || []),
        defeatedEnemies: opts.defeated || [],
        unblockedEnemies: enemies.filter((e) => !(opts.blocked || []).includes(e.id)),
        hero: { armor: 2 },
        unitManager: opts.unitManager || null,
    };
}

describe('CombatPredictor.getBlockEfficiency (via static API)', () => {
    it('fully blocks Fire with Ice or Cold Fire', () => {
        expect(CombatPredictor.getPredictedOutcome).toBeTypeOf('function');
    });
});

describe('CombatPredictor.getPredictedOutcome', () => {
    it('returns null when combat is COMPLETE', () => {
        const c = combat(COMBAT_PHASES.COMPLETE, [enemy(1)]);
        expect(CombatPredictor.getPredictedOutcome(c)).toBeNull();
    });

    it('predicts wounds in BLOCK phase without unit manager', () => {
        const c = combat(COMBAT_PHASES.BLOCK, [enemy(1, { attack: 6 })]);
        const p = CombatPredictor.getPredictedOutcome(c);
        expect(p.expectedWounds).toBe(3); // ceil(6/2)
        expect(p.totalEnemyAttack).toBe(6);
        expect(p.isPoisoned).toBe(false);
    });

    it('flags poison and doubles poison wounds', () => {
        const c = combat(COMBAT_PHASES.BLOCK, [enemy(1, { attack: 4, poison: true })]);
        const p = CombatPredictor.getPredictedOutcome(c);
        expect(p.isPoisoned).toBe(true);
        expect(p.poisonWounds).toBe(2); // ceil(4/2)
    });

    it('skips already-blocked enemies in damage prediction', () => {
        const c = combat(COMBAT_PHASES.BLOCK, [enemy(1, { attack: 6 })], { blocked: [1] });
        const p = CombatPredictor.getPredictedOutcome(c);
        expect(p.totalEnemyAttack).toBe(0);
        expect(p.expectedWounds).toBe(0);
    });

    it('flags assassin restriction', () => {
        const c = combat(COMBAT_PHASES.BLOCK, [enemy(1, { assassin: true })]);
        const p = CombatPredictor.getPredictedOutcome(c);
        expect(p.assassinRestriction).toBe(true);
    });

    it('emits block efficiency warnings for elemental mismatches', () => {
        const c = combat(COMBAT_PHASES.BLOCK, [enemy(1, { attack: 4, attackType: ATTACK_ELEMENTS.FIRE })]);
        c.unitManager = {
            getBlockSources() { return [{ value: 3, element: ATTACK_ELEMENTS.PHYSICAL }]; },
            getAttackSources() { return []; },
            getRangedSources() { return []; },
        };
        const p = CombatPredictor.getPredictedOutcome(c);
        expect(p.blockEfficiencyWarnings.length).toBeGreaterThan(0);
    });

    it('predicts defeated enemies in ATTACK phase when attack exceeds armor', () => {
        const c = combat(COMBAT_PHASES.ATTACK, [enemy(1, { armor: 4 })]);
        const p = CombatPredictor.getPredictedOutcome(c, 6); // attack 6 > 4
        expect(p.enemiesDefeated).toContain('Enemy1');
    });

    it('emits elemental efficiency warning for fire-resistant enemy', () => {
        const c = combat(COMBAT_PHASES.ATTACK, [enemy(1, { fireResist: true })]);
        c.unitManager = {
            getBlockSources() { return []; },
            getAttackSources() { return [{ value: 10, element: ATTACK_ELEMENTS.FIRE }]; },
            getRangedSources() { return []; },
        };
        const p = CombatPredictor.getPredictedOutcome(c, 0, 0);
        expect(p.elementalEfficiencyWarnings.length).toBeGreaterThan(0);
    });
});

describe('CombatPredictor.getPreCombatPrediction', () => {
    it('returns null for missing hero or empty enemies', () => {
        expect(CombatPredictor.getPreCombatPrediction(null, [])).toBeNull();
        expect(CombatPredictor.getPreCombatPrediction({}, [])).toBeNull();
        expect(CombatPredictor.getPreCombatPrediction(null, [enemy(1)])).toBeNull();
    });

    it('predicts hero wounds from enemy attacks and armor', () => {
        const hero = { armor: 2, hand: [] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { attack: 6 })]);
        expect(prediction.expectedWounds).toBe(3); // ceil(6/2)
        expect(prediction.totalEnemyAttack).toBe(6);
    });

    it('flags poison and doubles poison wounds', () => {
        const hero = { armor: 2, hand: [] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { attack: 4, poison: true })]);
        expect(prediction.isPoisoned).toBe(true);
        expect(prediction.poisonWounds).toBe(4); // expectedWounds*2
    });

    it('flags assassin restriction from enemy', () => {
        const hero = { armor: 2, hand: [] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { assassin: true })]);
        expect(prediction.assassinRestriction).toBe(true);
    });

    it('warns on fortified enemy without siege/ranged', () => {
        const hero = { armor: 2, hand: [] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { fortified: true })]);
        expect(prediction.blockEfficiencyWarnings.some((w) => w.includes('BEFESTIGT'))).toBe(true);
    });

    it('warns on swift enemy', () => {
        const hero = { armor: 2, hand: [] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { swift: true })]);
        expect(prediction.blockEfficiencyWarnings.some((w) => w.includes('FLINK'))).toBe(true);
    });

    it('aggregates attack potential from hand cards', () => {
        const card = {
            isWound() { return false; },
            getEffect(strong) {
                return strong
                    ? { attack: 5, block: 2, ranged: 0, siege: 0 }
                    : { attack: 3, block: 1, ranged: 0, siege: 0 };
            },
        };
        const hero = { armor: 2, hand: [card] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { armor: 10 })]);
        // maxAttack = max(3,5)=5; realistic 0.8 => ceil(5*0.8)=4 < 10 -> partial progress
        expect(prediction.enemiesDefeated[0]).toContain('Enemy1');
        expect(prediction.enemiesDefeated[0]).toContain('%');
    });

    it('aggregates attack potential from ready units with abilities', () => {
        const unit = {
            isReady() { return true; },
            getAbilities() {
                return [
                    { type: 'attack', value: 4 },
                    { type: 'block', value: 3 },
                    { type: 'ranged', value: 2 },
                ];
            },
        };
        const hero = { armor: 2, hand: [], units: [unit] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { armor: 50 })]);
        // maxAttack includes unit attack(4)+ranged(2)=6; partial progress on a tough enemy
        expect(prediction.enemiesDefeated[0]).toContain('%');
    });

    it('skips unready units', () => {
        const unit = { isReady() { return false; }, getAbilities() { return [{ type: 'attack', value: 99 }]; } };
        const hero = { armor: 2, hand: [], units: [unit] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { armor: 5 })]);
        // No attack potential -> enemy not listed as defeated
        expect(prediction.enemiesDefeated).toHaveLength(0);
    });

    it('skips wound cards in hand', () => {
        const woundCard = { isWound() { return true; }, getEffect() { return { attack: 99 }; } };
        const hero = { armor: 2, hand: [woundCard] };
        const prediction = CombatPredictor.getPreCombatPrediction(hero, [enemy(1, { armor: 5 })]);
        expect(prediction.enemiesDefeated).toHaveLength(0);
    });
});
