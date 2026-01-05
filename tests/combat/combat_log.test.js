import { describe, it, expect, beforeEach } from '../testRunner.js';
import { BlockingEngine } from '../../js/combat/BlockingEngine.js';
import { ATTACK_ELEMENTS } from '../../js/constants.js';
import { t, setLanguage } from '../../js/i18n/index.js'; // Use index.js which initializes validation

// Mock translation to check keys
const i18nMock = {
    'combat.efficiency.fire_vs_fire': 'Fire vs Fire',
    'combat.efficiency.physical_vs_fire': 'Phys vs Fire',
    'combat.blockSuccess': 'Blocked! {note}',
    'combat.blockWeak': 'Weak! {note}'
};
// We rely on actual i18n logic but we can check if the output string contains expected parts.
// Since we updated en.js/de.js, we should use the real i18n if possible, or mock t if easier.
// The real i18n system might need loading.

describe('BlockingEngine Logs', () => {
    let engine;

    beforeEach(async () => {
        setLanguage('en');
        engine = new BlockingEngine();
    });

    it('should report efficient block without extra note', () => {
        const enemy = {
            name: 'TestEnemy',
            attackType: 'fire',
            getBlockRequirement: () => 4
        };
        // Ice vs Fire is efficient
        const result = engine.calculateBlock(enemy, { value: 4, element: 'ice' });

        expect(result.success).toBe(true);
        expect(result.isInefficient).toBe(false);
        expect(result.message).not.toContain('Inefficient');
        expect(result.message).not.toContain('halved');
    });

    it('should report specific reason for inefficient block (Physical vs Fire)', () => {
        const enemy = {
            name: 'FireEnemy',
            attackType: 'fire',
            getBlockRequirement: () => 4
        };
        // Physical vs Fire is inefficient (halved)
        // 4 -> 2 effective. Needs 4. Result: Weak.
        const result = engine.calculateBlock(enemy, { value: 4, element: 'physical' });

        expect(result.success).toBe(true);
        expect(result.isInefficient).toBe(true);
        // Should contain the specific reason string from en.js
        // "Physical Block halved vs Fire Attack"
        expect(result.message).toContain('Physical Block halved vs Fire Attack');
    });

    it('should report specific reason for inefficient block (Fire vs Fire)', () => {
        const enemy = {
            name: 'FireEnemy',
            attackType: 'fire',
            getBlockRequirement: () => 2
        };
        // Fire vs Fire is inefficient (halved)
        // 4 -> 2 effective. Matches 2. Result: Success.
        const result = engine.calculateBlock(enemy, { value: 4, element: 'fire' });

        expect(result.message).toContain('Fire Block halved vs Fire Attack');
    });

    it('should combine multiple reasons', () => {
        const enemy = {
            name: 'FireEnemy',
            attackType: 'fire',
            getBlockRequirement: () => 10
        };
        // Mixed block: 1 Physical (Inefficient), 1 Fire (Inefficient), 1 Ice (Efficient)
        const blocks = [
            { value: 4, element: 'physical' }, // -> 2. Reason: phys_vs_fire
            { value: 4, element: 'fire' },     // -> 2. Reason: fire_vs_fire
            { value: 2, element: 'ice' }       // -> 2. Efficient
        ];

        const result = engine.calculateBlock(enemy, blocks);

        expect(result.message).toContain('Physical Block halved vs Fire Attack');
        expect(result.message).toContain('Fire Block halved vs Fire Attack');
    });
});
