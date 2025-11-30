import { describe, it, expect } from './testRunner.js';
import { Hero } from '../js/hero.js';

describe('Hero', () => {
    it('should initialize with correct stats', () => {
        const hero = new Hero('TestHero');
        expect(hero.name).toBe('TestHero');
        expect(hero.armor).toBe(2);
        expect(hero.handLimit).toBe(5);
    });

    it('should draw cards up to hand limit', () => {
        const hero = new Hero('TestHero');
        hero.drawCards();
        expect(hero.hand.length).toBe(5);
    });

    it('should take wounds correctly', () => {
        const hero = new Hero('TestHero');
        hero.takeWound();
        expect(hero.wounds.length).toBe(1);
        expect(hero.hand.length).toBe(1); // Wound goes to hand
        expect(hero.hand[0].isWound()).toBe(true);
    });

    it('should heal wounds', () => {
        const hero = new Hero('TestHero');
        hero.healingPoints = 1;
        hero.takeWound();
        const healed = hero.healWound();
        expect(healed).toBe(true);
        expect(hero.wounds.length).toBe(0);
        expect(hero.healingPoints).toBe(0);
    });
});
