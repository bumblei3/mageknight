import { describe, it, expect } from 'vitest';
import { Hero } from '../js/hero.js';
import { HexGrid } from '../js/hexgrid.js';
import { HeroBuilder } from './test-helpers.js';

describe('Hero Skills', () => {

    describe('hasSkill', () => {
        it('should return true if hero has skill', () => {
            const hero = new HeroBuilder().build();
            hero.addSkill({ id: 'test_skill', name: 'Test' });
            expect(hero.hasSkill('test_skill')).toBe(true);
        });

        it('should return false if hero does not have skill', () => {
            const hero = new HeroBuilder().build();
            expect(hero.hasSkill('flight')).toBe(false);
        });
    });

    describe('Flight Skill (HexGrid Interaction)', () => {
        it('should reduce movement cost to 1 for any terrain', () => {
            // Setup minimal HexGrid with terrain system
            const mockCanvas = { getContext: () => ({}) };
            const hexGrid = new HexGrid(mockCanvas);

            // Stub getHex to return expensive terrain
            hexGrid.getHex = () => ({ terrain: 'bogs', revealed: true });
            // Stub terrainSystem if used, or just rely on default logic?
            // Existing logic fallback: 2 or 3. 
            // If I just call getMovementCost(..., hasFlight=true) it should return 1.

            const costNormal = hexGrid.getMovementCost(0, 0, false, false);
            // Default cost for unknown terrain is 2 (fallback in line 229)
            // Wait, 'bogs' isn't in default list. 'mountains' is 5.
            hexGrid.getHex = () => ({ terrain: 'mountains', revealed: true });

            const mountainCost = hexGrid.getMovementCost(0, 0, false, false);
            expect(mountainCost).toBe(5);

            const flightCost = hexGrid.getMovementCost(0, 0, false, true);
            expect(flightCost).toBe(1);
        });
    });

    describe('Noble Manners Skill', () => {
        it('should reset influence to 2 at end of turn', () => {
            const hero = new HeroBuilder().build();
            hero.addSkill({ id: 'noble_manners', name: 'Noble Manners' });

            // Simulate turn usage
            hero.drawCards();
            hero.influencePoints = 0;

            // End Turn
            hero.endTurn();

            expect(hero.influencePoints).toBe(2);
        });

        it('should trigger correctly during reset', () => {
            const hero = new HeroBuilder().build();
            // Without skill
            hero.endTurn();
            expect(hero.influencePoints).toBe(0);
        });
    });

    describe('Glittering Fortune Skill', () => {
        it('should add a crystal at start of round', () => {
            const hero = new HeroBuilder().build();
            hero.addSkill({ id: 'glittering_fortune', name: 'Glittering Fortune' });

            const initialCrystals = Object.values(hero.crystals).reduce((a, b) => a + b, 0);

            hero.prepareNewRound();

            const newCrystals = Object.values(hero.crystals).reduce((a, b) => a + b, 0);
            expect(newCrystals).toBe(initialCrystals + 1);
        });
    });
});
