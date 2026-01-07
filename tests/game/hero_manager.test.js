import { describe, it, expect } from 'vitest';
import { HeroManager, HERO_DEFINITIONS } from '../../js/game/HeroManager.js';

describe('HeroManager', () => {
    describe('HERO_DEFINITIONS', () => {
        it('should define 4 heroes', () => {
            const heroIds = Object.keys(HERO_DEFINITIONS);
            expect(heroIds.length).toBe(4);
            expect(heroIds).toContain('goldyx');
            expect(heroIds).toContain('norowas');
            expect(heroIds).toContain('arythea');
            expect(heroIds).toContain('tovak');
        });

        it('should have required properties for each hero', () => {
            Object.values(HERO_DEFINITIONS).forEach(hero => {
                expect(hero.id).toBeDefined();
                expect(hero.name).toBeDefined();
                expect(hero.title).toBeDefined();
                expect(hero.description).toBeDefined();
                expect(hero.stats).toBeDefined();
                expect(hero.stats.armor).toBeDefined();
                expect(hero.stats.handLimit).toBeDefined();
                expect(hero.starterDeck).toBeDefined();
                expect(Array.isArray(hero.starterDeck)).toBe(true);
                expect(hero.starterDeck.length).toBeGreaterThan(0);
                expect(hero.portrait).toBeDefined();
                expect(hero.color).toBeDefined();
            });
        });

        it('should have unique starter decks for each hero', () => {
            const goldyxDeck = HERO_DEFINITIONS.goldyx.starterDeck;
            const norowasDeck = HERO_DEFINITIONS.norowas.starterDeck;
            const arytheaDeck = HERO_DEFINITIONS.arythea.starterDeck;
            const tovakDeck = HERO_DEFINITIONS.tovak.starterDeck;

            // Check that decks have different lengths or different cards
            // Norowas has unique influence cards
            const norowasUniqueCards = norowasDeck.filter(id => id === 'inf_2' || id === 'unit_1');
            expect(norowasUniqueCards.length).toBeGreaterThan(0);

            // Arythea has unique chaos cards
            const arytheaUniqueCards = arytheaDeck.filter(id => id === 'atk_cha' || id === 'chaos_1');
            expect(arytheaUniqueCards.length).toBeGreaterThan(0);

            // Tovak has unique tactical cards
            const tovakUniqueCards = tovakDeck.filter(id => id === 'blk_tac' || id === 'tac_1');
            expect(tovakUniqueCards.length).toBeGreaterThan(0);
        });

        it('should have Tovak with higher armor', () => {
            expect(HERO_DEFINITIONS.tovak.stats.armor).toBe(3);
            expect(HERO_DEFINITIONS.goldyx.stats.armor).toBe(2);
        });
    });

    describe('HeroManager.getHero', () => {
        it('should return correct hero by id', () => {
            const goldyx = HeroManager.getHero('goldyx');
            expect(goldyx.name).toBe('Goldyx');
            expect(goldyx.id).toBe('goldyx');

            const arythea = HeroManager.getHero('arythea');
            expect(arythea.name).toBe('Arythea');
        });

        it('should return goldyx as fallback for unknown id', () => {
            const fallback = HeroManager.getHero('unknown_hero');
            expect(fallback.id).toBe('goldyx');
        });

        it('should return goldyx for undefined id', () => {
            const fallback = HeroManager.getHero(undefined);
            expect(fallback.id).toBe('goldyx');
        });
    });

    describe('HeroManager.getAllHeroes', () => {
        it('should return array of all heroes', () => {
            const heroes = HeroManager.getAllHeroes();
            expect(Array.isArray(heroes)).toBe(true);
            expect(heroes.length).toBe(4);
        });

        it('should include all hero objects', () => {
            const heroes = HeroManager.getAllHeroes();
            const names = heroes.map(h => h.name);
            expect(names).toContain('Goldyx');
            expect(names).toContain('Norowas');
            expect(names).toContain('Arythea');
            expect(names).toContain('Tovak');
        });
    });
});
