
import { describe, it, expect, beforeEach } from './testRunner.js';
import TooltipManager from '../js/tooltip.js';
import { setupGlobalMocks, resetMocks, setupStandardGameDOM, createMockElement } from './test-mocks.js';

setupGlobalMocks();

describe('TooltipManager Extended Coverage', () => {
    let tooltipManager;

    beforeEach(() => {
        setupStandardGameDOM();
        resetMocks();
        tooltipManager = new TooltipManager();
    });

    describe('initialization', () => {
        it('should create tooltip element', () => {
            expect(tooltipManager.tooltip).toBeDefined();
        });
    });

    describe('showTooltip', () => {
        it('should show tooltip with content', () => {
            const element = createMockElement('div');
            tooltipManager.showTooltip(element, '<div>Test</div>');
            expect(tooltipManager.tooltip.style.display).not.toBe('none');
        });
    });

    describe('hideTooltip', () => {
        it('should hide tooltip', () => {
            tooltipManager.hideTooltip(0);
            // Should not throw
        });
    });

    describe('createCardTooltipHTML', () => {
        it('should create HTML for card', () => {
            const card = { name: 'Test Card', type: 'action', color: 'red' };
            const html = tooltipManager.createCardTooltipHTML(card);
            expect(html).toContain('Test Card');
        });
    });

    describe('createTerrainTooltipHTML', () => {
        it('should create HTML for terrain', () => {
            const terrainData = { name: 'Plains', cost: 2 };
            const html = tooltipManager.createTerrainTooltipHTML('plains', terrainData);
            expect(html).toContain('Plains');
        });
    });

    describe('createEnemyTooltipHTML', () => {
        it('should create HTML for enemy', () => {
            const enemy = {
                name: 'Orc',
                armor: 3,
                attack: 4,
                getEffectiveArmor: () => 3,
                getEffectiveAttack: () => 4,
                abilities: []
            };
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            expect(html).toContain('Orc');
        });
    });

    describe('createStatTooltipHTML', () => {
        it('should create HTML for stat', () => {
            const html = tooltipManager.createStatTooltipHTML('fame', 'Experience points');
            expect(html).toContain('fame');
        });
    });

    describe('createSiteTooltipHTML', () => {
        it('should create HTML for site', () => {
            const site = {
                name: 'Village',
                type: 'village',
                icon: '🏘️',
                actions: ['recruit', 'heal']
            };
            const html = tooltipManager.createSiteTooltipHTML(site);
            expect(html).toContain('Village');
        });
    });

    describe('getColorIcon', () => {
        it('should return icon for red', () => {
            const icon = tooltipManager.getColorIcon('red');
            expect(icon.length).toBeGreaterThan(0);
        });

        it('should return icon for blue', () => {
            const icon = tooltipManager.getColorIcon('blue');
            expect(icon.length).toBeGreaterThan(0);
        });
    });
});
