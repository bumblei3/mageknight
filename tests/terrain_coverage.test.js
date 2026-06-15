
import { describe, it, expect, beforeEach } from 'vitest';
import { Terrain } from '../js/terrain.js';
import { TERRAIN_TYPES } from '../js/constants.js';
import { Hero } from '../js/hero.js';

describe('Terrain Coverage Boost', () => {
    let terrain;
    let mockHero;

    beforeEach(() => {
        terrain = new Terrain();
        mockHero = new Hero('Test Hero');
    });

    describe('getTerrainInfo', () => {
        it('should return terrain info for valid type', () => {
            const info = terrain.getTerrainInfo(TERRAIN_TYPES.PLAINS);
            expect(info).toBeDefined();
        });

        it('should return null for unknown type', () => {
            const info = terrain.getTerrainInfo('unknown_terrain_xyz');
            expect(info).toBeNull();
        });
    });

    describe('getMovementCost', () => {
        it('should return day cost for day movement', () => {
            const cost = terrain.getMovementCost(TERRAIN_TYPES.PLAINS, false);
            expect(cost).toBeGreaterThanOrEqual(1);
        });

        it('should return night cost for night movement', () => {
            const cost = terrain.getMovementCost(TERRAIN_TYPES.FOREST, true);
            expect(cost).toBeGreaterThanOrEqual(1);
        });

        it('should return default cost for unknown terrain', () => {
            const cost = terrain.getMovementCost('nonexistent');
            expect(cost).toBe(2);
        });

        it('should return 2 for flight skill (ignores terrain cost)', () => {
            // Add flight skill to hero
            mockHero.skills.push({ id: 'flight', name: 'Flug', type: 'active', description: '', icon: '🦅', cooldown: 'round' });
            const cost = terrain.getMovementCost(TERRAIN_TYPES.MOUNTAINS, false, mockHero);
            expect(cost).toBe(2);
        });

        it('should return 2 for flight skill at night', () => {
            mockHero.skills.push({ id: 'flight', name: 'Flug', type: 'active', description: '', icon: '🦅', cooldown: 'round' });
            const cost = terrain.getMovementCost(TERRAIN_TYPES.MOUNTAINS, true, mockHero);
            expect(cost).toBe(2);
        });

        it('should reduce cost by 1 for forward_march skill (min 1)', () => {
            mockHero.skills.push({ id: 'forward_march', name: 'Vorwärts Marsch', type: 'passive', description: '', icon: '🥾' });
            // Plains is cost 2, should become 1
            const cost = terrain.getMovementCost(TERRAIN_TYPES.PLAINS, false, mockHero);
            expect(cost).toBe(1);
        });

        it('should not reduce below 1 for forward_march skill', () => {
            mockHero.skills.push({ id: 'forward_march', name: 'Vorwärts Marsch', type: 'passive', description: '', icon: '🥾' });
            // For valid terrain with cost 2, it becomes 1
            const cost = terrain.getMovementCost(TERRAIN_TYPES.PLAINS, false, mockHero);
            expect(cost).toBe(1);
        });

        it('should combine flight and forward_march (flight takes precedence)', () => {
            mockHero.skills.push({ id: 'flight', name: 'Flug', type: 'active', description: '', icon: '🦅', cooldown: 'round' });
            mockHero.skills.push({ id: 'forward_march', name: 'Vorwärts Marsch', type: 'passive', description: '', icon: '🥾' });
            const cost = terrain.getMovementCost(TERRAIN_TYPES.MOUNTAINS, false, mockHero);
            // Flight sets to 2, forward_march reduces to 1
            expect(cost).toBe(1); // Both apply: flight -> 2, forward_march -> 1
        });
    });

    describe('isPassable', () => {
        it('should return true for passable terrain', () => {
            expect(terrain.isPassable(TERRAIN_TYPES.PLAINS)).toBe(true);
        });

        it('should return true for unknown terrain (default)', () => {
            expect(terrain.isPassable('unknown')).toBe(true);
        });
    });

    describe('getName', () => {
        it('should return name for valid terrain', () => {
            const name = terrain.getName(TERRAIN_TYPES.FOREST);
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
        });

        it('should return Unknown for invalid terrain', () => {
            expect(terrain.getName('invalid')).toBe('Unknown');
        });
    });

    describe('getIcon', () => {
        it('should return icon for valid terrain', () => {
            const icon = terrain.getIcon(TERRAIN_TYPES.MOUNTAIN);
            expect(typeof icon).toBe('string');
        });

        it('should return empty string for invalid terrain', () => {
            expect(terrain.getIcon('invalid')).toBe('');
        });
    });

    describe('getColor', () => {
        it('should return color for valid terrain', () => {
            const color = terrain.getColor(TERRAIN_TYPES.PLAINS);
            expect(color).toContain('#');
        });

        it('should return default color for invalid terrain', () => {
            const color = terrain.getColor('invalid');
            expect(color).toBe('#1a1a2e');
        });
    });
});
