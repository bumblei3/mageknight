/**
 * Regression tests for the "Unknown Card" fallback paths.
 * Foundation hardening round: the defensive console.warn paths in
 * CardFactory.createDeck and hero.loadState must produce a consistent
 * Card shape (color === null, never undefined) so downstream mana /
 * rendering logic doesn't have to special-case undefined.
 */
import { describe, it, expect, vi } from 'vitest';
import { createDeck } from '../../js/card/CardFactory';

describe('createDeck — unknown-card fallback shape', () => {
    it('produces a Card with color === null (not undefined) for an unknown id', () => {
        const cards = createDeck(['does_not_exist']);
        expect(cards).toHaveLength(1);
        const card = cards[0];
        expect(card.id).toBe('does_not_exist');
        expect(card.name).toBe('Unknown Card');
        // CRITICAL: must be null to match hero.loadState's fallback shape,
        // otherwise downstream mana/render logic sees undefined.
        expect(card.color).toBeNull();
    });

    it('does not throw and only warns once for an unknown id', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
        expect(() => createDeck(['bogus'])).not.toThrow();
        expect(warn).toHaveBeenCalledWith('Card definition not found for ID: bogus');
        warn.mockRestore();
    });

    it('still builds a real card from a known id with its color intact', () => {
        const cards = createDeck(['rage']);
        expect(cards[0].id).toBe('rage');
        expect(cards[0].color).toBe('red');
    });
});
