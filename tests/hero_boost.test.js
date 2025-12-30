
import { describe, it, expect, beforeEach } from './testRunner.js';
import { Hero } from '../js/hero.js';

describe('Hero Coverage Boost', () => {
    let hero;

    beforeEach(() => {
        hero = new Hero('Test Hero');
    });

    it('should handle level up logic stats', () => {
        hero.level = 2;
        hero.levelUp(); // To level 3

        expect(hero.level).toBe(3);
        // Level 3 gives Command Token -> commandLimit++
        // Based on logic: if (level % 2 === 1) commandLimit++, armor++
        // Level 3 is odd.
        // Initial commandLimit 1.
        expect(hero.commandLimit).toBe(2);
    });

    it('should validate skills acquisition', () => {
        const skill = { id: 'test', name: 'Test Skill' };
        hero.addSkill(skill);
        expect(hero.skills.length).toBeGreaterThan(0);
        expect(hero.skills[0].name).toBe('Test Skill');
    });

    it('should handle unit slots via command limit', () => {
        // Direct property check
        expect(hero.commandLimit).toBe(1);
    });

    it('should handle hand limit', () => {
        hero.handLimit = 6;
        expect(hero.getStats().handLimit).toBe(6);
    });

    it('should gain fame and detect level up', () => {
        // Level 2 at 10 fame
        const result = hero.gainFame(10);
        expect(result.leveledUp).toBe(true);
        expect(result.newLevel).toBe(2);
    });

    it('should learn spells and advanced actions', () => {
        const spell = { name: 'Fireball', type: 'spell' };
        hero.influencePoints = 10;

        const result = hero.learnSpell(spell, 7);
        expect(result.success).toBe(true);
        expect(hero.discard.length).toBe(1);
        expect(hero.influencePoints).toBe(3);

        const action = { name: 'Stamina', type: 'advanced' };
        hero.learnAdvancedAction(action, 3);
        expect(hero.discard.length).toBe(2);
    });

    it('should handle mana source and affordability', () => {
        expect(hero.takeManaFromSource('INVALID')).toBe(false);
        expect(hero.takeManaFromSource('red')).toBe(true);

        const card = { name: 'Fire', color: 'red', manaCost: 1 };
        expect(hero.canAffordMana(card)).toBe(true);

        hero.spendMana('red');
        expect(hero.tempMana.length).toBe(0);
    });
});
