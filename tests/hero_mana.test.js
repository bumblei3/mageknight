
import { describe, it, expect, beforeEach } from 'vitest';
import Hero from '../js/hero.js';
import { Card } from '../js/card.js';
import { MANA_COLORS } from '../js/constants.js';

describe('Hero Mana Logic', () => {
    let hero;

    beforeEach(() => {
        hero = new Hero('TestHero');
    });

    it('should afford basic card without mana cost', () => {
        const card = new Card({ id: 'move', type: 'action', manaCost: 0 });
        expect(hero.canAffordMana(card)).toBe(true);
    });

    it('should NOT afford strong effect if no matching mana', () => {
        const card = new Card({ id: 'move', type: 'action', color: 'blue' });
        // Strong effect requires Blue mana
        // Hero has no mana
        expect(hero.canAffordMana(card)).toBe(false);
    });

    it('should afford strong effect with correct mana color', () => {
        const card = new Card({ id: 'move', type: 'action', color: 'blue' });
        hero.takeManaFromSource('blue');

        expect(hero.canAffordMana(card)).toBe(true);
    });

    it('should afford strong effect with wild (Gold) mana during Day', () => {
        const card = new Card({ id: 'move', type: 'action', color: 'blue' });
        hero.takeManaFromSource('gold');

        expect(hero.canAffordMana(card, false)).toBe(true); // isNight = false
    });

    it('should not allow Gold mana for non-matching strong effect at Night', () => {
        const card = new Card({ id: 'move', type: 'action', color: 'blue' });
        hero.takeManaFromSource('gold');

        // At night, Gold is not wild for Strong effects (Standard rules)
        // Actually, Gold is usually not usable at Night at all, or just as basic?
        // Let's rely on standard logic: Gold is unusable at Night.
        expect(hero.canAffordMana(card, true)).toBe(false); // isNight = true
    });

    it('should afford spell with matching mana (black)', () => {
        const card = new Card({ id: 'spell', type: 'spell', color: 'red', manaCost: 1 }); // Spells cost mana
        // If it's a Spell, it usually costs Basic Mana to cast at all?
        // Wait, regular spells need Mana to plain cast? Or just strong?
        // Standard rule: Spells powered by Mana. 
        // Let's test the specific logic my fix addressed:
        // "if (card.color && (card.type === 'action' || card.type === 'spell'))"

        hero.takeManaFromSource('red');
        expect(hero.canAffordMana(card)).toBe(true);
    });
});
