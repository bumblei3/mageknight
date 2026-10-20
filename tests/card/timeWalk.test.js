/**
 * Time Walk (`extra_turn`): a card that grants additional turns. It used to be
 * declared in the data and listed as "noch nicht implementiert".
 *
 * Semantics in this implementation: an extra turn refreshes the hand and the
 * mana source like a normal turn end, but does NOT advance the turn counter —
 * so the day/night cycle (every 6 turns) waits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeroBuilder } from '../test-helpers.js';
import { Card } from '../../js/card/CardFactory.js';
import { SAMPLE_SPELLS } from '../../js/card/CardDefinitions.js';
import { TurnManager } from '../../js/turnManager.js';
import { setLanguage } from '../../js/i18n/index.js';

const timeWalkDefinition = () => SAMPLE_SPELLS.find((card) => card.id === 'time_walk');

function makeGame(hero, overrides = {}) {
    return {
        gameState: 'playing',
        hero,
        manaSource: { recharge: vi.fn() },
        addLog: vi.fn(),
        showToast: vi.fn(),
        timeManager: {
            advanceTime: vi.fn().mockReturnValue('night'),
            getTimeOfDay: vi.fn().mockReturnValue('night')
        },
        phaseManager: { updateTimeUI: vi.fn() },
        updateStats: vi.fn(),
        renderHand: vi.fn(),
        renderMana: vi.fn(),
        updatePhaseIndicator: vi.fn(),
        stateManager: { saveGame: vi.fn() },
        ...overrides
    };
}

describe('Time Walk — the card grants extra turns', () => {
    beforeEach(() => setLanguage('de'));

    it('adds one extra turn for the basic effect', () => {
        const card = new Card(timeWalkDefinition());
        const hero = new HeroBuilder().withHand([card]).withDeck([]).build();
        hero.discard = [];

        hero.playCard(0, false);

        expect(hero.extraTurns).toBe(1);
        expect(card.getEffect(false).extraTurn).toBe(1);
    });

    it('adds two extra turns for the strong effect', () => {
        const card = new Card(timeWalkDefinition());
        const hero = new HeroBuilder().withHand([card]).withDeck([]).build();
        hero.discard = [];
        hero.addMana('gold'); // gold pays for any colour

        hero.playCard(0, true);

        expect(hero.extraTurns).toBe(2);
    });

    it('stacks when several Time Walks are played', () => {
        const hero = new HeroBuilder().withHand([new Card(timeWalkDefinition())]).withDeck([]).build();
        hero.discard = [];

        hero.playCard(0, false);
        hero.extraTurns += 0; // keep the assertion explicit about the first grant
        hero.hand.push(new Card(timeWalkDefinition()));
        hero.playCard(0, false);

        expect(hero.extraTurns).toBe(2);
    });

    it('consumes one turn at a time', () => {
        const hero = new HeroBuilder().build();
        hero.extraTurns = 2;

        expect(hero.consumeExtraTurn()).toBe(true);
        expect(hero.extraTurns).toBe(1);
        expect(hero.consumeExtraTurn()).toBe(true);
        expect(hero.consumeExtraTurn()).toBe(false);
        expect(hero.extraTurns).toBe(0);
    });
});

describe('TurnManager — an extra turn does not advance the round', () => {
    beforeEach(() => setLanguage('de'));

    it('keeps the turn counter while refreshing hand and mana', async () => {
        const hero = new HeroBuilder().build();
        hero.extraTurns = 1;
        hero.movementPoints = 4;
        const game = makeGame(hero);
        const turnManager = new TurnManager(game);

        await turnManager.endTurn();

        expect(turnManager.turnNumber).toBe(0);
        expect(hero.extraTurns).toBe(0);
        expect(hero.movementPoints).toBe(0);
        expect(game.manaSource.recharge).toHaveBeenCalled();
        expect(game.addLog).toHaveBeenCalledWith(expect.stringContaining('zusätzlicher Zug'), 'warning');
    });

    it('advances normally once the extra turns are spent', async () => {
        const hero = new HeroBuilder().build();
        hero.extraTurns = 1;
        const game = makeGame(hero);
        const turnManager = new TurnManager(game);

        await turnManager.endTurn(); // extra turn
        await turnManager.endTurn(); // regular turn

        expect(turnManager.turnNumber).toBe(1);
    });

    it('does not advance the day/night cycle on an extra turn', async () => {
        const hero = new HeroBuilder().build();
        hero.extraTurns = 1;
        const game = makeGame(hero);
        const turnManager = new TurnManager(game);
        turnManager.turnNumber = 5; // the next regular turn ends the round

        await turnManager.endTurn();

        expect(game.timeManager.advanceTime).not.toHaveBeenCalled();
        expect(turnManager.turnNumber).toBe(5);

        await turnManager.endTurn();

        expect(turnManager.turnNumber).toBe(6);
        expect(game.timeManager.advanceTime).toHaveBeenCalledTimes(1);
    });

    it('works when the hero cannot report extra turns (old saves)', async () => {
        const hero = new HeroBuilder().build();
        delete hero.consumeExtraTurn;
        const game = makeGame(hero);
        const turnManager = new TurnManager(game);

        await turnManager.endTurn();

        expect(turnManager.turnNumber).toBe(1);
    });
});
