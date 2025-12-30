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

    it('should handle swipe', () => {
        const touchStart = { clientX: 100, clientY: 100 };
        const touchEnd = { clientX: 200, clientY: 100 };

        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [touchEnd], preventDefault: () => { } });

        expect(game.ui.addLog.called).toBe(true);
    });

    it('should handle long press', async () => {
        const touch = { clientX: 100, clientY: 100 };

        controller.handleTouchStart({ touches: [touch], preventDefault: () => { } });

        // Wait for long press threshold
        await new Promise(resolve => setTimeout(resolve, 600));

        expect(game.ui.addLog.called).toBe(true);
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

    it('should return device pixel ratio', () => {
        global.window.devicePixelRatio = 2;
        expect(TouchController.getDevicePixelRatio()).toBe(2);
    });
});
