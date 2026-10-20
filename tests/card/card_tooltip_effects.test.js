/**
 * Card tooltips must describe effects, not internal bookkeeping.
 *
 * The raw effect object carries `type`, `value`, `type2`, `condition`, … .
 * The tooltip used to iterate it blindly, so every hand card showed rows like
 * "• type influence (+influence)" and "• condition reputation_loss" — junk
 * keys plus a nonsensical "(+influence)" delta.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createCard } from '../../js/ui/components/Card';
import { Card as CardClass } from '../../js/card';
import {
    CARD_DEFINITIONS,
    SAMPLE_ADVANCED_ACTIONS,
    SAMPLE_SPELLS
} from '../../js/card/CardDefinitions';

function cardFor(id) {
    const def =
        CARD_DEFINITIONS[id] ||
        [...SAMPLE_SPELLS, ...SAMPLE_ADVANCED_ACTIONS].find((card) => card && card.id === id);
    return new CardClass(def);
}

function tooltipTextOf(id) {
    const el = createCard({ card: cardFor(id) });
    return el.textContent || '';
}

describe('card tooltip — effect rows', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('never leaks bookkeeping keys', () => {
        const text = tooltipTextOf('threaten');

        expect(text).not.toMatch(/\btype\b/);
        expect(text).not.toMatch(/\bvalue\b/);
        expect(text).not.toMatch(/reputation_loss/);
        expect(text).not.toMatch(/\(\+influence\)/);
    });

    it('shows the influence value and the reputation cost (Threaten)', () => {
        const text = tooltipTextOf('threaten');

        expect(text).toContain('Einfluss');
        expect(text).toContain('Ansehen');
        expect(text).toContain('-1');
    });

    it('shows the movement row a raw-key card used to hide (Agility strong)', () => {
        const html = createCard({ card: cardFor('blk_tac') }).outerHTML;

        expect(html).toContain('Bewegung');
        expect(html).toContain('Block');
    });

    it('labels a crystal card instead of rendering an empty effect list (Crystallize)', () => {
        const text = tooltipTextOf('crystallize');

        expect(text).toContain('Manakristall');
        expect(text).not.toContain('• crystal');
    });

    it('marks effect types without an engine handler as not implemented', () => {
        const text = tooltipTextOf('spell_mastery'); // spell_effect

        expect(text).toContain('Beliebigen Zauber wirken');
        expect(text).toContain('noch nicht implementiert');
    });

    it('describes Wish as a player choice', () => {
        const text = tooltipTextOf('wish');

        expect(text).toContain('Wunsch (Auswahl)');
        expect(text).not.toContain('noch nicht implementiert');
    });

    it('describes Improvisation as fetching a card from the discard pile', () => {
        const text = tooltipTextOf('improvisation');

        expect(text).toContain('Karte aus der Ablage');
        expect(text).not.toContain('noch nicht implementiert');
    });

    it('describes a next-card bonus instead of calling it unimplemented (Concentrate)', () => {
        const text = tooltipTextOf('concentrate');

        expect(text).toContain('Bonus auf nächste Karte');
        expect(text).not.toContain('noch nicht implementiert');
    });

    it('describes unit summoning (Summon)', () => {
        const text = tooltipTextOf('summon_spell');

        expect(text).toContain('Einheiten beschwören');
        expect(text).not.toContain('noch nicht implementiert');
    });

    it('renders the strong value next to the basic value', () => {
        const text = tooltipTextOf('swiftness');

        expect(text).toContain('Bewegung');
        expect(text).toContain('(+4)');
    });
});