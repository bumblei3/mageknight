/**
 * Card ids must survive a save/load round trip.
 *
 * Saves store ids (`deck: ['concentration', …]`). Loading resolved them against
 * `CARD_DEFINITIONS`, which only holds the 18 starter entries — every advanced
 * action, spell and artifact came back as an inert "Unknown Card" (color null,
 * no effects). The pool now also covers SAMPLE_ADVANCED_ACTIONS, SAMPLE_SPELLS
 * and SAMPLE_ARTIFACTS.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { HeroBuilder } from '../test-helpers.js';
import { createDeck, Card } from '../../js/card/CardFactory.js';
import { findCardDefinition, SAMPLE_SPELLS, SAMPLE_ADVANCED_ACTIONS, SAMPLE_ARTIFACTS } from '../../js/card/CardDefinitions.js';

const advancedCard = () => SAMPLE_ADVANCED_ACTIONS.find((card) => card.id === 'fireball_action');
const spellOnlyCard = () => SAMPLE_SPELLS.find((card) => card.id === 'concentration');
const spellCard = () => SAMPLE_SPELLS.find((card) => card.id === 'mana_storm');
const artifactCard = () => SAMPLE_ARTIFACTS.find((card) => card.id === 'boots_of_flight');

describe('card id lookup covers every pool', () => {
    afterEach(() => vi.restoreAllMocks());

    it('resolves a starter card', () => {
        expect(findCardDefinition('rage')).toBeDefined();
    });

    it('resolves an advanced action, a spell and an artifact', () => {
        expect(findCardDefinition('fireball_action')).toBe(advancedCard());
        expect(findCardDefinition('concentration')).toBe(spellOnlyCard());
        expect(findCardDefinition('mana_storm')).toBe(spellCard());
        // Artifacts exist in two pools with equal content — compare values
        expect(findCardDefinition('boots_of_flight')).toEqual(artifactCard());
    });

    it('returns undefined for an unknown id', () => {
        expect(findCardDefinition('does_not_exist')).toBeUndefined();
    });

    it('lets createDeck build cards that live outside the starter dictionary', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const cards = createDeck(['concentration', 'mana_storm']);

        expect(cards.map((card) => card.name)).toEqual(['Concentration', 'Mana Storm']);
        expect(cards[0].getEffect(false).draw).toBe(3);
        expect(warn).not.toHaveBeenCalled();
    });
});

describe('hero.loadState restores real cards from ids', () => {
    afterEach(() => vi.restoreAllMocks());

    it('restores an advanced action, a spell and an artifact', () => {
        const hero = new HeroBuilder().withHand([]).withDeck([]).build();
        hero.discard = [];
        hero.units = [];
        hero.skills = [];

        hero.loadState({
            name: 'TestHero',
            level: 1,
            fame: 0,
            reputation: 0,
            armor: 2,
            movementPoints: 0,
            attackPoints: 0,
            blockPoints: 0,
            influencePoints: 0,
            healingPoints: 0,
            handLimit: 5,
            commandLimit: 1,
            position: { q: 0, r: 0 },
            deck: ['mana_storm'],
            hand: ['concentration'],
            discard: ['boots_of_flight'],
            wounds: [],
            crystals: {},
            skills: [],
            tempMana: [],
            units: [],
            equippedArtifact: 'boots_of_flight'
        });

        expect(hero.hand[0].name).toBe('Concentration');
        expect(hero.hand[0].getEffect(false).draw).toBe(3);
        expect(hero.deck[0].name).toBe('Mana Storm');
        expect(hero.deck[0].getEffect(false).mana).toBe(2);
        expect(hero.discard[0].name).toBe('Boots of Flight');
    });

    it('still warns and substitutes a placeholder for unknown ids', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const hero = new HeroBuilder().withHand([]).withDeck([]).build();

        hero.loadState({
            name: 'TestHero',
            level: 1,
            fame: 0,
            reputation: 0,
            armor: 2,
            movementPoints: 0,
            attackPoints: 0,
            blockPoints: 0,
            influencePoints: 0,
            healingPoints: 0,
            handLimit: 5,
            commandLimit: 1,
            position: { q: 0, r: 0 },
            deck: ['bogus_card'],
            hand: [],
            discard: [],
            wounds: [],
            crystals: {},
            skills: [],
            tempMana: [],
            units: [],
            equippedArtifact: null
        });

        expect(hero.deck[0].name).toBe('Unknown Card');
        expect(warn).toHaveBeenCalledWith('Card definition not found for ID: bogus_card');
    });

    it('keeps a card shaped save/load round trip intact', () => {
        const hero = new HeroBuilder().withHand([new Card(spellOnlyCard())]).withDeck([]).build();
        hero.discard = [];
        const state = hero.getState();
        const reloaded = new HeroBuilder().withHand([]).withDeck([]).build();

        reloaded.loadState(state);

        expect(reloaded.hand.map((card) => card.id)).toEqual(['concentration']);
        expect(reloaded.hand[0].getEffect(false).draw).toBe(3);
    });
});
