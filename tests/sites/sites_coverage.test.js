import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Site, SITE_TYPES, SITE_INFO } from '../../js/sites.js';

describe('Site - Coverage Boost', () => {
    describe('Site class', () => {
        it('should create site with correct properties for each type', () => {
            // Test all site types have correct SITE_INFO mapping
            for (const type of Object.values(SITE_TYPES)) {
                const site = new Site(type);
                
                expect(site.type).toBe(type);
                expect(site.name).toBe(SITE_INFO[type]?.name || type);
                expect(site.icon).toBe(SITE_INFO[type]?.icon || '?');
                expect(site.color).toBe(SITE_INFO[type]?.color || '#888');
                expect(site.conquered).toBe(false);
            }
        });

        it('should handle unknown type gracefully', () => {
            const site = new Site('unknown_type');
            
            expect(site.type).toBe('unknown_type');
            expect(site.name).toBe('unknown_type');
            expect(site.icon).toBe('?');
            expect(site.color).toBe('#888');
        });

        it('should return name from getName', () => {
            const site = new Site(SITE_TYPES.VILLAGE);
            
            expect(site.getName()).toBe('Dorf');
        });

        it('should return icon from getIcon', () => {
            const site = new Site(SITE_TYPES.KEEP);
            
            expect(site.getIcon()).toBe('🏰');
        });

        it('should return false for isConquered initially', () => {
            const site = new Site(SITE_TYPES.VILLAGE);
            
            expect(site.isConquered()).toBe(false);
        });

        it('should return true for isConquered after conquer', () => {
            const site = new Site(SITE_TYPES.VILLAGE);
            
            site.conquer();
            
            expect(site.conquered).toBe(true);
            expect(site.isConquered()).toBe(true);
        });

        it('should have conquered property initially false', () => {
            const site = new Site(SITE_TYPES.CITY);
            
            expect(site.conquered).toBe(false);
        });
    });

    describe('SITE_TYPES enum', () => {
        it('should have all expected site types', () => {
            expect(SITE_TYPES.VILLAGE).toBe('village');
            expect(SITE_TYPES.KEEP).toBe('keep');
            expect(SITE_TYPES.MAGE_TOWER).toBe('mage_tower');
            expect(SITE_TYPES.MONASTERY).toBe('monastery');
            expect(SITE_TYPES.CITY_BLUE).toBe('city_blue');
            expect(SITE_TYPES.CITY_RED).toBe('city_red');
            expect(SITE_TYPES.CITY_GREEN).toBe('city_green');
            expect(SITE_TYPES.CITY_WHITE).toBe('city_white');
            expect(SITE_TYPES.RUINS).toBe('ruins');
            expect(SITE_TYPES.DUNGEON).toBe('dungeon');
            expect(SITE_TYPES.TOMB).toBe('tomb');
            expect(SITE_TYPES.SPAWNING_GROUNDS).toBe('spawning_grounds');
            expect(SITE_TYPES.LABYRINTH).toBe('labyrinth');
            expect(SITE_TYPES.MINE).toBe('mine');
            // magic_glade + den were dead content — removed (Gap C fix).
            expect(SITE_TYPES['magic_glade']).toBeUndefined();
            expect(SITE_TYPES['den']).toBeUndefined();
            expect(SITE_TYPES.CITY).toBe('city');
        });
    });

    describe('SITE_INFO mapping', () => {
        it('should have name, icon, color for each site type that has SITE_INFO entry', () => {
            const typesWithInfo = Object.values(SITE_TYPES).filter(type => SITE_INFO[type]);
            for (const type of typesWithInfo) {
                expect(SITE_INFO[type]).toBeDefined();
                expect(SITE_INFO[type].name).toBeDefined();
                expect(SITE_INFO[type].icon).toBeDefined();
                expect(SITE_INFO[type].color).toBeDefined();
            }
        });

        it('should have specific correct values for key types', () => {
            expect(SITE_INFO[SITE_TYPES.VILLAGE].name).toBe('Dorf');
            expect(SITE_INFO[SITE_TYPES.VILLAGE].icon).toBe('🏠');
            expect(SITE_INFO[SITE_TYPES.VILLAGE].color).toBe('#fbbf24');

            expect(SITE_INFO[SITE_TYPES.KEEP].name).toBe('Burg');
            expect(SITE_INFO[SITE_TYPES.KEEP].icon).toBe('🏰');

            expect(SITE_INFO[SITE_TYPES.SPAWNING_GROUNDS].name).toBe('Brutstätte');
            expect(SITE_INFO[SITE_TYPES.LABYRINTH].name).toBe('Labyrinth');
        });
    });
});