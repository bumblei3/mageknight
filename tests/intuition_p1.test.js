/**
 * Intuition P1: Smart End Turn + Coach actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getEndTurnWarnings,
    buildEndTurnConfirmMessage,
    confirmEndTurnIfNeeded
} from '../js/ui/endTurnGuard.js';
import { ActionBarManager } from '../js/ui/ActionBarManager.js';
import { COMBAT_PHASES } from '../js/constants.js';

describe('Intuition P1 — Smart End Turn', () => {
    it('warns about leftover movement points', () => {
        const game = {
            hero: { movementPoints: 3, hand: [], wounds: 0, healingPoints: 0, position: { q: 0, r: 0 } },
            hexGrid: { getHex: () => ({}) }
        };
        const w = getEndTurnWarnings(game);
        expect(w.some((x) => x.id === 'mp')).toBe(true);
    });

    it('warns about heal + wounds', () => {
        const game = {
            hero: { movementPoints: 0, hand: [], wounds: 2, healingPoints: 1, position: { q: 0, r: 0 } },
            hexGrid: { getHex: () => ({}) }
        };
        expect(getEndTurnWarnings(game).some((x) => x.id === 'heal')).toBe(true);
    });

    it('warns about site under hero', () => {
        const game = {
            hero: { movementPoints: 0, hand: [], wounds: 0, healingPoints: 0, position: { q: 1, r: 1 } },
            hexGrid: { getHex: () => ({ site: { type: 'village' } }) }
        };
        expect(getEndTurnWarnings(game).some((x) => x.id === 'site')).toBe(true);
    });

    it('warns about movement cards when stranded', () => {
        const game = {
            hero: {
                movementPoints: 0,
                hand: [{ basicEffect: { movement: 2 }, strongEffect: {}, isWound: () => false }],
                wounds: 0,
                healingPoints: 0,
                position: { q: 0, r: 0 }
            },
            hexGrid: { getHex: () => ({}) }
        };
        expect(getEndTurnWarnings(game).some((x) => x.id === 'moveCards')).toBe(true);
    });

    it('returns no warnings when clean', () => {
        const game = {
            hero: { movementPoints: 0, hand: [], wounds: 0, healingPoints: 0, position: { q: 0, r: 0 } },
            hexGrid: { getHex: () => ({}) }
        };
        expect(getEndTurnWarnings(game)).toEqual([]);
        expect(buildEndTurnConfirmMessage(game)).toBeNull();
    });

    it('skips warnings during combat', () => {
        const game = {
            combat: {},
            hero: { movementPoints: 5, hand: [], wounds: 0, healingPoints: 0 }
        };
        expect(getEndTurnWarnings(game)).toEqual([]);
    });

    it('confirmEndTurnIfNeeded respects window.confirm', () => {
        const game = {
            hero: { movementPoints: 2, hand: [], wounds: 0, healingPoints: 0, position: { q: 0, r: 0 } },
            hexGrid: { getHex: () => ({}) }
        };
        const spy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        expect(confirmEndTurnIfNeeded(game)).toBe(false);
        spy.mockReturnValue(true);
        expect(confirmEndTurnIfNeeded(game)).toBe(true);
        spy.mockRestore();
    });
});

describe('Intuition P1 — Coach click actions', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="action-bar-content"></div>
            <div id="action-bar-hint"></div>
            <div id="coach-strip"></div>
            <div id="combat-phase-stepper"></div>
            <div id="hand-cards">
                <div class="mk-card"></div>
                <div class="mk-card"></div>
            </div>
            <button id="action-bar-end-turn"></button>
        `;
    });

    function makeManager(gameOverrides = {}) {
        const game = {
            combat: null,
            movementMode: false,
            hero: {
                movementPoints: 0,
                hand: [
                    { basicEffect: { block: 2 }, strongEffect: {}, isWound: () => false },
                    { basicEffect: { attack: 3 }, strongEffect: {}, isWound: () => false }
                ],
                wounds: 0,
                healingPoints: 0,
                position: { q: 0, r: 0 }
            },
            hexGrid: { getHex: () => ({}) },
            combatOrchestrator: {
                endRangedPhase: vi.fn(),
                endBlockPhase: vi.fn(),
                executeAttackAction: vi.fn()
            },
            actionManager: { enterMovementMode: vi.fn() },
            ...gameOverrides
        };
        const mgr = new ActionBarManager(game);
        return { mgr, game };
    }

    it('block coach action highlights block cards', () => {
        const { mgr, game } = makeManager({
            combat: {
                phase: COMBAT_PHASES.BLOCK,
                enemies: [{ id: 'e1', attack: 4, getBlockRequirement: () => 4 }],
                blockedEnemies: new Set(),
                getPredictedOutcome: () => ({ expectedWounds: 2, enemiesDefeated: [] })
            },
            combatOrchestrator: {
                combatBlockTotal: 0,
                combatAttackTotal: 0,
                endRangedPhase: vi.fn(),
                endBlockPhase: vi.fn(),
                executeAttackAction: vi.fn()
            }
        });
        const msg = mgr.getCoachMessage();
        expect(msg.action).toBe('highlight-cards-block');
        mgr.lastCoachAction = msg.action;
        mgr.handleCoachClick();
        const pulsed = document.querySelectorAll('.mk-card--coach-pulse');
        expect(pulsed.length).toBeGreaterThanOrEqual(1);
        void game;
    });

    it('ranged without cards suggests advance-ranged', () => {
        const { mgr } = makeManager({
            combat: {
                phase: COMBAT_PHASES.RANGED,
                enemies: [{ fortified: false }],
                blockedEnemies: new Set()
            },
            hero: {
                movementPoints: 0,
                hand: [{ basicEffect: { attack: 2 }, strongEffect: {}, isWound: () => false }],
                wounds: 0,
                healingPoints: 0
            }
        });
        expect(mgr.getCoachMessage().action).toBe('advance-ranged');
    });

    it('end-turn coach action pulses end turn button', () => {
        const { mgr } = makeManager({
            hero: {
                movementPoints: 0,
                hand: [],
                wounds: 0,
                healingPoints: 0,
                position: { q: 0, r: 0 }
            }
        });
        const msg = mgr.getCoachMessage();
        expect(msg.action).toBe('highlight-end-turn');
        mgr.lastCoachAction = msg.action;
        mgr.handleCoachClick();
        expect(document.getElementById('action-bar-end-turn')?.classList.contains('coach-target-pulse')).toBe(
            true
        );
    });
});
