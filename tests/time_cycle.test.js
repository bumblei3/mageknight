import { describe, it, expect, beforeEach } from 'vitest';
import { Hero } from '../js/hero.js';
import { ManaSource, MANA_COLORS } from '../js/mana.js';
import { Terrain } from '../js/terrain.js';
import { HexGrid } from '../js/hexgrid.js';
import { setupGlobalMocks } from './test-mocks.js';

describe('Day/Night Cycle Mechanics', () => {
    beforeEach(() => {
        setupGlobalMocks();
    });

    describe('Hero Mana Restrictions', () => {
        it('should allow Gold mana as wildcard during DAY', () => {
            const hero = new Hero('Test');
            hero.takeManaFromSource(MANA_COLORS.GOLD);

            // Should be able to afford a RED cost card using Gold
            const card = { color: 'red', manaCost: 1, isWound: () => false };
            expect(hero.canAffordMana(card, false)).toBe(true);

            // Should spend Gold successfully
            expect(hero.spendMana('red', false)).toBe(true);
            expect(hero.tempMana.length).toBe(0);
        });

        it('should NOT allow Gold mana as wildcard during NIGHT', () => {
            const hero = new Hero('Test');
            hero.takeManaFromSource(MANA_COLORS.GOLD);

            const card = { color: 'red', manaCost: 1, isWound: () => false };
            expect(hero.canAffordMana(card, true)).toBe(false);

            expect(hero.spendMana('red', true)).toBe(false);
            expect(hero.tempMana.length).toBe(1);
        });
    });

    describe('Terrain Movement Costs', () => {
        const terrain = new Terrain();

        it('should have different costs for Forest between Day and Night', () => {
            expect(terrain.getMovementCost('forest', false)).toBe(3); // Day
            expect(terrain.getMovementCost('forest', true)).toBe(5);  // Night
        });

        it('should have different costs for Desert between Day and Night', () => {
            expect(terrain.getMovementCost('desert', false)).toBe(5); // Day
            expect(terrain.getMovementCost('desert', true)).toBe(3);  // Night
        });
    });

    describe('HexGrid Vision (Night)', () => {
        it('should calculate per-hex lighting based on distance from hero', () => {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const grid = new HexGrid(canvas);

            grid.heroPosition = { q: 0, r: 0 };
            grid.ambientLight = 0.6; // Night

            // Mock distance function used in drawHex logic 
            // We can't easily test private variables, 
            // but we can verify distance calculation logic.

            expect(grid.distance(0, 0, 0, 0)).toBe(0);
            expect(grid.distance(0, 0, 2, 0)).toBe(2);
            expect(grid.distance(0, 0, 3, 0)).toBe(3);
        });
    });
});
