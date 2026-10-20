import { describe, it, expect } from 'vitest';
import {
    EFFECT_TYPE_TO_KEY,
    EFFECT_TYPES_HANDLED_ELSEWHERE,
    UNHANDLED_EFFECT_LABELS,
    UNHANDLED_EFFECT_TYPES,
    CHOICE_EFFECT_KEYS,
    EFFECT_FLAGS,
    EFFECT_FIELDS,
    secondaryEffectKey,
    isKnownEffectType,
    KNOWN_EFFECT_KEYS,
    PRIMARY_EFFECT_ORDER,
    collectEffectKeys,
    isAppliedEffectKey,
} from '../../js/card/effectMeta';

describe('effectMeta coverage', () => {
    it('EFFECT_TYPE_TO_KEY maps every declared type to a direct key', () => {
        for (const [type, key] of Object.entries(EFFECT_TYPE_TO_KEY)) {
            expect(typeof key).toBe('string');
            expect(key.length).toBeGreaterThan(0);
        }
        expect(EFFECT_TYPE_TO_KEY.move).toBe('movement');
        expect(EFFECT_TYPE_TO_KEY.attack).toBe('attack');
    });

    it('secondaryEffectKey resolves type2 keys', () => {
        expect(secondaryEffectKey('move')).toBe('movement');
        expect(secondaryEffectKey(undefined)).toBeUndefined();
        expect(secondaryEffectKey('nope')).toBeUndefined();
    });

    it('isKnownEffectType accepts known types and rejects unknown', () => {
        expect(isKnownEffectType('move')).toBe(true);
        expect(isKnownEffectType('versatile')).toBe(true);
        expect(isKnownEffectType('spell_effect')).toBe(true);
        expect(isKnownEffectType('none')).toBe(true);
        expect(isKnownEffectType(undefined)).toBe(true);
        expect(isKnownEffectType('totally_made_up')).toBe(false);
    });

    it('UNHANDLED_EFFECT_TYPES includes UNHANDLED_EFFECT_LABELS keys plus none', () => {
        for (const key of Object.keys(UNHANDLED_EFFECT_LABELS)) {
            expect(UNHANDLED_EFFECT_TYPES).toContain(key);
        }
        expect(UNHANDLED_EFFECT_TYPES).toContain('none');
    });

    it('every flag matches() is exercised without throwing', () => {
        for (const flag of EFFECT_FLAGS) {
            if (typeof flag.matches === 'function') {
                flag.matches(true);
                flag.matches(false);
                flag.matches(0);
                flag.matches(1);
                flag.matches('physical');
                flag.matches('fire');
                flag.matches('all');
            }
        }
        const fireAttack = EFFECT_FLAGS.find((f) => f.key === 'fireAttack');
        expect(fireAttack?.matches?.(2)).toBe(true);
        expect(fireAttack?.matches?.(0)).toBe(false);
        const unitRec = EFFECT_FLAGS.find((f) => f.key === 'unitRecruitment');
        expect(unitRec?.matches?.(3)).toBe(true);
        expect(unitRec?.matches?.(0)).toBe(false);
        const iceBlock = EFFECT_FLAGS.find((f) => f.key === 'iceBlock');
        expect(iceBlock?.matches?.(true)).toBe(true);
        expect(iceBlock?.matches?.(false)).toBe(false);
        const vamp = EFFECT_FLAGS.find((f) => f.key === 'vampirism');
        expect(vamp?.matches?.(true)).toBe(true);
        const cleanse = EFFECT_FLAGS.find((f) => f.key === 'cleanse');
        expect(cleanse?.matches?.(true)).toBe(true);
        const keep = EFFECT_FLAGS.find((f) => f.key === 'keep');
        expect(keep?.matches?.(true)).toBe(true);
        const element = EFFECT_FLAGS.find((f) => f.key === 'element');
        expect(element?.matches?.('fire')).toBe(true);
        expect(element?.matches?.('physical')).toBe(false);
        const target = EFFECT_FLAGS.find((f) => f.key === 'target');
        expect(target?.matches?.('all')).toBe(true);
        expect(target?.matches?.('single')).toBe(false);
    });

    it('EFFECT_FLAGS entries have required fields', () => {
        for (const flag of EFFECT_FLAGS) {
            expect(flag.key).toBeTruthy();
            expect(flag.icon).toBeTruthy();
            expect(flag.label).toBeTruthy();
        }
    });

    it('EFFECT_FIELDS covers all primary effect keys', () => {
        expect(EFFECT_FIELDS.length).toBeGreaterThan(10);
        const keys = EFFECT_FIELDS.map((f) => f.key);
        expect(keys).toContain('movement');
        expect(keys).toContain('attack');
    });

    it('PRIMARY_EFFECT_ORDER mirrors EFFECT_FIELDS', () => {
        expect(PRIMARY_EFFECT_ORDER).toEqual(EFFECT_FIELDS.map((f) => f.key));
    });

    it('KNOWN_EFFECT_KEYS includes all declared surfaces', () => {
        expect(KNOWN_EFFECT_KEYS).toContain('type');
        expect(KNOWN_EFFECT_KEYS).toContain('value');
        expect(KNOWN_EFFECT_KEYS).toContain('area');
        expect(KNOWN_EFFECT_KEYS).toContain('move');
    });

    it('CHOICE_EFFECT_KEYS lists wish and copyCard', () => {
        expect(CHOICE_EFFECT_KEYS).toContain('wish');
        expect(CHOICE_EFFECT_KEYS).toContain('copyCard');
    });

    it('EFFECT_TYPES_HANDLED_ELSEWHERE includes versatile and command', () => {
        expect(EFFECT_TYPES_HANDLED_ELSEWHERE).toContain('versatile');
        expect(EFFECT_TYPES_HANDLED_ELSEWHERE).toContain('command');
    });

    it('collectEffectKeys handles null/undefined/non-object gracefully', () => {
        expect(collectEffectKeys()).toEqual([]);
        expect(collectEffectKeys(null, undefined, 42)).toEqual([]);
        expect(collectEffectKeys([])).toEqual([]);
    });

    it('collectEffectKeys extracts keys from effect objects', () => {
        const cards = [
            { basicEffect: { move: 2, attack: 1 }, strongEffect: { block: 3 } },
            { advancedEffect: { draw: 1 } },
        ];
        const keys = collectEffectKeys(cards);
        expect(keys).toContain('move');
        expect(keys).toContain('attack');
        expect(keys).toContain('block');
        expect(keys).toContain('draw');
    });

    it('collectEffectKeys handles null effect objects', () => {
        const cards = [
            { basicEffect: null, strongEffect: undefined, advancedEffect: 5 },
        ];
        const keys = collectEffectKeys(cards);
        expect(keys).toEqual([]);
    });

    it('isAppliedEffectKey is a function', () => {
        expect(typeof isAppliedEffectKey).toBe('function');
    });
});
