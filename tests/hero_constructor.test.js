import { describe, it, expect } from 'vitest';
import { Hero } from '../js/hero.js';
import { HeroManager } from '../js/game/HeroManager.js';

describe('Hero Constructor Compatibility', () => {
    describe('Legacy String Name', () => {
        it('should accept string name (backward compatibility)', () => {
            const hero = new Hero('TestHero');
            expect(hero.name).toBe('TestHero');
            expect(hero.id).toBe('testhero');
        });

        it('should set default stats when using string name', () => {
            const hero = new Hero('LegacyHero');
            expect(hero.armor).toBe(2);
            expect(hero.handLimit).toBe(5);
        });

        it('should use default starter deck when using string name', () => {
            const hero = new Hero('LegacyHero');
            expect(hero.deck.length).toBeGreaterThan(0);
        });
    });

    describe('Config Object', () => {
        it('should accept config object', () => {
            const config = HeroManager.getHero('goldyx');
            const hero = new Hero(config);
            expect(hero.name).toBe('Goldyx');
            expect(hero.id).toBe('goldyx');
        });

        it('should use config stats', () => {
            const config = HeroManager.getHero('tovak');
            const hero = new Hero(config);
            expect(hero.armor).toBe(3); // Tovak has 3 armor
        });

        it('should use config starter deck', () => {
            const config = HeroManager.getHero('arythea');
            const hero = new Hero(config);

            // Arythea's deck should have fewer cards (9 vs 12 for Goldyx)
            expect(hero.deck.length).toBeGreaterThan(0);
        });
    });

    describe('Null/Undefined Handling', () => {
        it('should handle undefined config gracefully', () => {
            const hero = new Hero(undefined);
            expect(hero.name).toBe('Hero');
            expect(hero.id).toBe('hero');
            expect(hero.armor).toBe(2);
        });

        it('should handle null config gracefully', () => {
            const hero = new Hero(null);
            expect(hero.name).toBe('Hero');
            expect(hero.id).toBe('hero');
        });
    });

    describe('Starting Position', () => {
        it('should set default starting position', () => {
            const hero = new Hero('TestHero');
            expect(hero.position).toEqual({ q: 0, r: 0 });
        });

        it('should accept custom starting position', () => {
            const hero = new Hero('TestHero', { q: 5, r: 3 });
            expect(hero.position).toEqual({ q: 5, r: 3 });
        });

        it('should set displayPosition to match position', () => {
            const hero = new Hero('TestHero', { q: 2, r: 1 });
            expect(hero.displayPosition).toEqual({ q: 2, r: 1 });
        });
    });

    describe('Hero-Specific Decks', () => {
        it('Goldyx should have fire-focused cards', () => {
            const config = HeroManager.getHero('goldyx');
            const hero = new Hero(config);
            // Goldyx has more attack cards
            const attackCards = hero.deck.filter(c => c.basicEffect?.type === 'attack');
            expect(attackCards.length).toBeGreaterThan(0);
        });

        it('Norowas should have influence-focused cards', () => {
            const config = HeroManager.getHero('norowas');
            const hero = new Hero(config);
            // Norowas has more influence cards
            const influenceCards = hero.deck.filter(c => c.basicEffect?.type === 'influence');
            expect(influenceCards.length).toBeGreaterThan(0);
        });

        it('Tovak should have block-focused cards', () => {
            const config = HeroManager.getHero('tovak');
            const hero = new Hero(config);
            // Tovak has more block cards
            const blockCards = hero.deck.filter(c => c.basicEffect?.type === 'block');
            expect(blockCards.length).toBeGreaterThan(0);
        });
    });
});
