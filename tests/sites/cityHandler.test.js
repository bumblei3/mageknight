/**
 * CityHandler behavioral tests (foundation hardening, final core-module round).
 * CityHandler.getOptions builds heal / recruit-elite / spell options. The only
 * uncovered branch is the `units.length > 0 ? recruit-subItems : 'none'` ternary.
 * We cover BOTH sides plus the static option structure.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CityHandler } from '../../js/sites/CityHandler';
import * as unitMod from '../../js/unit';

function makeGame() {
    return {
        hero: {
            wounds: [], // no wounds by default -> heal option disabled
            influencePoints: 10
        },
        addLog: vi.fn(),
        updateStats: vi.fn()
    };
}

describe('CityHandler — getOptions structure', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeGame();
        handler = new CityHandler(game);
    });

    it('returns heal, recruit_elite, and city_spells option groups', () => {
        const opts = handler.getOptions({});
        const ids = opts.map((o) => o.id);
        expect(ids).toContain('heal');
        expect(ids).toContain('recruit_elite');
        expect(ids).toContain('city_spells');
    });

    it('disables heal when the hero has no wounds', () => {
        const opts = handler.getOptions({});
        const heal = opts.find((o) => o.id === 'heal');
        expect(heal.enabled).toBe(false);
    });

    it('enables heal when the hero has at least one wound', () => {
        game.hero.wounds = [{ id: 'w1' }];
        const opts = handler.getOptions({});
        const heal = opts.find((o) => o.id === 'heal');
        expect(heal.enabled).toBe(true);
    });

    it('spell group always lists SAMPLE_SPELLS as buyable sub-items', () => {
        const opts = handler.getOptions({});
        const spells = opts.find((o) => o.id === 'city_spells');
        expect(Array.isArray(spells.subItems)).toBe(true);
        expect(spells.subItems.length).toBeGreaterThan(0);
        // Each spell sub-item wires a buyCard action at cost 8
        const first = spells.subItems[0];
        expect(first.cost).toBe(8);
        expect(typeof first.action).toBe('function');
    });
});

describe('CityHandler — recruit-elite branch coverage', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeGame();
        handler = new CityHandler(game);
    });

    it('lists real units as recruit sub-items when units exist', () => {
        vi.spyOn(unitMod, 'getUnitsForLocation').mockReturnValue([
            { type: 'guard', name: 'Stadtwache', cost: 5 },
            { type: 'cannon', name: 'Kanone', cost: 7 }
        ]);
        const opts = handler.getOptions({});
        const recruit = opts.find((o) => o.id === 'recruit_elite');
        expect(recruit.subItems).toHaveLength(2);
        expect(recruit.subItems[0].id).toBe('recruit_guard');
        expect(recruit.subItems[0].label).toBe('Stadtwache');
        expect(typeof recruit.subItems[0].action).toBe('function');
        // Invoking the action delegates to recruitUnit (no throw with minimal mock)
        expect(() => recruit.subItems[0].action()).not.toThrow();
    });

    it('shows a disabled "none" placeholder when no units are available', () => {
        vi.spyOn(unitMod, 'getUnitsForLocation').mockReturnValue([]);
        const opts = handler.getOptions({});
        const recruit = opts.find((o) => o.id === 'recruit_elite');
        expect(recruit.subItems).toHaveLength(1);
        expect(recruit.subItems[0].id).toBe('none');
        expect(recruit.subItems[0].enabled).toBe(false);
        expect(recruit.subItems[0].label).toBe('Keine Einheiten verfügbar');
    });
});
