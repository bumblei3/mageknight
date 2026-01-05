import { describe, it, expect, beforeEach } from './testRunner.js';
import { setupGlobalMocks } from './test-mocks.js';
import { MageKnightGame } from '../js/game.js';
import { Hero } from '../js/hero.js';
import { Unit } from '../js/unit.js';
import { SKILL_TYPES } from '../js/skills.js';

describe('Hero Skills Implementation', () => {
    let game;
    let hero;

    beforeEach(() => {
        // Use the comprehensive global mocks from test-mocks.js
        setupGlobalMocks();

        game = new MageKnightGame();
        hero = game.hero; // Use the hero created by the game

        // Mock updateStats to avoid UI dependencies
        game.updateStats = () => { };
        game.sound = { heal: () => { }, click: () => { } };
    });

    describe('Goldyx: Flight', () => {
        it('should reduce movement logic costs appropriately when active', () => {
            // Setup Flight skill
            const flightSkill = { id: 'flight', name: 'Flug', type: SKILL_TYPES.ACTIVE };
            hero.addSkill(flightSkill);

            // Mock map/movement logic interaction?
            // "Flight" usually means move 2 and ignore terrain.
            // In our simple implementation, it might just be a flag on the hero for the turn.

            const result = game.heroController.useActiveSkill('flight');
            expect(result.success).toBe(true);
            expect(hero.hasStatus('flight')).toBe(true);

            // Should add 2 movement points
            expect(hero.movementPoints).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Norowas: Motivation (Unit Ready)', () => {
        beforeEach(() => {
            game.hero = new Hero('Norowas');
            hero = game.hero; // Sync local variable
        });

        it('should ready a spent unit', () => {
            // Give hero a unit
            const unit = new Unit({ name: 'Yeoman', id: 'u1', abilities: [] });
            hero.units.push(unit);

            // Mark unit as spent
            unit.spent = true;

            // Add skill
            const skill = { id: 'motivation', name: 'Motivation', type: SKILL_TYPES.ACTIVE };
            hero.addSkill(skill);

            // Use skill
            // Motivation logic might require selecting a unit. 
            // For MVP, if we don't have selection UI in tests, maybe it readies *all* or *first* spent?
            // Or the controller method receives a target ID.
            // Let's assume controller.useActiveSkill handles logic. If it needs target, we might need a way to pass it.
            // Checking implementation plan: "Refresh a spent unit".

            // If the implementation auto-targets the first spent unit for MVP:
            const result = game.heroController.useActiveSkill('motivation');

            expect(result.success).toBe(true);
            expect(unit.spent).toBe(false);
        });

        it('should fail if no units are spent', () => {
            const unit = new Unit({ name: 'Yeoman', id: 'u1', abilities: [] });
            hero.units.push(unit);
            unit.spent = false; // Ready

            const skill = { id: 'motivation', name: 'Motivation', type: SKILL_TYPES.ACTIVE };
            hero.addSkill(skill);

            const result = game.heroController.useActiveSkill('motivation');
            expect(result.success).toBe(false);
        });
    });

    describe('Norowas: Healing Touch', () => {
        beforeEach(() => {
            game.hero = new Hero('Norowas');
            hero = game.hero; // Sync local variable
        });

        it('should heal 2 wounds from hero', () => {
            const skill = { id: 'healing_touch', name: 'Healing Touch', type: SKILL_TYPES.ACTIVE };
            hero.addSkill(skill);

            // Add wounds
            hero.wounds = [1, 1, 1]; // 3 wounds

            const result = game.heroController.useActiveSkill('healing_touch');

            expect(result.success).toBe(true);
            expect(hero.wounds.length).toBe(1); // Should remove 2
        });

        it('should prioritize healing units if units have wounds? Or just Hero?', () => {
            // Implementation detail: Description says "Heal 2". usually means 2 points of healing.
            // Wounds in MK are cards. "Heal 2" usually allows throwing away 2 wound cards.

            hero.wounds = [];
            const result = game.heroController.useActiveSkill('healing_touch');
            expect(result.success).toBe(false); // Nothing to heal
        });
    });
});
