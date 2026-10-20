/**
 * Special card effects: "boost the next card" (Concentrate) and unit summoning
 * (Summon spell / site spell reward).
 *
 * Both were declared in the card data and shown as "noch nicht implementiert"
 * in the tooltip — playing them did nothing at all.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Card, createDeck } from '../../js/card/CardFactory';
import {
    CARD_DEFINITIONS,
    SAMPLE_ADVANCED_ACTIONS,
    SAMPLE_SPELLS
} from '../../js/card/CardDefinitions';
import { UNIT_INFO } from '../../js/unit';
import { HeroBuilder } from '../test-helpers.js';

function definitionById(id) {
    if (CARD_DEFINITIONS[id]) return CARD_DEFINITIONS[id];
    return [...SAMPLE_SPELLS, ...SAMPLE_ADVANCED_ACTIONS].find((def) => def && def.id === id);
}

function cardOf(id) {
    return new Card(definitionById(id));
}

/** Hero holding `ids` in hand, empty deck/discard. */
function heroWithHand(ids) {
    const hero = new HeroBuilder().withHand(ids.map(cardOf)).withDeck([]).build();
    hero.discard = [];
    return hero;
}

describe('Concentrate — arms a bonus for the next card played', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('boosts the next card and is consumed by it', () => {
        const hero = heroWithHand(['concentrate', 'rage', 'rage']);

        hero.playCard(0, false); // Concentrate basic: +2 armed
        expect(hero.nextCardBonus).toBe(2);
        expect(hero.attackPoints).toBe(0);

        const second = hero.playCard(0, false); // Rage basic: attack 2 + 2
        expect(second.effect.attack).toBe(4);
        expect(second.effect.enhancedBy).toBe(2);
        expect(hero.attackPoints).toBe(4);
        expect(hero.nextCardBonus).toBe(0);

        hero.playCard(0, false); // third card is back to normal
        expect(hero.attackPoints).toBe(6);
    });

    it('boosts the card the bonus targets, not the card it is armed on again', () => {
        const hero = heroWithHand(['concentrate', 'swiftness']);

        hero.playCard(0, false);
        const boosted = hero.playCard(0, false);

        // Swiftness is a pure move card, so the bonus lands on movement
        expect(boosted.effect.movement).toBe(4);
        expect(hero.movementPoints).toBe(4);
    });

    it('does not permanently mutate the boosted card instance', () => {
        const hero = heroWithHand(['concentrate', 'rage']);
        const rage = hero.hand[1];

        hero.playCard(0, false);
        hero.playCard(0, false);

        expect(rage.getEffect(false).attack).toBe(2);
    });

    it('stacks two Concentrates into one bigger bonus', () => {
        const hero = heroWithHand(['concentrate', 'concentrate', 'rage']);

        hero.playCard(0, false);
        hero.playCard(0, false);
        const boosted = hero.playCard(0, false);

        expect(boosted.effect.attack).toBe(6);
    });

    it('drops an unused bonus when the turn ends (clearTurnBonus)', () => {
        const hero = heroWithHand(['concentrate']);
        hero.playCard(0, false);

        hero.clearTurnBonus();

        expect(hero.nextCardBonus).toBe(0);
    });
});

describe('Summon — gains units within the command limit', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('summons a real unit from UNIT_INFO for the Summon spell', () => {
        const hero = heroWithHand(['summon_spell']);
        hero.commandLimit = 3;

        hero.playCard(0, false);

        expect(hero.units).toHaveLength(1);
        expect(Object.keys(UNIT_INFO)).toContain(hero.units[0].type);
    });

    it('summons two units with the strong effect when there is room', () => {
        const hero = heroWithHand(['summon_spell']);
        hero.commandLimit = 3;
        hero.addMana('green');

        hero.playCard(0, true);

        expect(hero.units).toHaveLength(2);
    });

    it('never exceeds the command limit', () => {
        const hero = heroWithHand(['summon_spell']);
        hero.commandLimit = 1;
        hero.addMana('green');

        hero.playCard(0, true); // strong asks for 2 units, only 1 fits

        expect(hero.units).toHaveLength(1);
    });

    it('summons nothing when the command limit is already reached', () => {
        const hero = heroWithHand(['summon_spell']);
        hero.commandLimit = 1;
        hero.units = [createUnitStub()];

        hero.playCard(0, false);

        expect(hero.units).toHaveLength(1);
    });

    it('picks the unit type from the real unit pool (deterministic via mock)', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const hero = heroWithHand(['summon_spell']);
        hero.commandLimit = 1;

        hero.playCard(0, false);

        expect(hero.units[0].type).toBe(Object.keys(UNIT_INFO)[0]);
    });
});

function createUnitStub() {
    return { type: 'stub', getName: () => 'Stub', isWounded: () => false, destroyed: false, ready: true };
}
