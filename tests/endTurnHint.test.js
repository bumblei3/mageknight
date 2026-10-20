/**
 * Intuition P3: Smart End Turn warnings surfaced in the action bar
 * (renderEndTurnHint) — the game computed the "are you sure?" warnings
 * but never surfaced them to the player.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ActionBarManager } from '../js/ui/ActionBarManager.js';
import { setLanguage } from '../js/i18n/index.js';

describe('Intuition P3 — End Turn hint', () => {
    let container;
    let hintContainer;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <div id="action-bar-content"></div>
            <div id="action-bar-hint"></div>
        `;
        container = document.getElementById('action-bar-content');
        hintContainer = document.getElementById('action-bar-hint');
    });

    function makeManager(game) {
        return new ActionBarManager(game);
    }

    function gameWith(overrides = {}) {
        return {
            hero: {
                movementPoints: 2,
                wounds: 1,
                healingPoints: 1,
                hand: [],
                position: { q: 0, r: 0 },
            },
            hexGrid: {
                getHex: () => ({ site: { type: 'village' } }),
            },
            combat: null,
            gameState: 'playing',
            ...overrides,
        };
    }

    it('renders warnings when movement points are left', () => {
        const mgr = makeManager(gameWith());
        mgr.render();
        const hint = hintContainer.innerHTML;
        expect(hint).toContain('Bewegungspunkte');
        expect(hint).toContain('Heilung verfügbar');
        expect(hint).toContain('noch besuchen');
    });

    it('hides the hint when there are no warnings', () => {
        const mgr = makeManager(gameWith({
            hero: { movementPoints: 0, wounds: 1, healingPoints: 0, hand: [], position: { q: 0, r: 0 } },
            hexGrid: { getHex: () => null },
        }));
        mgr.render();
        expect(hintContainer.innerHTML).toBe('');
    });

    it('clears the hint when dismissed', () => {
        const mgr = makeManager(gameWith());
        mgr.render();
        const btn = hintContainer.querySelector('[data-endturn-dismiss]');
        btn.click();
        expect(hintContainer.innerHTML).toBe('');
    });

    it('does not show the end-turn hint during combat', () => {
        const mgr = makeManager(gameWith({ combat: { phase: 'BLOCK' } }));
        mgr.render();
        expect(hintContainer.querySelector('.action-bar-hint--endturn')).toBeNull();
    });
});
