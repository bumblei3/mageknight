/**
 * Wish and Improvisation need a decision from the player. Both were declared in
 * the card data and listed as "noch nicht implementiert" in the tooltip.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeroBuilder } from '../test-helpers.js';
import { Card } from '../../js/card/CardFactory.js';
import { Combat } from '../../js/combat.js';
import { CombatOrchestrator } from '../../js/game/CombatOrchestrator.js';
import { COMBAT_PHASES } from '../../js/constants.js';
import {
    resolveCardChoice,
    needsCardChoice,
    openWishChoice,
    openCopyChoice
} from '../../js/game/cardChoiceFlow.js';
import { setLanguage } from '../../js/i18n/index.js';

const cardOf = (id, name = id) =>
    new Card({ id, name, type: 'action', color: 'red', basicEffect: { type: 'attack', value: 2 } });

function fakeGame(hero, overrides = {}) {
    const logs = [];
    const choices = [];
    const game = {
        hero,
        addLog: (message, type) => logs.push({ message, type }),
        renderHand: vi.fn(),
        updateStats: vi.fn(),
        ui: {
            showCardChoice: vi.fn((config) => choices.push(config))
        },
        ...overrides
    };
    return { game, logs, choices };
}

describe('Wish — resolveWish', () => {
    beforeEach(() => setLanguage('de'));

    it('grants attack', () => {
        const hero = new HeroBuilder().build();

        const result = hero.resolveWish('attack');

        expect(result.success).toBe(true);
        expect(hero.attackPoints).toBe(5);
    });

    it('heals up to five wounds', () => {
        const hero = new HeroBuilder().build();
        for (let i = 0; i < 7; i++) hero.takeWound();

        const result = hero.resolveWish('heal');

        expect(result.success).toBe(true);
        expect(hero.wounds).toHaveLength(2);
    });

    it('heals only what is wounded', () => {
        const hero = new HeroBuilder().build();
        hero.takeWound();

        hero.resolveWish('heal');

        expect(hero.wounds).toHaveLength(0);
    });

    it('awards an artifact into the discard pile', () => {
        const hero = new HeroBuilder().build();

        hero.resolveWish('artifact');

        expect(hero.discard).toHaveLength(1);
        expect(hero.discard[0].type).toBe('artifact');
    });

    it('rejects an unknown option instead of silently doing nothing', () => {
        const hero = new HeroBuilder().build();

        const result = hero.resolveWish('nonsense');

        expect(result.success).toBe(false);
    });
});

describe('Improvisation — copyCardsFromDiscard', () => {
    it('moves the chosen card from the discard pile into the hand', () => {
        const hero = new HeroBuilder().withHand([]).build();
        hero.discard = [cardOf('rage', 'Rage'), cardOf('swiftness', 'Swiftness')];

        const copied = hero.copyCardsFromDiscard(['rage']);

        expect(copied).toHaveLength(1);
        expect(hero.hand.map((c) => c.id)).toEqual(['rage']);
        expect(hero.discard.map((c) => c.id)).toEqual(['swiftness']);
    });

    it('ignores unknown ids', () => {
        const hero = new HeroBuilder().withHand([]).build();
        hero.discard = [cardOf('rage')];

        expect(hero.copyCardsFromDiscard(['does_not_exist'])).toHaveLength(0);
        expect(hero.discard).toHaveLength(1);
    });

    it('copies two cards for the strong effect', () => {
        const hero = new HeroBuilder().withHand([]).build();
        hero.discard = [cardOf('rage'), cardOf('swiftness')];

        hero.copyCardsFromDiscard(['rage', 'swiftness']);

        expect(hero.hand).toHaveLength(2);
        expect(hero.discard).toHaveLength(0);
    });
});

describe('card choice flow — modal wiring', () => {
    beforeEach(() => setLanguage('de'));
    afterEach(() => vi.useRealTimers());

    it('recognises the choice effects', () => {
        expect(needsCardChoice({ wish: 1 })).toBe(true);
        expect(needsCardChoice({ copyCard: 2 })).toBe(true);
        expect(needsCardChoice({ attack: 2 })).toBe(false);
    });

    it('opens three wish options and applies the picked one', () => {
        const hero = new HeroBuilder().build();
        const { game, logs, choices } = fakeGame(hero);

        resolveCardChoice(game, { card: cardOf('wish'), effect: { wish: 1 } });

        expect(choices).toHaveLength(1);
        expect(choices[0].options).toHaveLength(3);
        expect(choices[0].title).toBe('Wunsch');

        choices[0].options[1].action(); // +5 attack

        expect(hero.attackPoints).toBe(5);
        expect(logs.some((entry) => entry.message.includes('Angriff'))).toBe(true);
    });

    it('re-opens the wish modal while picks are left', () => {
        vi.useFakeTimers();
        const hero = new HeroBuilder().build();
        const { game, choices } = fakeGame(hero);

        openWishChoice(game, 2);
        expect(choices[0].description).toContain('2');

        choices[0].options[0].action(); // heal pick
        vi.advanceTimersByTime(1);

        expect(choices).toHaveLength(2); // second wish asked for
        expect(choices[1].options).toHaveLength(3);
    });

    it('offers the discard pile for Improvisation', () => {
        const hero = new HeroBuilder().withHand([]).build();
        hero.discard = [cardOf('rage', 'Rage'), cardOf('swiftness', 'Swiftness')];
        const { game, choices } = fakeGame(hero);

        openCopyChoice(game, 1);

        expect(choices[0].options).toHaveLength(2);
        expect(choices[0].options[0].label).toContain('Rage');

        choices[0].options[0].action();

        expect(hero.hand.map((c) => c.id)).toEqual(['rage']);
        expect(game.renderHand).toHaveBeenCalled();
    });

    it('reports an empty discard pile', () => {
        const hero = new HeroBuilder().withHand([]).build();
        hero.discard = [];
        const { game, logs, choices } = fakeGame(hero);

        openCopyChoice(game, 1);

        expect(choices).toHaveLength(0);
        expect(logs.some((entry) => entry.message.includes('leer'))).toBe(true);
    });

    it('falls back to the attack wish when there is no modal (headless)', () => {
        const hero = new HeroBuilder().build();
        const game = { hero, addLog: () => {}, renderHand: () => {}, updateStats: () => {}, ui: {} };

        const handled = resolveCardChoice(game, { card: cardOf('wish'), effect: { wish: 1 } });

        expect(handled).toBe(true);
        expect(hero.attackPoints).toBe(5);
    });

    it('is a no-op for cards that do not need a choice', () => {
        const hero = new HeroBuilder().build();
        const { game, choices } = fakeGame(hero);

        expect(resolveCardChoice(game, { card: cardOf('rage'), effect: { attack: 2 } })).toBe(false);
        expect(choices).toHaveLength(0);
    });

    it('asks in combat too (playCardInCombat wiring)', () => {
        const hero = new HeroBuilder().withDeck([]).build();
        hero.discard = [];
        const wishCard = new Card({
            id: 'wish',
            name: 'Wish',
            type: 'spell',
            color: 'blue',
            basicEffect: { type: 'wish', value: 1 }
        });
        hero.hand = [wishCard];

        const combat = new Combat(hero, []);
        combat.phase = COMBAT_PHASES.ATTACK;

        const choices = [];
        const game = {
            combat,
            hero,
            enemies: [],
            timeManager: { isNight: () => false },
            actionManager: { saveCheckpoint: vi.fn(), clearHistory: vi.fn() },
            ui: {
                elements: { playedCards: null },
                addPlayedCard: vi.fn(),
                showPlayArea: vi.fn(),
                updateCombatTotals: vi.fn(),
                showCardChoice: vi.fn((config) => choices.push(config))
            },
            addLog: vi.fn(),
            renderHand: vi.fn(),
            updateStats: vi.fn()
        };

        new CombatOrchestrator(game).playCardInCombat(0, wishCard, false);

        expect(choices).toHaveLength(1);
        expect(choices[0].options).toHaveLength(3);
    });
});
