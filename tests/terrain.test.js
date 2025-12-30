import { describe, it, expect } from './testRunner.js';
import { Terrain } from '../js/terrain.js';
import { TERRAIN_TYPES } from '../js/constants.js';

describe('Terrain', () => {
    it('should return correct day movement costs', () => {
        const terrain = new Terrain();

        expect(terrain.getMovementCost(TERRAIN_TYPES.PLAINS, false)).toBe(2);
        expect(terrain.getMovementCost(TERRAIN_TYPES.FOREST, false)).toBe(3);
        expect(terrain.getMovementCost(TERRAIN_TYPES.HILLS, false)).toBe(3);
        expect(terrain.getMovementCost(TERRAIN_TYPES.MOUNTAINS, false)).toBe(5);
        expect(terrain.getMovementCost(TERRAIN_TYPES.DESERT, false)).toBe(5);
        expect(terrain.getMovementCost(TERRAIN_TYPES.WASTELAND, false)).toBe(3);
    });

    it('should return correct night movement costs', () => {
        const terrain = new Terrain();

        // Forest is harder at night (3 -> 5)
        expect(terrain.getMovementCost(TERRAIN_TYPES.FOREST, true)).toBe(5);

        // Desert is easier at night (5 -> 3)
        expect(terrain.getMovementCost(TERRAIN_TYPES.DESERT, true)).toBe(3);

        // Others remain the same
        expect(terrain.getMovementCost(TERRAIN_TYPES.PLAINS, true)).toBe(2);
        expect(terrain.getMovementCost(TERRAIN_TYPES.HILLS, true)).toBe(3);
    });

    it('should return correct terrain names', () => {
        const terrain = new Terrain();

        expect(terrain.getName(TERRAIN_TYPES.PLAINS)).toBe('Ebenen');
        expect(terrain.getName(TERRAIN_TYPES.FOREST)).toBe('Wald');
        expect(terrain.getName(TERRAIN_TYPES.HILLS)).toBe('Hügel');
        expect(terrain.getName(TERRAIN_TYPES.MOUNTAINS)).toBe('Berge');
        expect(terrain.getName(TERRAIN_TYPES.DESERT)).toBe('Wüste');
        expect(terrain.getName(TERRAIN_TYPES.WASTELAND)).toBe('Ödland');
    });

    it('should calculate different costs for forest day vs night', () => {
        const terrain = new Terrain();

        const dayCost = terrain.getMovementCost(TERRAIN_TYPES.FOREST, false);
        const nightCost = terrain.getMovementCost(TERRAIN_TYPES.FOREST, true);

        expect(nightCost).toBeGreaterThan(dayCost);
        expect(nightCost - dayCost).toBe(2);
    });
});
