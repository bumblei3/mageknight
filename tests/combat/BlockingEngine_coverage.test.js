import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlockingEngine, BlockSource, BlockResult } from '../../js/combat/BlockingEngine.js';
import { ATTACK_ELEMENTS } from '../../js/constants.js';

describe('BlockingEngine - Coverage Boost', () => {
    let engine;

    const createMockEnemy = (overrides = {}) => ({
        name: 'Test Enemy',
        attackType: ATTACK_ELEMENTS.PHYSICAL,
        cumbersome: false,
        getBlockRequirement: vi.fn().mockReturnValue(5),
        ...overrides
    });

    beforeEach(() => {
        engine = new BlockingEngine();
    });

    describe('calculateBlock - input normalization', () => {
        it('should handle number input', () => {
            const enemy = createMockEnemy();
            const result = engine.calculateBlock(enemy, 3);
            expect(result.totalBlock).toBe(3);
        });

        it('should handle single BlockSource object', () => {
            const enemy = createMockEnemy();
            const result = engine.calculateBlock(enemy, { value: 4, element: ATTACK_ELEMENTS.PHYSICAL });
            expect(result.totalBlock).toBe(4);
        });

        it('should handle BlockSource array', () => {
            const enemy = createMockEnemy();
            const result = engine.calculateBlock(enemy, [
                { value: 2, element: ATTACK_ELEMENTS.PHYSICAL },
                { value: 3, element: ATTACK_ELEMENTS.ICE }
            ]);
            expect(result.totalBlock).toBe(5);
        });

        it('should handle object with blocks property', () => {
            const enemy = createMockEnemy();
            const result = engine.calculateBlock(enemy, { 
                blocks: [{ value: 2, element: ATTACK_ELEMENTS.PHYSICAL }],
                movementPoints: 1
            });
            expect(result.totalBlock).toBe(2);
        });

        it('should handle object with value property', () => {
            const enemy = createMockEnemy();
            const result = engine.calculateBlock(enemy, { 
                value: 3, 
                element: ATTACK_ELEMENTS.FIRE,
                movementPoints: 2
            });
            expect(result.totalBlock).toBe(3);
        });

        it('should default to 0 for invalid input', () => {
            const enemy = createMockEnemy();
            const result = engine.calculateBlock(enemy, null);
            expect(result.totalBlock).toBe(0);
        });

        it('should default to 0 for undefined input', () => {
            const enemy = createMockEnemy();
            const result = engine.calculateBlock(enemy, undefined);
            expect(result.totalBlock).toBe(0);
        });
    });

    describe('calculateBlock - physical attack (no efficiency penalty)', () => {
        it('should block fully with physical block vs physical attack', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.PHYSICAL, getBlockRequirement: () => 5 });
            const result = engine.calculateBlock(enemy, { value: 5, element: ATTACK_ELEMENTS.PHYSICAL });
            expect(result.blocked).toBe(true);
            expect(result.totalBlock).toBe(5);
        });

        it('should block fully with cold_fire block vs physical attack', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.PHYSICAL, getBlockRequirement: () => 5 });
            const result = engine.calculateBlock(enemy, { value: 5, element: ATTACK_ELEMENTS.COLD_FIRE });
            expect(result.blocked).toBe(true);
            expect(result.totalBlock).toBe(5);
        });
    });

    describe('calculateBlock - fire attack efficiency', () => {
        it('should be 100% efficient with ice block vs fire', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.FIRE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 4, element: ATTACK_ELEMENTS.ICE });
            expect(result.blocked).toBe(true);
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(false);
        });

        it('should be 100% efficient with cold_fire block vs fire', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.FIRE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 4, element: ATTACK_ELEMENTS.COLD_FIRE });
            expect(result.blocked).toBe(true);
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(false);
        });

        it('should be 50% efficient with physical block vs fire', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.FIRE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 8, element: ATTACK_ELEMENTS.PHYSICAL });
            expect(result.totalBlock).toBe(4); // 8 * 0.5 = 4
            expect(result.isInefficient).toBe(true);
        });

        it('should be 50% efficient with fire block vs fire', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.FIRE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 8, element: ATTACK_ELEMENTS.FIRE });
            expect(result.totalBlock).toBe(4); // 8 * 0.5 = 4
            expect(result.isInefficient).toBe(true);
        });

        it('should fail block with inefficient physical block', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.FIRE, getBlockRequirement: () => 5 });
            const result = engine.calculateBlock(enemy, { value: 8, element: ATTACK_ELEMENTS.PHYSICAL });
            expect(result.blocked).toBe(false);
            expect(result.totalBlock).toBe(4);
        });
    });

    describe('calculateBlock - ice attack efficiency', () => {
        it('should be 100% efficient with fire block vs ice', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.ICE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 4, element: ATTACK_ELEMENTS.FIRE });
            expect(result.blocked).toBe(true);
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(false);
        });

        it('should be 100% efficient with cold_fire block vs ice', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.ICE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 4, element: ATTACK_ELEMENTS.COLD_FIRE });
            expect(result.blocked).toBe(true);
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(false);
        });

        it('should be 50% efficient with physical block vs ice', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.ICE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 8, element: ATTACK_ELEMENTS.PHYSICAL });
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(true);
        });

        it('should be 50% efficient with ice block vs ice', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.ICE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 8, element: ATTACK_ELEMENTS.ICE });
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(true);
        });
    });

    describe('calculateBlock - cold_fire attack efficiency', () => {
        it('should be 100% efficient with cold_fire block vs cold_fire', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.COLD_FIRE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 4, element: ATTACK_ELEMENTS.COLD_FIRE });
            expect(result.blocked).toBe(true);
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(false);
        });

        it('should be 50% efficient with fire block vs cold_fire', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.COLD_FIRE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 8, element: ATTACK_ELEMENTS.FIRE });
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(true);
        });

        it('should be 50% efficient with ice block vs cold_fire', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.COLD_FIRE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 8, element: ATTACK_ELEMENTS.ICE });
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(true);
        });

        it('should be 50% efficient with physical block vs cold_fire', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.COLD_FIRE, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(enemy, { value: 8, element: ATTACK_ELEMENTS.PHYSICAL });
            expect(result.totalBlock).toBe(4);
            expect(result.isInefficient).toBe(true);
        });
    });

    describe('calculateBlock - unit block sources', () => {
        it('should add unit block with same efficiency rules', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.FIRE, getBlockRequirement: () => 6 });
            const result = engine.calculateBlock(
                enemy, 
                { value: 4, element: ATTACK_ELEMENTS.PHYSICAL },
                [{ value: 4, element: ATTACK_ELEMENTS.ICE }]
            );
            expect(result.totalBlock).toBe(6); // 4*0.5 + 4*1.0 = 2 + 4 = 6
            expect(result.blocked).toBe(true);
        });

        it('should apply inefficiency to unit blocks', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.FIRE, getBlockRequirement: () => 3 });
            const result = engine.calculateBlock(
                enemy, 
                [],
                [{ value: 2, element: ATTACK_ELEMENTS.FIRE }]
            );
            expect(result.totalBlock).toBe(1); // 2 * 0.5 = 1 (floored)
        });

        it('should track unit points consumed when needed', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.PHYSICAL, getBlockRequirement: () => 6 });
            const result = engine.calculateBlock(
                enemy, 
                { value: 4, element: ATTACK_ELEMENTS.PHYSICAL },
                [{ value: 3, element: ATTACK_ELEMENTS.PHYSICAL }]
            );
            expect(result.blocked).toBe(true);
            expect(result.unitPointsConsumed).toBe(3);
        });

        it('should not track unit points when cards alone suffice', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.PHYSICAL, getBlockRequirement: () => 4 });
            const result = engine.calculateBlock(
                enemy, 
                { value: 5, element: ATTACK_ELEMENTS.PHYSICAL },
                [{ value: 3, element: ATTACK_ELEMENTS.PHYSICAL }]
            );
            expect(result.blocked).toBe(true);
            expect(result.unitPointsConsumed).toBe(0);
        });
    });

    describe('calculateBlock - cumbersome enemy', () => {
        it('should reduce block requirement by movement spent', () => {
            const enemy = createMockEnemy({ 
                cumbersome: true, 
                getBlockRequirement: () => 5 
            });
            const result = engine.calculateBlock(enemy, { value: 3, element: ATTACK_ELEMENTS.PHYSICAL }, [], 2);
            expect(result.blocked).toBe(true); // 3 >= 5-2 = 3
        });

        it('should not reduce below 0', () => {
            const enemy = createMockEnemy({ 
                cumbersome: true, 
                getBlockRequirement: () => 2 
            });
            const result = engine.calculateBlock(enemy, { value: 0, element: ATTACK_ELEMENTS.PHYSICAL }, [], 5);
            expect(result.blocked).toBe(true); // 0 >= max(0, 2-5) = 0
        });
    });

    describe('calculateBlock - result structure', () => {
        it('should include all fields on success', () => {
            const enemy = createMockEnemy({ getBlockRequirement: () => 3 });
            const result = engine.calculateBlock(enemy, { value: 3 });
            
            expect(result).toEqual(expect.objectContaining({
                success: true,
                blocked: true,
                totalBlock: 3,
                consumedPoints: 3,
                unitPointsConsumed: 0,
                isInefficient: false,
                message: expect.any(String)
            }));
        });

        it('should include all fields on failure', () => {
            const enemy = createMockEnemy({ getBlockRequirement: () => 5 });
            const result = engine.calculateBlock(enemy, { value: 3 });
            
            expect(result).toEqual(expect.objectContaining({
                success: true,
                blocked: false,
                totalBlock: 3,
                consumedPoints: 3,
                unitPointsConsumed: 0,
                isInefficient: false,
                message: expect.any(String)
            }));
        });

        it('should track total input points consumed', () => {
            const enemy = createMockEnemy({ getBlockRequirement: () => 10 });
            const result = engine.calculateBlock(enemy, [
                { value: 2, element: ATTACK_ELEMENTS.PHYSICAL },
                { value: 3, element: ATTACK_ELEMENTS.ICE },
                { value: 1, element: ATTACK_ELEMENTS.FIRE }
            ]);
            expect(result.consumedPoints).toBe(6);
        });
    });

    describe('calculateBlock - multiple card blocks', () => {
        it('should sum multiple blocks of same element', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.PHYSICAL, getBlockRequirement: () => 6 });
            const result = engine.calculateBlock(enemy, [
                { value: 2, element: ATTACK_ELEMENTS.PHYSICAL },
                { value: 4, element: ATTACK_ELEMENTS.PHYSICAL }
            ]);
            expect(result.totalBlock).toBe(6);
        });

        it('should sum multiple blocks of different elements', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.FIRE, getBlockRequirement: () => 5 });
            const result = engine.calculateBlock(enemy, [
                { value: 4, element: ATTACK_ELEMENTS.ICE },
                { value: 2, element: ATTACK_ELEMENTS.COLD_FIRE }
            ]);
            expect(result.totalBlock).toBe(6); // 4 + 2 = 6 (both 100% efficient)
        });
    });

    describe('calculateBlock - edge cases', () => {
        it('should handle zero value blocks', () => {
            const enemy = createMockEnemy({ getBlockRequirement: () => 1 });
            const result = engine.calculateBlock(enemy, { value: 0 });
            expect(result.totalBlock).toBe(0);
            expect(result.blocked).toBe(false);
        });

        it('should handle negative value blocks (reduces total block)', () => {
            const enemy = createMockEnemy({ getBlockRequirement: () => 5 });
            const result = engine.calculateBlock(enemy, { value: -5 });
            // Negative values are treated as valid, so -5 * 1 = -5 block
            expect(result.totalBlock).toBe(-5);
        });

        it('should handle element not in ATTACK_ELEMENTS', () => {
            const enemy = createMockEnemy({ attackType: ATTACK_ELEMENTS.PHYSICAL, getBlockRequirement: () => 5 });
            const result = engine.calculateBlock(enemy, { value: 5, element: 'unknown' });
            expect(result.totalBlock).toBe(5); // defaults to physical
        });

        it('should handle object without value or element properties', () => {
            const enemy = createMockEnemy({ getBlockRequirement: () => 1 });
            const result = engine.calculateBlock(enemy, { });
            expect(result.totalBlock).toBe(0);
        });
    });
});