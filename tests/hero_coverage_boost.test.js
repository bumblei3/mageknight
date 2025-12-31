
import { describe, it, expect, beforeEach } from './testRunner.js';
import { Hero } from '../js/hero.js';
import { Unit } from '../js/unit.js';
import { setupGlobalMocks, resetMocks, setupStandardGameDOM } from './test-mocks.js';

setupGlobalMocks();

describe('Hero Coverage Boost', () => {
    let hero;

    beforeEach(() => {
        setupStandardGameDOM();
        resetMocks();
        hero = new Hero('TestHero', { q: 0, r: 0 });
    });

    describe('recruitUnit influence checks', () => {
        it('should fail recruitment with insufficient influence', () => {
            hero.influencePoints = 2;
            const unit = new Unit('peasant');

            const result = hero.recruitUnit(unit, 5); // Cost 5, have 2

            expect(result.success).toBe(false);
            expect(result.message).toContain('Einfluss');
        });

        it('should fail recruitment when at command limit', () => {
            hero.commandLimit = 1;
            hero.units = [new Unit('peasant')]; // Already at limit
            hero.influencePoints = 10;

            const result = hero.recruitUnit(new Unit('peasant'), 3);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Platz');
        });

        it('should succeed recruitment with sufficient influence and space', () => {
            hero.influencePoints = 10;
            hero.commandLimit = 3;
            hero.units = [];
            const unit = new Unit('peasant');

            const result = hero.recruitUnit(unit, 3);

            expect(result.success).toBe(true);
            expect(hero.units.length).toBe(1);
            expect(hero.influencePoints).toBe(7);
        });
    });

    describe('learnSpell influence checks', () => {
        it('should fail learning spell with insufficient influence', () => {
            hero.influencePoints = 1;
            const spellCard = { name: 'Fireball', type: 'spell' };

            const result = hero.learnSpell(spellCard, 5);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Einfluss');
        });

        it('should succeed learning spell with sufficient influence', () => {
            hero.influencePoints = 10;
            const spellCard = { name: 'Fireball', type: 'spell' };
            const initialDiscard = hero.discard.length;

            const result = hero.learnSpell(spellCard, 4);

            expect(result.success).toBe(true);
            expect(hero.discard.length).toBe(initialDiscard + 1);
            expect(hero.influencePoints).toBe(6);
        });
    });
});
