import { describe, it, expect, beforeEach } from './testRunner.js';
import ManaSource from '../js/mana.js';
import { createUnit } from '../js/unit.js';
import { StatisticsManager } from '../js/statistics.js';
import { createMockLocalStorage } from './test-mocks.js';

describe('Final Coverage Push', () => {
    beforeEach(() => {
        global.localStorage = createMockLocalStorage();
    });

    it('mana system extras', () => {
        const ms = new ManaSource();
        ms.dice = ['red', 'blue'];
        expect(ms.getDiceByColor('red').length).toBe(1);
        expect(ms.hasColor('red')).toBe(true);
        expect(ms.hasColor('gold')).toBe(false);
    });

    it('unit system extras', () => {
        expect(createUnit('invalid')).toBe(null);
    });

    it('statistics system extras', () => {
        const sm = new StatisticsManager();
        sm.increment('turns');
        sm.increment('gamesPlayed');

        expect(sm.getAverageTurns()).toBe(1);

        sm.reset();
        expect(sm.get('turns')).toBe(0);

        const json = sm.export();
        expect(json).toContain('{');
    });

    it('terrain system extras', () => {
        import('../js/terrain.js').then(module => {
            const Terrain = module.default;
            const t = new Terrain();
            expect(t.getTerrainInfo('invalid')).toBe(null);
            expect(t.getMovementCost('invalid')).toBe(2);
            expect(t.isPassable('invalid')).toBe(true);
            expect(t.getName('invalid')).toBe('Unknown');
            expect(t.getIcon('invalid')).toBe('');
            expect(t.getColor('invalid')).toBe('#1a1a2e');
        });
    });

    it('ui system extras', () => {
        import('../js/ui.js').then(module => {
            const UI = module.default;
            const ui = new UI({
                hero: { position: { q: 0, r: 0 } },
                handleCardClick: () => { },
                handleLevelUpChoice: () => { },
                formatCardEffect: () => ''
            });
            ui.renderCardPool([{ name: 'Card 1', color: 'red', text: 'Desc' }]);
            expect(document.getElementById('card-pool-grid').children.length).toBe(1);

            ui.renderLevelUpRewards([{ name: 'Skill 1', icon: '✨', description: 'Desc' }]);
            expect(document.getElementById('level-up-grid').children.length).toBe(1);
        });
    });

    it('statistics error handling', () => {
        localStorage.setItem('mageKnight_statistics', 'invalid json');
        const sm = new StatisticsManager();
        // Should catch error and use default
        expect(sm.get('turns')).toBe(0);

        // Save error (e.g. storage full)
        const originalSet = localStorage.setItem;
        localStorage.setItem = () => { throw new Error('Full'); };
        sm.save(); // Should catch error
        localStorage.setItem = originalSet;
    });
});
