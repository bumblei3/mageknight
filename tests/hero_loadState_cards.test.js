/**
 * Regression tests for Hero.loadState card-list integrity.
 * Foundation hardening: idsToCards() in loadState must not let corrupt
 * save data (null / non-Card, non-string objects) leak into deck/hand/
 * discard/wounds, mirroring the enemies null-drop hardening in
 * GameStateManager. An unknown string id is still converted to an
 * 'Unknown Card' gracefully; only literal null / foreign objects are dropped.
 */
import { describe, it, expect, vi } from 'vitest';
import { Hero } from '../js/hero';
import { CARD_DEFINITIONS } from '../js/card/CardDefinitions';

function knownId() {
    return Object.keys(CARD_DEFINITIONS)[0]; // exists in CARD_DEFINITIONS
}

describe('Hero.loadState — card-list integrity', () => {
    let hero;

    beforeEach(() => {
        hero = new Hero('Goldyx');
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    it('converts an unknown string id into an Unknown Card (graceful)', () => {
        hero.loadState({ deck: ['definitely_not_a_real_card_id'] });
        expect(hero.deck).toHaveLength(1);
        expect(hero.deck[0].id).toBe('definitely_not_a_real_card_id');
        expect(hero.deck[0].name).toBe('Unknown Card');
    });

    it('converts a known string id into a real Card', () => {
        const id = knownId();
        hero.loadState({ hand: [id] });
        expect(hero.hand).toHaveLength(1);
        expect(hero.hand[0].id).toBe(id);
    });

    it('drops a literal null entry in a card list (corrupt save)', () => {
        hero.loadState({ deck: [null, knownId()] });
        // null must not survive into the deck; only the valid card remains
        expect(hero.deck).toHaveLength(1);
        expect(hero.deck[0]).toBeTruthy();
        expect(hero.deck[0].id).toBe(knownId());
    });

    it('drops a foreign non-Card object in a card list (corrupt save)', () => {
        const id = knownId();
        hero.loadState({ discard: [{ foo: 'bar' }, id] });
        // The raw object must not leak into discard
        expect(hero.discard).toHaveLength(1);
        expect(hero.discard[0].id).toBe(id);
    });

    it('keeps already-instantiated Card objects untouched', () => {
        const id = knownId();
        const card = new (hero.deck.constructor !== undefined ? Object : Object)(); // placeholder
        // Build a real Card via loadState round-trip instead
        hero.loadState({ deck: [id] });
        const real = hero.deck[0];
        // Re-load with the real Card instance present
        hero.loadState({ hand: [real] });
        expect(hero.hand[0]).toBe(real); // returned as-is, no copy
    });
});
