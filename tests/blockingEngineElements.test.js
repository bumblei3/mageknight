import { describe, it, expect } from 'vitest';
import { BlockingEngine } from '../js/combat/BlockingEngine.js';
import { ATTACK_ELEMENTS } from '../js/constants.js';

function makeEnemy(overrides = {}) {
    return {
        name: 'TestEnemy',
        attackType: ATTACK_ELEMENTS.PHYSICAL,
        getBlockRequirement: () => 4,
        ...overrides,
    };
}

const E = ATTACK_ELEMENTS;

describe('BlockingEngine', () => {
    let engine;
    beforeEach(() => { engine = new BlockingEngine(); });

    describe('blockInput parsing', () => {
        it('accepts a raw number', () => {
            const r = engine.calculateBlock(makeEnemy(), 4);
            expect(r.blocked).toBe(true);
            expect(r.consumedPoints).toBe(4);
        });

        it('accepts a single block source object', () => {
            const r = engine.calculateBlock(makeEnemy(), { value: 4, element: E.PHYSICAL });
            expect(r.blocked).toBe(true);
            expect(r.consumedPoints).toBe(4);
        });

        it('accepts an array of block sources', () => {
            const r = engine.calculateBlock(makeEnemy(), [
                { value: 2, element: E.PHYSICAL },
                { value: 2, element: E.PHYSICAL },
            ]);
            expect(r.blocked).toBe(true);
            expect(r.consumedPoints).toBe(4);
        });

        it('accepts object with .blocks array', () => {
            const r = engine.calculateBlock(makeEnemy(), {
                blocks: [{ value: 4, element: E.PHYSICAL }],
            });
            expect(r.blocked).toBe(true);
        });

        it('reads movementPoints from object form (when not passed directly)', () => {
            const enemy = makeEnemy({ cumbersome: true, getBlockRequirement: () => 8 });
            // movementPoints reduces block requirement for cumbersome enemies
            const r = engine.calculateBlock(enemy, { value: 4, element: E.PHYSICAL, movementPoints: 3 });
            // requirement 8 - 3 = 5; block 4 < 5 -> not blocked
            expect(r.blocked).toBe(false);
        });

        it('treats null/undefined input as zero block', () => {
            const r = engine.calculateBlock(makeEnemy(), null);
            expect(r.blocked).toBe(false);
            expect(r.consumedPoints).toBe(0);
        });
    });

    describe('element efficiency - card blocks', () => {
        function blockVs(enemyElement, blockElement, value = 4) {
            const enemy = makeEnemy({ attackType: enemyElement, getBlockRequirement: () => 4 });
            return engine.calculateBlock(enemy, { value, element: blockElement });
        }

        it('physical vs physical blocks fully', () => {
            const r = blockVs(E.PHYSICAL, E.PHYSICAL);
            expect(r.blocked).toBe(true);
            expect(r.isInefficient).toBe(false);
        });

        it('cold_fire blocks are wildcard (full vs any element)', () => {
            const r = blockVs(E.FIRE, E.COLD_FIRE);
            expect(r.isInefficient).toBe(false);
            expect(r.blocked).toBe(true);
            const r2 = blockVs(E.ICE, E.COLD_FIRE);
            expect(r2.isInefficient).toBe(false);
        });

        it('fire block vs fire enemy is inefficient (0.5)', () => {
            const r = blockVs(E.FIRE, E.FIRE);
            expect(r.isInefficient).toBe(true);
            expect(r.blocked).toBe(false); // 4 * 0.5 = 2 < 4
        });

        it('physical block vs fire enemy is inefficient (0.5)', () => {
            const r = blockVs(E.FIRE, E.PHYSICAL);
            expect(r.isInefficient).toBe(true);
        });

        it('ice block vs fire enemy is full efficiency', () => {
            const r = blockVs(E.FIRE, E.ICE);
            expect(r.isInefficient).toBe(false);
            expect(r.blocked).toBe(true);
        });

        it('fire/physical block vs ice enemy is inefficient (0.5) except fire is full', () => {
            expect(blockVs(E.ICE, E.PHYSICAL).isInefficient).toBe(true);
            // FIRE block is full efficiency against ICE enemy
            expect(blockVs(E.ICE, E.FIRE).isInefficient).toBe(false);
        });

        it('ice block vs ice enemy is inefficient (0.5)', () => {
            expect(blockVs(E.ICE, E.ICE).isInefficient).toBe(true);
        });

        it('cold_fire block vs cold_fire enemy is full efficiency', () => {
            const r = blockVs(E.COLD_FIRE, E.COLD_FIRE);
            expect(r.isInefficient).toBe(false);
        });

        it('fire block vs cold_fire enemy is inefficient (0.5)', () => {
            expect(blockVs(E.COLD_FIRE, E.FIRE).isInefficient).toBe(true);
        });

        it('ice block vs cold_fire enemy is inefficient (0.5)', () => {
            expect(blockVs(E.COLD_FIRE, E.ICE).isInefficient).toBe(true);
        });

        it('physical block vs cold_fire enemy is inefficient (0.5)', () => {
            expect(blockVs(E.COLD_FIRE, E.PHYSICAL).isInefficient).toBe(true);
        });
    });

    describe('unit block sources', () => {
        it('unit blocks contribute to effective total', () => {
            const enemy = makeEnemy();
            const r = engine.calculateBlock(enemy, { value: 2, element: E.PHYSICAL }, [{ value: 2, element: E.PHYSICAL }]);
            expect(r.blocked).toBe(true);
            expect(r.totalBlock).toBe(4);
        });

        it('unit cold_fire vs fire enemy is full efficiency (but card physical makes overall inefficient)', () => {
            const enemy = makeEnemy({ attackType: E.FIRE });
            const r = engine.calculateBlock(enemy, { value: 2, element: E.PHYSICAL }, [{ value: 4, element: E.COLD_FIRE }]);
            // card: 2*0.5=1 (physical vs fire); unit: 4*1.0=4 (cold_fire wildcard) -> 5
            expect(r.totalBlock).toBe(5);
            // isInefficient is global flag: card physical-vs-fire already set it true
            expect(r.isInefficient).toBe(true);
        });

        it('unit fire block vs fire enemy is inefficient (0.5)', () => {
            const enemy = makeEnemy({ attackType: E.FIRE });
            const r = engine.calculateBlock(enemy, { value: 2, element: E.PHYSICAL }, [{ value: 4, element: E.FIRE }]);
            expect(r.isInefficient).toBe(true);
        });

        it('unit ice block vs fire enemy is full efficiency for the unit (overall still inefficient from card)', () => {
            const enemy = makeEnemy({ attackType: E.FIRE });
            const r = engine.calculateBlock(enemy, { value: 2, element: E.PHYSICAL }, [{ value: 4, element: E.ICE }]);
            // card physical-vs-fire (0.5) makes overall inefficient; unit ice is full
            expect(r.totalBlock).toBe(5); // 1 + 4
            expect(r.isInefficient).toBe(true);
        });

        it('unit blocks vs ice enemy can be inefficient', () => {
            const enemy = makeEnemy({ attackType: E.ICE });
            const r = engine.calculateBlock(enemy, { value: 2, element: E.PHYSICAL }, [{ value: 4, element: E.FIRE }]);
            expect(r.isInefficient).toBe(true);
        });

        it('unit blocks vs cold_fire enemy can be inefficient', () => {
            const enemy = makeEnemy({ attackType: E.COLD_FIRE });
            const r = engine.calculateBlock(enemy, { value: 2, element: E.PHYSICAL }, [{ value: 4, element: E.PHYSICAL }]);
            expect(r.isInefficient).toBe(true);
        });
    });

    describe('unitPointsConsumed', () => {
        it('consumes unit points only when card-only block is insufficient', () => {
            // requirement 4, card block 2 (full), unit 4 -> card-only 2 < 4 -> unit consumed
            const enemy = makeEnemy({ getBlockRequirement: () => 6 });
            const r = engine.calculateBlock(enemy, { value: 2, element: E.PHYSICAL }, [{ value: 4, element: E.PHYSICAL }]);
            expect(r.blocked).toBe(true); // 2 + 4 = 6 >= 6
            expect(r.unitPointsConsumed).toBe(4);
        });

        it('does not consume unit points when card-only block suffices', () => {
            const enemy = makeEnemy({ getBlockRequirement: () => 4 });
            const r = engine.calculateBlock(enemy, { value: 4, element: E.PHYSICAL }, [{ value: 4, element: E.PHYSICAL }]);
            expect(r.blocked).toBe(true);
            expect(r.unitPointsConsumed).toBe(0);
        });

        it('is 0 when no unit sources provided', () => {
            const r = engine.calculateBlock(makeEnemy(), { value: 4, element: E.PHYSICAL });
            expect(r.unitPointsConsumed).toBe(0);
        });
    });

    describe('cumbersome enemies', () => {
        it('reduces block requirement by movement spent', () => {
            const enemy = makeEnemy({ cumbersome: true, getBlockRequirement: () => 6 });
            const r = engine.calculateBlock(enemy, { value: 4, element: E.PHYSICAL }, [], 2);
            // requirement 6 - 2 = 4; block 4 >= 4 -> blocked
            expect(r.blocked).toBe(true);
        });

        it('does not reduce when no movement spent', () => {
            const enemy = makeEnemy({ cumbersome: true, getBlockRequirement: () => 6 });
            const r = engine.calculateBlock(enemy, { value: 4, element: E.PHYSICAL });
            expect(r.blocked).toBe(false);
        });
    });

    describe('inefficiency note', () => {
        it('marks inefficient result with a note when elements mismatch', () => {
            const enemy = makeEnemy({ attackType: E.FIRE, getBlockRequirement: () => 8 });
            const r = engine.calculateBlock(enemy, { value: 8, element: E.PHYSICAL }); // 8*0.5=4 < 8
            expect(r.isInefficient).toBe(true);
            expect(r.message).toContain('(');
        });

        it('no note when fully efficient', () => {
            const enemy = makeEnemy({ attackType: E.PHYSICAL, getBlockRequirement: () => 8 });
            const r = engine.calculateBlock(enemy, { value: 8, element: E.PHYSICAL });
            expect(r.isInefficient).toBe(false);
        });
    });
});
