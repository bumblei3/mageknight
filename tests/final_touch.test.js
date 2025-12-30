import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import TouchController from '../js/touchController.js';
import { ParticleSystem } from '../js/particles.js';
import { createMockElement, createMockCanvas, createSpy, createMockWindow } from './test-mocks.js';

describe('Final Touch and Particles', () => {
    let controller;
    let game;
    let originalWindow, originalDocument, originalNavigator;

    beforeEach(() => {
        game = {
            hero: { hand: [{ name: 'Card 1' }], getStats: () => ({}) },
            canvas: createMockCanvas(),
            particleCanvas: createMockCanvas(),
            handleCardClick: createSpy(),
            handleCardRightClick: createSpy(),
            render: createSpy(),
            hexGrid: { pixelToHex: () => ({ q: 0, r: 0 }), hexagons: new Map() }
        };
        game.canvas.parentElement = createMockElement('div');

        controller = new TouchController(game);

        // Mock global navigator for haptic feedback
        originalNavigator = global.navigator;
        global.navigator = { vibrate: createSpy(), maxTouchPoints: 5 };
    });

    afterEach(() => {
        global.navigator = originalNavigator;
    });

    it('should handle card touch events lifecycle', () => {
        const handContainer = document.getElementById('hand-cards');
        const cardEl = createMockElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = '0';
        handContainer.appendChild(cardEl);

        // Mock closest
        cardEl.closest = (sel) => sel === '.card' ? cardEl : null;

        // Dispatches
        const touchstart = { target: cardEl, preventDefault: createSpy() };
        const touchend = { target: cardEl, preventDefault: createSpy() };

        // We need to trigger the listeners added by setupCardTouchEvents
        // Since setupCardTouchEvents is called in constructor, they should be there.

        // Simulating touchstart
        handContainer.dispatchEvent({ type: 'touchstart', ...touchstart });
        expect(controller.cardLongPressTimer).toBeDefined();

        // Simulating touchend
        handContainer.dispatchEvent({ type: 'touchend', ...touchend });
        expect(game.handleCardClick.called).toBe(true);
        expect(global.navigator.vibrate.called).toBe(true);
    });

    it('should handle swipe directions', () => {
        // Mock handleSwipe
        controller.touchStartX = 0;
        controller.touchStartY = 0;

        // Swipe right
        controller.handleSwipe(100, 0);
        expect(game.ui.addLog.calledWith('Swipe rechts', 'info')).toBe(true);

        // Swipe left
        controller.handleSwipe(-100, 0);
        expect(game.ui.addLog.calledWith('Swipe links', 'info')).toBe(true);

        // Swipe up
        controller.handleSwipe(0, -100);
        expect(game.ui.addLog.calledWith('Swipe hoch', 'info')).toBe(true);

        // Swipe down
        controller.handleSwipe(0, 100);
        expect(game.ui.addLog.calledWith('Swipe runter', 'info')).toBe(true);
    });

    it('should show hex tooltip for enemy and terrain', () => {
        const hex = { q: 0, r: 0 };
        const touch = { clientX: 10, clientY: 20 };
        game.enemies = [{ name: 'Orc', position: { q: 0, r: 0 } }];
        game.ui.tooltipManager = {
            showEnemyTooltip: createSpy(),
            showTerrainTooltip: createSpy()
        };
        game.hexGrid.getHex = () => ({ terrain: 'plains' });

        controller.showHexTooltip(touch, hex);
        expect(game.ui.tooltipManager.showEnemyTooltip.called).toBe(true);

        game.enemies = [];
        controller.showHexTooltip(touch, hex);
        expect(game.ui.tooltipManager.showTerrainTooltip.called).toBe(true);
    });

    it('should show hex context menu', () => {
        const hex = { q: 0, r: 0 };
        game.hexGrid.getHex = () => ({ terrain: 'plains' });
        game.terrain = { getName: () => 'Plains' };
        game.enemies = [{ name: 'Orc', position: { q: 0, r: 0 }, armor: 3, attack: 3 }];

        const originalAlert = global.alert;
        global.alert = createSpy();

        controller.showHexContextMenu(hex);
        expect(global.alert.called).toBe(true);

        global.alert = originalAlert;
    });

    it('should track statistics extras', async () => {
        const module = await import('../js/statistics.js');
        const sm = new module.StatisticsManager();
        sm.trackExploration();
        sm.trackSiteVisit();
        sm.trackMovement(5);
        expect(sm.get('tilesExplored')).toBe(1);
        expect(sm.get('sitesVisited')).toBe(1);
        expect(sm.get('totalMovement')).toBe(5);
    });

    it('should handle card touch cancel', () => {
        const handContainer = document.getElementById('hand-cards');
        controller.cardLongPressTimer = setTimeout(() => { }, 1000);

        handContainer.dispatchEvent({ type: 'touchcancel' });
        expect(controller.cardLongPressTimer).toBe(null);
    });

    it('should handle more particle effects', () => {
        const ps = new ParticleSystem(game.particleCanvas);
        ps.playCardEffect(100, 100, 'red');
        ps.damageSplatter(100, 100, 10);
        expect(ps.particles.length).toBeGreaterThan(0);
    });
});
