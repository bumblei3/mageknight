/**
 * sites.ts - Coverage Boost
 * Targets js/sites.ts (was ~50% branch / 86% lines).
 * Covers Site construction (known + unknown types), getters, conquer flag, and getInfo.
 */

import { describe, it, expect } from 'vitest';
import { Site, SITE_TYPES, SITE_INFO } from '../../js/sites.js';

describe('sites.ts - Coverage Boost', () => {
    describe('SITE_TYPES / SITE_INFO constants', () => {
        it('exposes all expected site type keys', () => {
            expect(SITE_TYPES.VILLAGE).toBe('village');
            expect(SITE_TYPES.MAGE_TOWER).toBe('mage_tower');
            expect(SITE_TYPES.SPAWNING_GROUNDS).toBe('spawning_grounds');
            expect(SITE_TYPES.LABYRINTH).toBe('labyrinth');
            expect(Object.keys(SITE_TYPES).length).toBeGreaterThanOrEqual(17);
        });

        it('has metadata for every site type that has an info entry', () => {
            for (const type of Object.values(SITE_TYPES)) {
                const info = SITE_INFO[type];
                if (!info) continue; // e.g. generic 'city' uses the colored city_* entries
                expect(info.name).toBeTruthy();
                expect(info.icon).toBeTruthy();
                expect(info.color).toBeTruthy();
            }
        });

        it('documents that the generic CITY type has no direct SITE_INFO entry', () => {
            expect(SITE_INFO[SITE_TYPES.CITY]).toBeUndefined();
        });
    });

    describe('Site construction', () => {
        it('resolves metadata for a known type', () => {
            const site = new Site(SITE_TYPES.DUNGEON);
            expect(site.type).toBe('dungeon');
            expect(site.name).toBe('Dungeon');
            expect(site.icon).toBe('dungeon');
            expect(site.color).toBe('#374151');
            expect(site.conquered).toBe(false);
            expect(site.visited).toBe(false);
        });

        it('falls back to generic metadata for an unknown type', () => {
            const site = new Site('totally_unknown_type');
            expect(site.type).toBe('totally_unknown_type');
            expect(site.name).toBe('totally_unknown_type');
            expect(site.icon).toBe('?');
            expect(site.color).toBe('#888');
        });
    });

    describe('getters and flags', () => {
        it('getName / getIcon return stored values', () => {
            const site = new Site(SITE_TYPES.TOMB);
            expect(site.getName()).toBe('Grabmal');
            expect(site.getIcon()).toBe('tomb');
        });

        it('isConquered reflects the conquered flag', () => {
            const site = new Site(SITE_TYPES.KEEP);
            expect(site.isConquered()).toBe(false);
            site.conquer();
            expect(site.isConquered()).toBe(true);
        });

        it('conquer sets the flag to true', () => {
            const site = new Site(SITE_TYPES.VILLAGE);
            site.conquer();
            expect(site.conquered).toBe(true);
        });
    });

    describe('getInfo', () => {
        it('returns metadata for a known site', () => {
            const site = new Site(SITE_TYPES.MONASTERY);
            const info = site.getInfo();
            expect(info.name).toBe('Kloster');
            expect(info.icon).toBe('⛪');
            expect(info.color).toBe('#f87171');
            expect(info.description).toBe('A kloster');
            expect(info.actions).toEqual([]);
        });

        it('falls back for an unknown site type', () => {
            const site = new Site('weird_x');
            const info = site.getInfo();
            expect(info.name).toBe('weird_x');
            expect(info.icon).toBe('?');
            expect(info.color).toBe('#888');
        });
    });
});
