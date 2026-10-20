/**
 * Keyword rules on card effects.
 *
 * Six keys were declared in `js/card/CardDefinitions.ts` and read nowhere:
 * the card played, the value did nothing. Each one is a real Mage Knight rule
 * and each now has an engine reader:
 *
 *   cure            cleanse          heal + remove a wound
 *   soul_stealer    vampirism        artifact heals per enemy defeated
 *   chaos_1         fireAttack       Burning Shield's fire attack on the block
 *   tac_1           iceBlock         Cold Toughness block counts as cold fire
 *   unit_1          unitRecruitment  Call to Arms recruits units
 *   concentration   keep             drawn card survives the end of turn
 *
 * The guard that keeps this list honest lives in
 * `tests/card/card_effects_applied.test.js`.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Card } from '../../js/card/CardFactory';
import {
    CARD_DEFINITIONS,
    SAMPLE_ADVANCED_ACTIONS,
    SAMPLE_SPELLS,
    SAMPLE_ARTIFACTS
} from '../../js/card/CardDefinitions';
import { Hero } from '../../js/hero';
import { Combat } from '../../js/combat';
import { BlockingEngine } from '../../js/combat/BlockingEngine';
import { CombatOrchestrator } from '../../js/game/CombatOrchestrator';
import { UNIT_INFO } from '../../js/unit';
import { HeroBuilder } from '../test-helpers.js';

const ALL_DEFINITIONS = [
    ...Object.values(CARD_DEFINITIONS),
    ...SAMPLE_ADVANCED_ACTIONS,
    ...SAMPLE_SPELLS,
    ...SAMPLE_ARTIFACTS
].filter(Boolean);

function definitionById(id) {
    return ALL_DEFINITIONS.find((def) => def && def.id === id);
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

/** Hero with enough mana of every colour to play any card strong. */
function heroWithMana(ids) {
    const hero = heroWithHand(ids);
    hero.tempMana = ['red', 'blue', 'green', 'white'];
    return hero;
}

/** Hero with `count` wound cards in hand. */
function heroWithWounds(ids, woundCount) {
    const hero = heroWithHand(ids);
    for (let i = 0; i < woundCount; i++) hero.takeWound();
    return hero;
}

describe('Cure — cleanse removes a wound', () => {
    it('heals and additionally removes a wound from the hand', () => {
        const hero = heroWithWounds(['cure'], 2);
        expect(hero.wounds).toHaveLength(2);
        // cure + two wounds in hand
        const handBefore = hero.hand.length;

        hero.playCard(0, false); // basic: heal 3 + cleanse

        expect(hero.wounds).toHaveLength(1);
        // the played card leaves the hand and one wound is cleansed
        expect(hero.hand.length).toBe(handBefore - 2);
    });

    it('cleanses even without healing points', () => {
        const hero = heroWithWounds(['cure'], 1);
        hero.healingPoints = 0;

        hero.playCard(0, false);

        expect(hero.wounds).toHaveLength(0);
    });

    it('leaves a hero without wounds untouched', () => {
        const hero = heroWithHand(['cure']);

        hero.playCard(0, false);

        expect(hero.wounds).toHaveLength(0);
        expect(hero.healingPoints).toBe(3);
    });
});

describe('Concentration — keep holds the drawn card through end of turn', () => {
    // Big enough that a redraw never has to recycle the discard pile, so the
    // assertions below are deterministic.
    const DECK = [
        'rage',
        'march',
        'stamina',
        'swiftness',
        'determination',
        'promise',
        'tranquility',
        'refresh',
        'crystal_of_insight',
        'mana_draw',
        'rune_sword',
        'horn_of_valor'
    ];

    it('keeps the strong-drawn card in hand at end of turn', () => {
        const hero = heroWithMana(['concentration']);
        hero.deck = DECK.map(cardOf);

        hero.playCard(0, true); // strong: draw 1, keep
        const keptCard = hero.hand[0];
        expect(keptCard).toBeTruthy();

        hero.endTurn();

        expect(hero.hand.map((card) => card.id)).toContain(keptCard.id);
        // the kept card never reached the discard pile
        expect(hero.discard.map((card) => card.id)).not.toContain(keptCard.id);
    });

    it('discards a card that was not kept', () => {
        const hero = heroWithMana(['concentration', 'rage']);
        hero.deck = DECK.map(cardOf);

        hero.playCard(0, true); // keeps the drawn card only

        hero.endTurn();

        expect(hero.hand.map((card) => card.id)).not.toContain('rage');
        expect(hero.discard.map((card) => card.id)).toContain('rage');
    });

    it('discards the kept card on the following turn', () => {
        const hero = heroWithMana(['concentration']);
        hero.deck = DECK.map(cardOf);

        hero.playCard(0, true);
        const kept = hero.hand[0];

        hero.endTurn();
        const afterFirst = hero.hand.map((card) => card.id);
        expect(afterFirst).toContain(kept.id);

        hero.endTurn();

        expect(hero.keptCardIds.has(kept.id)).toBe(false);
        expect(hero.hand.map((card) => card.id)).not.toContain(kept.id);
    });

    it('leaves a normal draw on the discard pile', () => {
        const hero = heroWithMana(['concentration']);
        hero.deck = DECK.map(cardOf);

        hero.playCard(0, false); // basic: draw 3, no keep

        hero.endTurn();

        // the three drawn cards plus the played Concentration itself
        expect(hero.discard).toHaveLength(4);
    });
});

describe('Call to Arms — unitRecruitment', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('recruits one unit for the basic effect and two for the strong one', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const basic = heroWithMana(['unit_1']);
        basic.commandLimit = 3;
        const types = Object.keys(UNIT_INFO);

        basic.playCard(0, false);
        expect(basic.units).toHaveLength(1);
        expect(basic.units[0].type).toBe(types[0]);

        const strong = heroWithMana(['unit_1']);
        strong.commandLimit = 3;
        strong.playCard(0, true);
        expect(strong.units).toHaveLength(2);
    });

    it('still grants the influence the card declares', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const hero = heroWithMana(['unit_1']);
        hero.commandLimit = 3;

        hero.playCard(0, true);

        expect(hero.influencePoints).toBe(5);
    });

    it('refuses recruits beyond the command limit and reports them', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const hero = heroWithMana(['unit_1']);
        hero.commandLimit = 1;

        hero.playCard(0, true); // wants two, fits one

        expect(hero.units).toHaveLength(1);
        expect(hero.recruitUnits(2)).toEqual({ recruited: 0, refused: 2, units: [] });
    });
});

describe('Burning Shield — fireAttack rides along on the block', () => {
    it('is exposed as a fire attack on the normalized effect', () => {
        const card = cardOf('chaos_1');
        const strong = card.getEffect(true);

        expect(strong.block).toBe(4);
        expect(strong.fireAttack).toBe(2);
    });

    it('does not add the fire value to the physical attack pool', () => {
        const card = cardOf('chaos_1');
        const strong = card.getEffect(true);

        expect(strong.attack).toBeUndefined();
    });
});

describe('Cold Toughness — iceBlock counts as cold fire', () => {
    const engine = new BlockingEngine();

    function enemyWith(element, attack = 4) {
        return {
            name: 'Elemental',
            armor: 3,
            attack,
            attackType: element,
            getBlockRequirement: () => attack,
            getResistanceMultiplier: () => 1
        };
    }

    it('keeps full efficiency against a fire attack', () => {
        const result = engine.calculateBlock(enemyWith('fire'), [
            { value: 4, element: 'physical', iceBlock: true }
        ]);

        expect(result.blocked).toBe(true);
        expect(result.totalBlock).toBe(4);
        expect(result.isInefficient).toBe(false);
        expect(result.elementalWildcard).toBe(true);
    });

    it('without the flag the same block is half efficient', () => {
        const result = engine.calculateBlock(enemyWith('fire'), [
            { value: 4, element: 'physical', iceBlock: false }
        ]);

        expect(result.totalBlock).toBe(2);
        expect(result.isInefficient).toBe(true);
        expect(result.elementalWildcard).toBe(false);
    });

    it('still blocks a physical attacker', () => {
        const result = engine.calculateBlock(enemyWith('physical'), [
            { value: 4, element: 'physical', iceBlock: true }
        ]);

        expect(result.blocked).toBe(true);
        expect(result.totalBlock).toBe(4);
    });
});

describe('Soul Stealer — vampirism heals the hero', () => {
    function heroWithArtifact(id) {
        const hero = new Hero('GOLDYX');
        hero.hand = [cardOf(id)];
        return hero;
    }

    it('equipping a vampiric artifact arms the counter and unequipping clears it', () => {
        const hero = heroWithArtifact('soul_stealer');

        expect(hero.equipArtifact(0)).toBe(true);
        expect(hero.vampirism).toBe(1);

        hero.unequipArtifact();

        expect(hero.vampirism).toBe(0);
    });

    it('heals one wound per enemy defeated while armed', () => {
        const hero = heroWithArtifact('soul_stealer');
        hero.equipArtifact(0);
        for (let i = 0; i < 3; i++) hero.takeWound();

        const healed = hero.vampiricHeal(2);

        expect(healed).toBe(2);
        expect(hero.wounds).toHaveLength(1);
    });

    it('never heals more wounds than the hero has', () => {
        const hero = new Hero('GOLDYX');
        hero.takeWound();

        expect(hero.vampiricHeal(5)).toBe(1);
        expect(hero.wounds).toHaveLength(0);
    });
});

describe('CombatOrchestrator — fireAttack is resolved as its own attack pass', () => {
    it('queues the fire attack instead of adding it to the block', () => {
        const hero = new Hero('GOLDYX');
        const enemy = { id: 'e1', name: 'Orc', armor: 5, attack: 2, fame: 1, isBoss: false };
        const combat = new Combat(hero, [enemy]);
        combat.phase = 'block';

        const game = {
            combat,
            hero,
            timeManager: { isNight: () => false },
            ui: null,
            particleSystem: null,
            addLog: () => {},
            renderHand: () => {},
            updateStats: () => {},
            actionManager: null
        };
        const orch = new CombatOrchestrator(game);

        const card = cardOf('chaos_1');
        hero.playCard = () => ({
            card: { name: 'Burning Shield', color: 'red' },
            effect: { block: 4, fireAttack: 2, element: 'physical' }
        });

        orch.playCardInCombat(0, card, true);

        expect(orch.combatBlockTotal).toBe(4);
        expect(orch.pendingFireAttacks).toEqual([2]);
    });

    it('leaves the fire queue empty for a card without the flag', () => {
        const hero = new Hero('GOLDYX');
        const enemy = { id: 'e1', name: 'Orc', armor: 5, attack: 2, fame: 1, isBoss: false };
        const combat = new Combat(hero, [enemy]);
        combat.phase = 'block';

        const game = {
            combat,
            hero,
            timeManager: { isNight: () => false },
            ui: null,
            particleSystem: null,
            addLog: () => {},
            renderHand: () => {},
            updateStats: () => {},
            actionManager: null
        };
        const orch = new CombatOrchestrator(game);

        const card = cardOf('rage');
        hero.playCard = () => ({
            card: { name: 'Rage', color: 'red' },
            effect: { block: 2, element: 'physical' }
        });

        orch.playCardInCombat(0, card, true);

        expect(orch.pendingFireAttacks).toEqual([]);
    });
});
