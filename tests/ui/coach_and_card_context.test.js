/**
 * Coach strip prioritization + hand card combat context
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionBarManager } from '../../js/ui/ActionBarManager.ts';
import { HandRenderer } from '../../js/ui/HandRenderer.ts';
import { COMBAT_PHASES } from '../../js/constants.ts';

function makeGame(overrides = {}) {
    return {
        movementMode: false,
        combat: null,
        canEndTurn: true,
        canRest: true,
        hero: {
            hand: [
                { name: 'Move', color: 'green', basicEffect: { movement: 2 }, isWound: () => false },
                { name: 'Block', color: 'blue', basicEffect: { block: 3 }, isWound: () => false },
                { name: 'Attack', color: 'red', basicEffect: { attack: 2 }, isWound: () => false },
                { name: 'Wound', color: null, basicEffect: {}, isWound: () => true }
            ],
            wounds: 0,
            healingPoints: 0,
            movementPoints: 0,
            position: { q: 0, r: 0 }
        },
        hexGrid: { getHex: () => null },
        manaPool: [],
        timeManager: { isNight: () => false },
        ...overrides
    };
}

describe('ActionBarManager coach', () => {
    beforeEach(() => {
        document.body.innerHTML = `
          <div id="coach-strip"></div>
          <div id="combat-phase-stepper" hidden></div>
          <div id="action-bar-content"></div>
          <div id="action-bar-hint"></div>
        `;
    });

    it('prioritizes combat block coach and shows phase stepper', () => {
        const game = makeGame({
            combat: { phase: COMBAT_PHASES.BLOCK }
        });
        const bar = new ActionBarManager(game);
        bar.render();

        const coach = document.getElementById('coach-strip');
        expect(coach?.textContent).toMatch(/Block/i);
        expect(coach?.className).toMatch(/coach-strip--combat/);

        const stepper = document.getElementById('combat-phase-stepper');
        expect(stepper?.hidden).toBe(false);
        expect(stepper?.querySelector('.combat-step--current')).toBeTruthy();
    });

    it('normalizes uppercase combat phases for action buttons', () => {
        const game = makeGame({
            combat: { phase: 'BLOCK' }
        });
        const bar = new ActionBarManager(game);
        expect(bar.combatPhase()).toBe('block');
        bar.render();
        const content = document.getElementById('action-bar-content');
        expect(content?.textContent).toMatch(/Block/i);
    });

    it('coaches movement when MP available outside combat', () => {
        const game = makeGame({
            hero: {
                ...makeGame().hero,
                movementPoints: 3
            }
        });
        const bar = new ActionBarManager(game);
        const msg = bar.getCoachMessage();
        expect(msg.text).toMatch(/3/);
        expect(msg.icon).toBe('👣');
    });

    it('coaches play cards when no MP and playable hand', () => {
        const game = makeGame();
        const bar = new ActionBarManager(game);
        const msg = bar.getCoachMessage();
        expect(msg.icon).toBe('🎴');
    });
});

describe('HandRenderer card context', () => {
    it('marks block cards relevant in block phase and dims others', () => {
        const elements = { handCards: document.createElement('div') };
        document.body.appendChild(elements.handCards);
        const game = makeGame({ combat: { phase: COMBAT_PHASES.BLOCK } });
        const hr = new HandRenderer(elements, { hideTooltip: vi.fn(), showCardTooltip: vi.fn() }, { game });

        const block = game.hero.hand[1];
        const attack = game.hero.hand[2];
        const wound = game.hero.hand[3];

        expect(hr.assessCardContext(block, game)).toMatchObject({ relevant: true, dimmed: false });
        expect(hr.assessCardContext(attack, game)).toMatchObject({ relevant: false, dimmed: true });
        expect(hr.assessCardContext(wound, game)).toMatchObject({ disabled: true });
    });

    it('highlights movement when exploration and 0 MP', () => {
        const elements = { handCards: document.createElement('div') };
        const game = makeGame();
        const hr = new HandRenderer(elements, { hideTooltip: vi.fn(), showCardTooltip: vi.fn() }, { game });
        const move = game.hero.hand[0];
        expect(hr.assessCardContext(move, game).relevant).toBe(true);
    });
});
