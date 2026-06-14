import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatUnitManager, ElementalValue } from '../../js/combat/CombatUnitManager.js';
import { ACTION_TYPES, COMBAT_PHASES, ATTACK_ELEMENTS } from '../../js/constants.js';

describe('CombatUnitManager - Coverage Boost', () => {
    let manager;
    let mockUnit;

    beforeEach(() => {
        manager = new CombatUnitManager();
        
        mockUnit = {
            id: 'test_unit_1',
            name: 'Test Unit',
            isReady: vi.fn().mockReturnValue(true),
            activate: vi.fn(),
            getAbilities: vi.fn().mockReturnValue([]),
            getName: vi.fn().mockReturnValue('Test Unit')
        };
    });

    describe('constructor and reset', () => {
        it('should initialize with zero points', () => {
            expect(manager.unitAttackPoints).toEqual({ physical: 0, fire: 0, ice: 0, cold_fire: 0 });
            expect(manager.unitBlockPoints).toEqual({ physical: 0, fire: 0, ice: 0, cold_fire: 0 });
            expect(manager.unitRangedPoints).toEqual({ physical: 0, fire: 0, ice: 0, cold_fire: 0 });
            expect(manager.unitSiegePoints).toBe(0);
            expect(manager.activatedUnits.size).toBe(0);
        });

        it('should reset all points and activated units', () => {
            manager.unitAttackPoints.fire = 5;
            manager.unitBlockPoints.ice = 3;
            manager.unitSiegePoints = 2;
            manager.activatedUnits.add('unit1');
            
            manager.reset();
            
            expect(manager.unitAttackPoints).toEqual({ physical: 0, fire: 0, ice: 0, cold_fire: 0 });
            expect(manager.unitBlockPoints).toEqual({ physical: 0, fire: 0, ice: 0, cold_fire: 0 });
            expect(manager.unitRangedPoints).toEqual({ physical: 0, fire: 0, ice: 0, cold_fire: 0 });
            expect(manager.unitSiegePoints).toBe(0);
            expect(manager.activatedUnits.size).toBe(0);
        });
    });

    describe('getters', () => {
        it('should return totalBlockPoints sum', () => {
            manager.unitBlockPoints = { physical: 2, fire: 3, ice: 1, cold_fire: 4 };
            expect(manager.totalBlockPoints).toBe(10);
        });

        it('should return totalAttackPoints sum', () => {
            manager.unitAttackPoints = { physical: 2, fire: 3, ice: 1, cold_fire: 4 };
            expect(manager.totalAttackPoints).toBe(10);
        });

        it('should return totalRangedPoints sum', () => {
            manager.unitRangedPoints = { physical: 2, fire: 3, ice: 1, cold_fire: 4 };
            expect(manager.totalRangedPoints).toBe(10);
        });

        it('should return totalSiegePoints', () => {
            manager.unitSiegePoints = 7;
            expect(manager.totalSiegePoints).toBe(7);
        });
    });

    describe('activateUnit', () => {
        it('should fail if unit not ready', () => {
            mockUnit.isReady.mockReturnValue(false);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('Unit not ready');
        });

        it('should fail if unit already activated', () => {
            mockUnit.isReady.mockReturnValue(true);
            manager.activatedUnits.add('test_unit_1');
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('already activated');
        });

        it('should activate unit and add to activated set', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            
            expect(result.success).toBe(true);
            expect(mockUnit.activate).toHaveBeenCalled();
            expect(manager.activatedUnits.has('test_unit_1')).toBe(true);
        });

        it('should apply BLOCK abilities in BLOCK phase', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.BLOCK, value: 3, element: ATTACK_ELEMENTS.PHYSICAL },
                { type: ACTION_TYPES.BLOCK, value: 2, element: ATTACK_ELEMENTS.ICE }
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            
            expect(manager.unitBlockPoints.physical).toBe(3);
            expect(manager.unitBlockPoints.ice).toBe(2);
            expect(result.applied).toContain('Block');
        });

        it('should apply ATTACK abilities in ATTACK phase', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.ATTACK, value: 4, element: ATTACK_ELEMENTS.FIRE },
                { type: ACTION_TYPES.ATTACK, value: 2, element: ATTACK_ELEMENTS.COLD_FIRE }
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.ATTACK);
            
            expect(manager.unitAttackPoints.fire).toBe(4);
            expect(manager.unitAttackPoints.cold_fire).toBe(2);
            expect(result.applied).toContain('Angriff');
        });

        it('should apply RANGED as attack in ATTACK phase', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.RANGED, value: 3, element: ATTACK_ELEMENTS.PHYSICAL }
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.ATTACK);
            
            expect(manager.unitAttackPoints.physical).toBe(3);
            expect(result.applied).toContain('aus Fernkampf');
        });

        it('should apply SIEGE as attack in ATTACK phase', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.SIEGE, value: 2, element: ATTACK_ELEMENTS.FIRE }
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.ATTACK);
            
            expect(manager.unitAttackPoints.fire).toBe(2);
            expect(result.applied).toContain('aus Belagerung');
        });

        it('should apply RANGED in RANGED phase', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.RANGED, value: 3, element: ATTACK_ELEMENTS.ICE }
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.RANGED);
            
            expect(manager.unitRangedPoints.ice).toBe(3);
            expect(result.applied).toContain('Fernkampf');
        });

        it('should apply SIEGE in RANGED phase', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.SIEGE, value: 2 }
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.RANGED);
            
            expect(manager.unitSiegePoints).toBe(2);
            expect(result.applied).toContain('Belagerung');
        });

        it('should ignore non-matching abilities for phase', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.ATTACK, value: 3 }, // ATTACK in BLOCK phase - ignored
                { type: ACTION_TYPES.BLOCK, value: 2 }   // BLOCK in BLOCK phase - applied
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            
            expect(manager.unitBlockPoints.physical).toBe(2);
            expect(manager.unitAttackPoints.physical).toBe(0);
        });

        it('should default to physical element if not specified', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.BLOCK, value: 3 } // no element
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            
            expect(manager.unitBlockPoints.physical).toBe(3);
        });

        it('should return correct message format', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.BLOCK, value: 3, element: ATTACK_ELEMENTS.FIRE }
            ]);
            
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            
            expect(result.message).toContain('Test Unit');
            expect(result.message).toContain('Block');
        });
    });

    describe('getBlockSources', () => {
        it('should return sources for all non-zero block points', () => {
            manager.unitBlockPoints = { physical: 2, fire: 0, ice: 3, cold_fire: 0 };
            
            const sources = manager.getBlockSources();
            
            expect(sources).toEqual([
                { value: 2, element: ATTACK_ELEMENTS.PHYSICAL },
                { value: 3, element: ATTACK_ELEMENTS.ICE }
            ]);
        });

        it('should return empty array when all zero', () => {
            const sources = manager.getBlockSources();
            expect(sources).toEqual([]);
        });
    });

    describe('getAttackSources', () => {
        it('should return sources for all non-zero attack points', () => {
            manager.unitAttackPoints = { physical: 1, fire: 2, ice: 0, cold_fire: 3 };
            
            const sources = manager.getAttackSources();
            
            expect(sources).toEqual([
                { value: 1, element: ATTACK_ELEMENTS.PHYSICAL },
                { value: 2, element: ATTACK_ELEMENTS.FIRE },
                { value: 3, element: ATTACK_ELEMENTS.COLD_FIRE }
            ]);
        });
    });

    describe('getRangedSources', () => {
        it('should return sources for all non-zero ranged points', () => {
            manager.unitRangedPoints = { physical: 0, fire: 1, ice: 2, cold_fire: 0 };
            
            const sources = manager.getRangedSources();
            
            expect(sources).toEqual([
                { value: 1, element: ATTACK_ELEMENTS.FIRE },
                { value: 2, element: ATTACK_ELEMENTS.ICE }
            ]);
        });
    });

    describe('getState', () => {
        it('should return complete state', () => {
            manager.unitAttackPoints = { physical: 1, fire: 2, ice: 3, cold_fire: 4 };
            manager.unitBlockPoints = { physical: 4, fire: 3, ice: 2, cold_fire: 1 };
            manager.unitRangedPoints = { physical: 1, fire: 1, ice: 1, cold_fire: 1 };
            manager.unitSiegePoints = 5;
            manager.activatedUnits.add('unit1');
            manager.activatedUnits.add('unit2');
            
            const state = manager.getState();
            
            expect(state.unitAttackPoints).toEqual({ physical: 1, fire: 2, ice: 3, cold_fire: 4 });
            expect(state.unitBlockPoints).toEqual({ physical: 4, fire: 3, ice: 2, cold_fire: 1 });
            expect(state.unitRangedPoints).toEqual({ physical: 1, fire: 1, ice: 1, cold_fire: 1 });
            expect(state.unitSiegePoints).toBe(5);
            expect(state.activatedUnits).toEqual(['unit1', 'unit2']);
        });
    });

    describe('loadState', () => {
        it('should load complete state', () => {
            const state = {
                unitAttackPoints: { physical: 1, fire: 2, ice: 3, cold_fire: 4 },
                unitBlockPoints: { physical: 4, fire: 3, ice: 2, cold_fire: 1 },
                unitRangedPoints: { physical: 1, fire: 1, ice: 1, cold_fire: 1 },
                unitSiegePoints: 5,
                activatedUnits: ['unit1', 'unit2']
            };
            
            manager.loadState(state);
            
            expect(manager.unitAttackPoints).toEqual(state.unitAttackPoints);
            expect(manager.unitBlockPoints).toEqual(state.unitBlockPoints);
            expect(manager.unitRangedPoints).toEqual(state.unitRangedPoints);
            expect(manager.unitSiegePoints).toBe(5);
            expect(manager.activatedUnits.has('unit1')).toBe(true);
            expect(manager.activatedUnits.has('unit2')).toBe(true);
        });

        it('should handle missing state gracefully', () => {
            manager.loadState(null);
            manager.loadState(undefined);
            manager.loadState({});
            
            expect(manager.unitAttackPoints).toEqual({ physical: 0, fire: 0, ice: 0, cold_fire: 0 });
            expect(manager.activatedUnits.size).toBe(0);
        });

        it('should use defaults for missing properties', () => {
            const state = {
                unitAttackPoints: { physical: 1, fire: 0, ice: 0, cold_fire: 0 } // all properties present
            };
            
            manager.loadState(state);
            
            expect(manager.unitAttackPoints.physical).toBe(1);
            expect(manager.unitAttackPoints.fire).toBe(0);
            expect(manager.unitAttackPoints.ice).toBe(0);
            expect(manager.unitAttackPoints.cold_fire).toBe(0);
        });
    });

    describe('multiple unit activation', () => {
        it('should accumulate points from multiple units', () => {
            const unit1 = {
                id: 'unit1',
                name: 'Unit 1',
                getName: vi.fn().mockReturnValue('Unit 1'),
                isReady: vi.fn().mockReturnValue(true),
                activate: vi.fn(),
                getAbilities: vi.fn().mockReturnValue([
                    { type: ACTION_TYPES.BLOCK, value: 2, element: ATTACK_ELEMENTS.PHYSICAL }
                ])
            };
            
            const unit2 = {
                id: 'unit2',
                name: 'Unit 2',
                getName: vi.fn().mockReturnValue('Unit 2'),
                isReady: vi.fn().mockReturnValue(true),
                activate: vi.fn(),
                getAbilities: vi.fn().mockReturnValue([
                    { type: ACTION_TYPES.BLOCK, value: 3, element: ATTACK_ELEMENTS.ICE }
                ])
            };
            
            manager.activateUnit(unit1, COMBAT_PHASES.BLOCK);
            manager.activateUnit(unit2, COMBAT_PHASES.BLOCK);
            
            expect(manager.unitBlockPoints.physical).toBe(2);
            expect(manager.unitBlockPoints.ice).toBe(3);
            expect(manager.activatedUnits.size).toBe(2);
        });

        it('should not re-activate already activated unit', () => {
            mockUnit.isReady.mockReturnValue(true);
            mockUnit.getAbilities.mockReturnValue([
                { type: ACTION_TYPES.BLOCK, value: 2 }
            ]);
            
            manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            const result = manager.activateUnit(mockUnit, COMBAT_PHASES.BLOCK);
            
            expect(result.success).toBe(false);
            expect(manager.unitBlockPoints.physical).toBe(2); // Not doubled
        });
    });
});