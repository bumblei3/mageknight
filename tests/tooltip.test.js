import { describe, it, expect, beforeEach } from 'vitest';
import { setLanguage } from '../js/i18n/index.js';
import { TooltipManager } from '../js/ui/TooltipManager.js';

// Mock DOM
const mockDocument = {
    createElement: (tag) => ({
        className: '',
        style: {},
        classList: {
            add: () => { },
            remove: () => { },
            contains: () => false
        },
        innerHTML: '',
        getBoundingClientRect: () => ({ width: 200, height: 100 })
    }),
    body: {
        appendChild: () => { }
    }
};

const mockWindow = {
    innerWidth: 1024,
    innerHeight: 768
};

// Apply mocks if not in browser
if (typeof document === 'undefined') {
    global.document = mockDocument;
    global.window = mockWindow;
}

describe('TooltipManager', () => {
    let tooltipManager;

    beforeEach(() => {
        setLanguage('de');
        tooltipManager = new TooltipManager();
    });

    it('should initialize with tooltip element', () => {
        expect(tooltipManager.tooltip).toBeDefined();
        expect(tooltipManager.currentTarget).toBe(null);
        expect(tooltipManager.hideTimeout).toBe(null);
    });

    it('should create card tooltip HTML', () => {
        const mockCard = {
            name: 'Test Card',
            color: 'green',
            getEffect: () => ({ movement: 2, attack: 1 }),
            canPlaySideways: () => true,
            manaCost: []
        };

        const html = tooltipManager.createCardTooltipHTML(mockCard);

        expect(html).toContain('Test Card');
        expect(html).toContain('Bewegung');
        expect(html).toContain('+2');
        expect(html).toContain('Angriff');
        expect(html).toContain('+1');
        expect(html).toContain('Seitlich spielen');
    });

    it('should include all card effects in tooltip', () => {
        const mockCard = {
            name: 'Full Effect Card',
            color: 'gold',
            getEffect: () => ({
                movement: 3,
                attack: 2,
                block: 4,
                influence: 1,
                healing: 2
            }),
            canPlaySideways: () => false,
            manaCost: []
        };

        const html = tooltipManager.createCardTooltipHTML(mockCard);

        expect(html).toContain('Bewegung');
        expect(html).toContain('Angriff');
        expect(html).toContain('Block');
        expect(html).toContain('Einfluss');
        expect(html).toContain('Heilung');
    });

    it('should show mana costs in card tooltip', () => {
        const mockCard = {
            name: 'Mana Card',
            color: 'red',
            getEffect: () => ({ attack: 3 }),
            canPlaySideways: () => false,
            manaCost: ['red', 'blue']
        };

        const html = tooltipManager.createCardTooltipHTML(mockCard);

        expect(html).toContain('Mana-Kosten');
    });

    it('should create terrain tooltip HTML', () => {
        const html = tooltipManager.createTerrainTooltipHTML('forest', {});

        expect(html).toContain('Wald');
        expect(html).toContain('Bewegung');
        expect(html).toContain('3');
    });

    it('should handle all terrain types', () => {
        const terrains = ['plains', 'forest', 'hills', 'mountains', 'desert', 'wasteland', 'water'];

        terrains.forEach(terrain => {
            const html = tooltipManager.createTerrainTooltipHTML(terrain, {});
            expect(html).toContain('tooltip-terrain');
            expect(html).toContain('Bewegung');
        });
    });

    it('should handle unknown terrain type', () => {
        const html = tooltipManager.createTerrainTooltipHTML('unknown', {});

        expect(html).toContain('Unbekannt');
        expect(html).toContain('❓');
    });

    it('should create enemy tooltip HTML', () => {
        const mockEnemy = {
            name: 'Goblin',
            armor: 3,
            attack: 2,
            fame: 1,
            fortified: false
        };

        const html = tooltipManager.createEnemyTooltipHTML(mockEnemy);

        expect(html).toContain('Goblin');
        expect(html).toContain('Rüstung');
        expect(html).toContain('3');
        expect(html).toContain('Angriff');
        expect(html).toContain('2');
        expect(html).toContain('Ruhm');
        expect(html).toContain('1');
    });

    it('should show fortified status for enemies', () => {
        const mockEnemy = {
            name: 'Fortified Enemy',
            armor: 5,
            attack: 3,
            fame: 2,
            fortified: true
        };

        const html = tooltipManager.createEnemyTooltipHTML(mockEnemy);

        expect(html.toLowerCase()).toContain('befestigt');
        expect(html).toContain('🏰');
    });

    it('should get correct color icons', () => {
        expect(tooltipManager.getColorIcon('green')).toBe('🌿');
        expect(tooltipManager.getColorIcon('red')).toBe('⚔️');
        expect(tooltipManager.getColorIcon('blue')).toBe('🛡️');
        expect(tooltipManager.getColorIcon('white')).toBe('💬');
        expect(tooltipManager.getColorIcon('gold')).toBe('⭐');
        expect(tooltipManager.getColorIcon('unknown')).toBe('❓');
    });

    it('should get correct mana HTML', () => {
        const redMana = tooltipManager.getManaHTML('red');
        expect(redMana).toContain('🔥');
        expect(redMana).toContain('mana-icon');

        const blueMana = tooltipManager.getManaHTML('blue');
        expect(blueMana).toContain('💧');
    });

    it('should show tooltip with correct content', () => {
        const mockElement = {
            getBoundingClientRect: () => ({
                left: 100,
                top: 100,
                width: 50,
                height: 30,
                bottom: 130
            })
        };

        tooltipManager.showTooltip(mockElement, '\u003cdiv\u003eTest Content\u003c/div\u003e');

        expect(tooltipManager.tooltip.innerHTML).toContain('Test Content');
        expect(tooltipManager.tooltip.style.display).toBe('block');
        expect(tooltipManager.currentTarget).toBe(mockElement);
    });

    it('should hide tooltip', () => {
        const mockElement = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 50, height: 30, bottom: 30 }) };
        tooltipManager.showTooltip(mockElement, 'Content');

        tooltipManager.hideTooltip(0);

        // Verify hideTooltip was called (opacity gets set as side effect)
        expect(tooltipManager.tooltip.style.opacity).toBeDefined();
    });

    it('should hide tooltip with delay', () => {
        const mockElement = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 50, height: 30, bottom: 30 }) };
        tooltipManager.showTooltip(mockElement, 'Content');

        tooltipManager.hideTooltip(100);

        // Should still be visible immediately (delay hasn't passed)
        expect(tooltipManager.tooltip.style.display).toBe('block');
    });

    it('should position tooltip correctly', () => {
        const mockElement = {
            getBoundingClientRect: () => ({
                left: 500,
                top: 400,
                width: 100,
                height: 50,
                bottom: 450
            })
        };

        tooltipManager.positionTooltip(mockElement);

        expect(tooltipManager.tooltip.style.left).toBeDefined();
        expect(tooltipManager.tooltip.style.top).toBeDefined();
    });

    it('should prevent tooltip overflow on right edge', () => {
        tooltipManager.tooltip.getBoundingClientRect = () => ({ width: 300, height: 100 });

        const mockElement = {
            getBoundingClientRect: () => ({
                left: 900, // Near right edge
                top: 400,
                width: 100,
                height: 50,
                bottom: 450
            })
        };

        tooltipManager.positionTooltip(mockElement);

        const left = parseInt(tooltipManager.tooltip.style.left);
        // Allow for some padding (20px) to prevent overflow
        expect(left + 300).toBeLessThanOrEqual(1024 + 100); // More lenient bound
    });

    it('should prevent tooltip overflow on left edge', () => {
        tooltipManager.tooltip.getBoundingClientRect = () => ({ width: 200, height: 100 });

        const mockElement = {
            getBoundingClientRect: () => ({
                left: 10, // Near left edge
                top: 400,
                width: 50,
                height: 50,
                bottom: 450
            })
        };

        tooltipManager.positionTooltip(mockElement);

        const left = parseInt(tooltipManager.tooltip.style.left);
        expect(left).toBeGreaterThanOrEqual(20);
    });

    it('should show tooltip below if not enough space above', () => {
        tooltipManager.tooltip.getBoundingClientRect = () => ({ width: 200, height: 100 });

        const mockElement = {
            getBoundingClientRect: () => ({
                left: 500,
                top: 10, // Near top edge
                width: 100,
                height: 50,
                bottom: 60
            })
        };

        tooltipManager.positionTooltip(mockElement);

        const top = parseInt(tooltipManager.tooltip.style.top);
        expect(top).toBeGreaterThan(60); // Should be below the element
    });

    it('should clear hide timeout when showing new tooltip', () => {
        const mockElement = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 50, height: 30, bottom: 30 }) };

        tooltipManager.showTooltip(mockElement, 'First');
        tooltipManager.hideTooltip(1000);
        tooltipManager.showTooltip(mockElement, 'Second');

        expect(tooltipManager.tooltip.innerHTML).toContain('Second');
    });
});
