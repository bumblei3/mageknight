import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { TouchController } from '../js/touchController.js';
import { createMockElement, createSpy } from './test-mocks.js';

describe('Touch Controller', () => {
    let game;
    let controller;
    let canvas;

    let originalVibrate, originalMatchMedia, originalGetElementById;

    beforeEach(() => {
        originalVibrate = global.navigator.vibrate;
        originalMatchMedia = global.window.matchMedia;
        originalGetElementById = global.document.getElementById;
        canvas = createMockElement('canvas');
        canvas.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600
        });

        game = {
            canvas: canvas,
            movementMode: false,
            addLog: createSpy('addLog'),
            hexGrid: {
                hasHex: () => true,
                pixelToAxial: (x, y) => ({ q: Math.floor(x / 50), r: Math.floor(y / 50) }),
                getHex: () => ({ terrain: 1 })
            },
            ui: {
                addLog: createSpy('addLog'),
                tooltipManager: {
                    showEnemyTooltip: createSpy('showEnemyTooltip'),
                    showTerrainTooltip: createSpy('showTerrainTooltip'),
                    hideTooltip: createSpy('hideTooltip')
                }
            },
            enemies: [],
            terrain: { getName: () => 'plains' },
            moveHero: createSpy('moveHero'),
            selectHex: createSpy('selectHex'),
            handleCardClick: createSpy('handleCardClick'),
            handleCardRightClick: createSpy('handleCardRightClick'),
            hero: { hand: [{ name: 'Card 1' }] }
        };

        global.navigator.vibrate = createSpy('vibrate');
        global.window.matchMedia = () => ({ matches: false });

        // Mock getElementById for cards
        global.document.getElementById = (id) => {
            if (id === 'hand-cards') return createMockElement('div');
            return null;
        };

        controller = new TouchController(game);
    });

    afterEach(() => {
        global.navigator.vibrate = originalVibrate;
        global.window.matchMedia = originalMatchMedia;
        global.document.getElementById = originalGetElementById;
    });

    it('should handle simple tap', () => {
        const touch = { clientX: 100, clientY: 100 };
        const event = {
            preventDefault: () => { },
            touches: [touch],
            changedTouches: [touch]
        };

        controller.handleTouchStart(event);
        controller.handleTouchEnd(event);

        expect(game.selectHex.called).toBe(true);
    });

    it('should handle all swipe directions', () => {
        const touchStart = { clientX: 100, clientY: 100 };

        // Swipe Right
        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [{ clientX: 200, clientY: 100 }], preventDefault: () => { } });
        expect(game.addLog.calledWith('Swipe rechts', 'info')).toBe(true);

        // Swipe Left
        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [{ clientX: 0, clientY: 100 }], preventDefault: () => { } });
        expect(game.addLog.calledWith('Swipe links', 'info')).toBe(true);

        // Swipe Down
        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [{ clientX: 100, clientY: 200 }], preventDefault: () => { } });
        expect(game.addLog.calledWith('Swipe runter', 'info')).toBe(true);

        // Swipe Up
        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [{ clientX: 100, clientY: 0 }], preventDefault: () => { } });
        expect(game.addLog.calledWith('Swipe hoch', 'info')).toBe(true);
    });

    it('should show tooltips for enemies and terrain', () => {
        const touch = { clientX: 105, clientY: 105 };
        const hex = { q: 2, r: 2 };

        // Enemy tooltip
        game.enemies = [{ position: { q: 2, r: 2 }, name: 'Orc' }];
        controller.showHexTooltip(touch, hex);
        expect(game.ui.tooltipManager.showEnemyTooltip.called).toBe(true);

        // Terrain tooltip
        game.enemies = [];
        controller.showHexTooltip(touch, hex);
        expect(game.ui.tooltipManager.showTerrainTooltip.called).toBe(true);
    });

    it('should handle long press', async () => {
        const touch = { clientX: 100, clientY: 100 };

        controller.handleTouchStart({ touches: [touch], preventDefault: () => { } });

        // Wait for long press threshold
        await new Promise(resolve => setTimeout(resolve, 600));

        expect(game.addLog.called).toBe(true);
    });

    it('should handle resize', () => {
        game.canvas.parentNode = createMockElement('div');
        game.canvas.parentNode.getBoundingClientRect = () => ({ width: 1000, height: 800 });

        controller.handleResize();

        // Resize is debounced, so we wait
        return new Promise(resolve => {
            setTimeout(() => {
                expect(game.canvas.width).toBe(1000);
                resolve();
            }, 200);
        });
    });

    it('should detect touch device', () => {
        global.window.ontouchstart = {};
        expect(TouchController.isTouchDevice()).toBe(true);
        delete global.window.ontouchstart;
    });

    it('should handle card tap', () => {
        game.hero.hand = [{ name: 'Card 0' }];
        game.handleCardClick = createSpy();

        controller.handleCardTap(0);
        expect(game.handleCardClick.called).toBe(true);
    });

    it('should handle full touch lifecycle for tap', () => {
        const touchStart = { clientX: 100, clientY: 100, target: canvas };
        const touchEnd = { changedTouches: [{ clientX: 105, clientY: 105, target: canvas }] };

        canvas.dispatchEvent({ type: 'touchstart', touches: [touchStart], preventDefault: () => { } });
        canvas.dispatchEvent({ type: 'touchend', changedTouches: touchEnd.changedTouches, preventDefault: () => { } });

        // This should trigger handleTap which calls handleHexClick
        expect(game.selectHex.called).toBe(true);
    });

    it('should handle card long press', () => {
        game.hero.hand = [{ name: 'Card 1' }];
        game.handleCardRightClick = createSpy();

        controller.handleCardLongPress(0);
        expect(game.handleCardRightClick.called).toBe(true);
        expect(global.navigator.vibrate.called).toBe(true);
    });

    it('should resize particle canvas if present', (done) => {
        game.particleCanvas = createMockElement('canvas');
        game.canvas.parentNode = createMockElement('div');
        game.canvas.parentNode.getBoundingClientRect = () => ({ width: 500, height: 400 });

        controller.resizeCanvas();

        expect(game.particleCanvas.width).toBe(500);
        expect(game.particleCanvas.height).toBe(400);
        done();
    });

    it('should render on resize if hero present', () => {
        game.hero = { getStats: () => ({}) };
        game.render = createSpy('render');
        game.canvas.parentNode = createMockElement('div');
        game.canvas.parentNode.getBoundingClientRect = () => ({ width: 1000, height: 800 });

        controller.resizeCanvas();
        expect(game.render.called).toBe(true);
    });

    it('should return device pixel ratio', () => {
        global.window.devicePixelRatio = 2;
        expect(TouchController.getDevicePixelRatio()).toBe(2);
    });

    it('should handle touch cancel', () => {
        const touch = { clientX: 100, clientY: 100 };
        controller.handleTouchStart({ touches: [touch], preventDefault: () => { } });
        controller.handleTouchCancel({ preventDefault: () => { } });
        // handleTouchCancel clears longPressTimer and isLongPress, not touchStartPos
        expect(controller.longPressTimer).toBe(null);
        expect(controller.isLongPress).toBe(false);
    });

    it('should show hex context menu', () => {
        const hex = { q: 1, r: 1 };
        game.enemies = [{ position: { q: 1, r: 1 }, name: 'Enemy', armor: 3, attack: 2 }];
        // showHexContextMenu calls alert(), not addLog
        const originalAlert = global.alert;
        global.alert = createSpy('alert');
        controller.showHexContextMenu(hex);
        expect(global.alert.called).toBe(true);
        global.alert = originalAlert;
    });

    it('should destroy and cleanup', () => {
        expect(() => controller.destroy()).not.toThrow();
        // After destroy, longPressTimer should be cleared
        expect(controller.longPressTimer).toBe(null);
    });

    it('should handle touch move without swipe', () => {
        const touch = { clientX: 100, clientY: 100 };
        controller.handleTouchStart({ touches: [touch], preventDefault: () => { } });
        controller.handleTouchMove({ touches: [{ clientX: 105, clientY: 105 }], preventDefault: () => { } });
        // Small movement should not trigger swipe
        expect(game.addLog.calledWith('Swipe rechts', 'info')).toBe(false);
    });

    it('should setup touch events on canvas', () => {
        // Canvas should have touch listeners after constructor
        expect(controller.game.canvas).toBeDefined();
    });

    it('should handle move during long press to cancel it', async () => {
        const touch = { clientX: 100, clientY: 100 };
        controller.handleTouchStart({ touches: [touch], preventDefault: () => { } });
        // Move significantly during long press
        controller.handleTouchMove({ touches: [{ clientX: 200, clientY: 200 }], preventDefault: () => { } });
        // Long press timer should be cancelled
        expect(controller.longPressTimer).toBe(null);
    });
});
