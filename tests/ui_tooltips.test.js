import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { TooltipManager } from '../js/tooltip.js';
import { Card } from '../js/card.js';
import { createSpy } from './test-mocks.js';

describe('Tooltip Manager', () => {
    let tooltipManager;

    beforeEach(() => {
        document.body.innerHTML = '';
        tooltipManager = new TooltipManager();
    });

    it('should create tooltip element on initialization', () => {
        const tooltip = document.querySelector('.game-tooltip');
        expect(tooltip).toBeDefined();
        expect(tooltip.style.display).toBe('none');
    });

    it('should show tooltip with content', async () => {
        const element = document.createElement('div');
        // Mock getBoundingClientRect for positioning
        element.getBoundingClientRect = () => ({
            left: 100, top: 100, width: 50, height: 50, right: 150, bottom: 150
        });

        tooltipManager.showTooltip(element, '<div>Test Content</div>');

        const tooltip = document.querySelector('.game-tooltip');
        expect(tooltip.style.display).toBe('block');
        expect(tooltip.innerHTML).toBe('<div>Test Content</div>');
        expect(tooltipManager.currentTarget).toBe(element);
    });

    it('should hide tooltip', async () => {
        const element = document.createElement('div');
        element.getBoundingClientRect = () => ({
            left: 100, top: 100, width: 50, height: 50
        });

        tooltipManager.showTooltip(element, 'Content');
        expect(tooltipManager.currentTarget).toBe(element);

        tooltipManager.hideTooltip(0);

        // Wait for fade out timeout (200ms + buffer)
        await new Promise(resolve => setTimeout(resolve, 250));

        const tooltip = document.querySelector('.game-tooltip');
        expect(tooltip.style.display).toBe('none');
        expect(tooltipManager.currentTarget).toBe(null);
    });

    it('should generate correct card tooltip content', () => {
        const card = new Card({ id: 1, name: 'Test Card', type: 'action', color: 'red' });
        const element = document.createElement('div');
        element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });

        tooltipManager.showCardTooltip(element, card);

        const tooltip = document.querySelector('.game-tooltip');
        expect(tooltip.innerHTML).toContain('Test Card');
        expect(tooltip.innerHTML).toContain('Basis-Effekt');
        expect(tooltip.innerHTML).toContain('Seitlich spielen');
    });

    it('should generate correct terrain tooltip content', () => {
        const element = document.createElement('div');
        element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });

        tooltipManager.showTerrainTooltip(element, 'forest', {});

        const tooltip = document.querySelector('.game-tooltip');
        expect(tooltip.innerHTML).toContain('Wald');
        expect(tooltip.innerHTML).toContain('Bewegungskosten');
        expect(tooltip.innerHTML).toContain('3');
    });

    it('should generate correct enemy tooltip content', () => {
        const enemy = {
            name: 'Orc',
            armor: 3,
            attack: 4,
            fame: 2,
            fortified: false
        };
        const element = document.createElement('div');
        element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });

        tooltipManager.showEnemyTooltip(element, enemy);

        const tooltip = document.querySelector('.game-tooltip');
        expect(tooltip.innerHTML).toContain('Orc');
        expect(tooltip.innerHTML).toContain('Rüstung');
        expect(tooltip.innerHTML).toContain('3');
        expect(tooltip.innerHTML).toContain('Angriff');
        expect(tooltip.innerHTML).toContain('4');
    });
});
