/**
 * Intuition P2: path-within-movement, site primary CTA structure.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HexGridLogic } from '../js/hexgrid/HexGridLogic.js';
import { ModalManager } from '../js/ui/ModalManager.js';

describe('Intuition P2 — path within movement', () => {
    let grid;

    beforeEach(() => {
        grid = new HexGridLogic(40);
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                grid.setHex(q, r, { terrain: 'plains', revealed: true });
            }
        }
    });

    it('returns path and cost for adjacent plains (cost 2)', () => {
        const result = grid.getPathWithinMovement({ q: 0, r: 0 }, { q: 1, r: 0 }, 10, true, false);
        expect(result).toBeTruthy();
        expect(result.cost).toBe(2);
        expect(result.path).toEqual([{ q: 1, r: 0 }]);
    });

    it('returns multi-step path within budget', () => {
        const result = grid.getPathWithinMovement({ q: 0, r: 0 }, { q: 2, r: 0 }, 10, true, false);
        expect(result).toBeTruthy();
        expect(result.cost).toBe(4);
        expect(result.path.length).toBe(2);
        expect(result.path[result.path.length - 1]).toEqual({ q: 2, r: 0 });
    });

    it('returns null when out of budget', () => {
        const result = grid.getPathWithinMovement({ q: 0, r: 0 }, { q: 2, r: 0 }, 2, true, false);
        expect(result).toBeNull();
    });

    it('getReachableHexes still includes costs', () => {
        const reachable = grid.getReachableHexes({ q: 0, r: 0 }, 4, true, false);
        expect(reachable.length).toBeGreaterThan(0);
        expect(reachable.every((h) => typeof h.cost === 'number')).toBe(true);
    });
});

describe('Intuition P2 — site primary CTA', () => {
    it('renders recommended primary button and more section', () => {
        document.body.innerHTML = `<div id="site-options"></div>`;
        const elements = {
            siteOptions: document.getElementById('site-options'),
            siteModal: null
        };
        const ui = {
            game: { sound: { click: vi.fn() } },
            showNotification: vi.fn()
        };
        const mm = new ModalManager(elements, ui);

        mm.renderSiteOptions([
            {
                id: 'heal',
                label: 'Heilen',
                enabled: true,
                action: () => ({ success: true, message: 'ok' })
            },
            {
                id: 'recruit',
                label: 'Rekrutieren',
                enabled: true,
                action: () => ({ success: true, message: 'ok' })
            },
            {
                id: 'shop',
                label: 'Laden',
                subItems: [
                    {
                        type: 'card',
                        data: { name: 'Karte', color: 'red' },
                        cost: 2,
                        action: () => ({ success: true, message: 'bought' })
                    }
                ]
            }
        ]);

        const root = elements.siteOptions;
        expect(root.querySelector('.site-option-primary')).toBeTruthy();
        expect(root.querySelector('.site-primary-btn')?.textContent).toBe('Heilen');
        expect(root.querySelector('.site-options-more')).toBeTruthy();
        expect(root.querySelector('.site-options-more-summary')?.textContent).toMatch(/Weitere/);
    });

    it('opens more when only shop options (no simple primary)', () => {
        document.body.innerHTML = `<div id="site-options"></div>`;
        const elements = { siteOptions: document.getElementById('site-options') };
        const mm = new ModalManager(elements, { showNotification: vi.fn() });
        mm.renderSiteOptions([
            {
                id: 'shop',
                label: 'Einheiten',
                subItems: [{ type: 'unit', data: { name: 'U', icon: '👤', armor: 2 }, cost: 3, action: () => ({}) }]
            }
        ]);
        expect(elements.siteOptions.querySelector('.site-option-primary')).toBeFalsy();
        expect(elements.siteOptions.querySelector('.site-options-more')?.open).toBe(true);
    });
});
