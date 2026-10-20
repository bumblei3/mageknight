/**
 * Card effects must reach the engine.
 *
 * Card data declares effects like `{ type: 'draw', value: 3 }` or
 * `{ type: 'attack', value: 2, move: 2 }`. `Card.normalizeEffect()` lifts
 * those declarations onto the direct properties `Hero.playCard()` applies.
 *
 * Before this suite existed, `move`, `draw`, `mana_token`, `crystal`,
 * `hand_limit` and `condition: 'reputation_loss'` were declared in the data but
 * dropped on the floor: playing Agility (strong), Battle Versatility,
 * Concentration, Mana Storm, Crystallize, Will Focus or Threaten did nothing.
 */
import { describe, it, expect } from 'vitest';
import { Card, createDeck } from '../../js/card/CardFactory';
import {
    CARD_DEFINITIONS,
    SAMPLE_ARTIFACTS,
    SAMPLE_SPELLS,
    SAMPLE_ADVANCED_ACTIONS
} from '../../js/card/CardDefinitions';
import {
    isKnownEffectType,
    isAppliedEffectKey,
    collectEffectKeys,
    KNOWN_EFFECT_KEYS,
    EFFECT_FLAGS,
    EFFECT_TYPE_TO_KEY
} from '../../js/card/effectMeta';
import { HeroBuilder } from '../test-helpers.js';

/**
 * The definition for `id`: the starter dictionary wins (it is the canonical
 * deck), otherwise exactly one collection entry must match.
 */
function definitionById(id) {
    if (CARD_DEFINITIONS[id]) return CARD_DEFINITIONS[id];

    const matches = [
        ...SAMPLE_ADVANCED_ACTIONS,
        ...SAMPLE_SPELLS,
        ...SAMPLE_ARTIFACTS
    ].filter((def) => def && def.id === id);

    if (matches.length !== 1) {
        throw new Error(`expected exactly one definition for "${id}", got ${matches.length}`);
    }
    return matches[0];
}

/** Hero with exactly one card in hand and an empty discard pile. */
function heroWithCard(id) {
    const card = new Card(definitionById(id));
    const hero = new HeroBuilder().withHand([card]).withDeck([]).build();
    hero.discard = [];
    return { hero, card };
}

describe('Card.normalizeEffect — declared effect keys are lifted', () => {
    it('lifts `move` declared next to another primary type (Battle Versatility)', () => {
        const { card } = heroWithCard('battle_versatility');
        const basic = card.getEffect(false);

        expect(basic.attack).toBe(2);
        expect(basic.block).toBe(2);
        expect(basic.influence).toBe(2);
        expect(basic.movement).toBe(2);
    });

    it('lifts `type2`/`value2` (Agility strong: block 3 + move 2)', () => {
        const { card } = heroWithCard('blk_tac');
        const strong = card.getEffect(true);

        expect(strong.block).toBe(3);
        expect(strong.movement).toBe(2);
    });

    it('maps mana_token onto `mana` (Mana Storm)', () => {
        const { card } = heroWithCard('mana_storm');

        expect(card.getEffect(false).mana).toBe(2);
        expect(card.getEffect(true).mana).toBe(4);
    });

    it('maps `crystal` onto `crystal` (Crystallize)', () => {
        const { card } = heroWithCard('crystallize');

        expect(card.getEffect(false).crystal).toBe(1);
        expect(card.getEffect(true).crystal).toBe(3);
    });

    it('maps `hand_limit` onto `handLimitBonus` (Will Focus)', () => {
        const { card } = heroWithCard('will_focus');

        expect(card.getEffect(false).handLimitBonus).toBe(1);
        expect(card.getEffect(true).handLimitBonus).toBe(2);
    });

    it('keeps the plain type → property mappings intact', () => {
        expect(heroWithCard('concentration').card.getEffect(false).draw).toBe(3);
        expect(heroWithCard('swiftness').card.getEffect(false).movement).toBe(2);
        expect(heroWithCard('cure').card.getEffect(false).healing).toBe(3);
        expect(heroWithCard('rage').card.getEffect(false).attack).toBe(2);
    });
});

describe('Hero.playCard — declared effects change hero state', () => {
    it('applies movement, attack, block and influence from one card', () => {
        const { hero } = heroWithCard('battle_versatility');

        hero.playCard(0, false);

        expect(hero.movementPoints).toBe(2);
        expect(hero.attackPoints).toBe(2);
        expect(hero.blockPoints).toBe(2);
        expect(hero.influencePoints).toBe(2);
    });

    it('draws the cards declared as `draw` (Concentration)', () => {
        const { hero } = heroWithCard('concentration');
        hero.deck = createDeck(['rage', 'swiftness', 'march', 'swiftness', 'march']);

        hero.playCard(0, false);

        expect(hero.hand).toHaveLength(3);
        expect(hero.deck).toHaveLength(2);
    });

    it('grants mana tokens of the card colour (Mana Storm, strong)', () => {
        const { hero, card } = heroWithCard('mana_storm');
        hero.addMana('gold');

        hero.playCard(0, true);

        expect(card.color).toBe('gold');
        expect(hero.tempMana).toEqual(['gold', 'gold', 'gold', 'gold']);
    });

    it('grants a mana crystal of the card colour (Crystallize)', () => {
        const { hero, card } = heroWithCard('crystallize');

        hero.playCard(0, false);

        expect(card.color).toBe('blue');
        expect(hero.crystals.blue).toBe(1);
    });

    it('crystal gains respect the cap of 3 per colour', () => {
        const { hero } = heroWithCard('crystallize');
        hero.crystals.blue = 2;
        hero.addMana('blue');

        hero.playCard(0, true); // strong: 3 crystals, only one slot left

        expect(hero.crystals.blue).toBe(3);
    });

    it('raises the hand limit (Will Focus)', () => {
        const { hero } = heroWithCard('will_focus');
        const before = hero.handLimit;

        hero.playCard(0, false);

        expect(hero.handLimit).toBe(before + 1);
    });

    it('costs reputation when the effect carries condition reputation_loss (Threaten)', () => {
        const { hero } = heroWithCard('threaten');

        hero.playCard(0, false);

        expect(hero.influencePoints).toBe(2);
        expect(hero.reputation).toBe(-1);
    });

    it('leaves reputation alone for a card without the condition', () => {
        const { hero } = heroWithCard('rage');

        hero.playCard(0, false);

        expect(hero.reputation).toBe(0);
    });
});

describe('effect key coverage — no declared key is silently dead', () => {
    it('every key declared on an effect is applied or explicitly flagged unhandled', () => {
        const declared = collectEffectKeys(
            CARD_DEFINITIONS,
            SAMPLE_ARTIFACTS,
            SAMPLE_SPELLS,
            SAMPLE_ADVANCED_ACTIONS
        );

        const silent = declared.filter(
            (key) =>
                !isAppliedEffectKey(key) &&
                !KNOWN_EFFECT_KEYS.includes(key) &&
                !EFFECT_FLAGS.some((flag) => flag.key === key && flag.unhandled)
        );

        expect(silent).toEqual([]);
    });

    it('the keyword rules that used to be declared and dropped are now applied', () => {
        // Before this suite grew, these keys sat in CardDefinitions with no
        // reader anywhere in js/: the cards played, the values did nothing.
        // soul_stealer exists in both the starter dict and SAMPLE_ARTIFACTS,
        // so the lookup takes the first match rather than definitionById().
        const expected = {
            cleanse: 'cure',
            vampirism: 'soul_stealer',
            fireAttack: 'chaos_1', // Burning Shield
            iceBlock: 'tac_1', // Cold Toughness
            unitRecruitment: 'unit_1', // Call to Arms
            keep: 'concentration'
        };

        const all = [
            ...Object.values(CARD_DEFINITIONS),
            ...SAMPLE_ARTIFACTS,
            ...SAMPLE_SPELLS,
            ...SAMPLE_ADVANCED_ACTIONS
        ].filter(Boolean);

        for (const key of Object.keys(expected)) {
            const cardId = expected[key];
            const def = all.find((entry) => entry && entry.id === cardId);
            expect(def, `definition for ${cardId}`).toBeTruthy();

            const effects = [def.basicEffect, def.advancedEffect, def.strongEffect]
                .filter(Boolean);
            expect(effects.some((effect) => effect[key] !== undefined)).toBe(true);
            expect(isAppliedEffectKey(key)).toBe(true);
        }
    });
});

describe('effect type coverage — no declared type is silently unknown', () => {
    function collectEffectTypes() {
        const types = new Set();
        const seen = new Set();

        const walk = (node) => {
            if (!node || typeof node !== 'object' || seen.has(node)) return;
            seen.add(node);
            if (Array.isArray(node)) {
                node.forEach(walk);
                return;
            }
            if (node.basicEffect) types.add(node.basicEffect.type);
            if (node.advancedEffect) types.add(node.advancedEffect.type);
            Object.values(node).forEach(walk);
        };

        [
            CARD_DEFINITIONS,
            SAMPLE_ARTIFACTS,
            SAMPLE_SPELLS,
            SAMPLE_ADVANCED_ACTIONS
        ].forEach(walk);
        return [...types].filter(Boolean);
    }

    it('every effect type in the card data is mapped or explicitly unhandled', () => {
        const unknown = collectEffectTypes().filter((type) => !isKnownEffectType(type));

        expect(unknown).toEqual([]);
    });

    it('maps the effect types the engine applies directly', () => {
        expect(EFFECT_TYPE_TO_KEY.move).toBe('movement');
        expect(EFFECT_TYPE_TO_KEY.mana_token).toBe('mana');
        expect(EFFECT_TYPE_TO_KEY.crystal).toBe('crystal');
        expect(EFFECT_TYPE_TO_KEY.hand_limit).toBe('handLimitBonus');
        expect(EFFECT_TYPE_TO_KEY.heal).toBe('healing');
    });
});
