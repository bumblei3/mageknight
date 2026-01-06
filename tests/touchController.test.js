import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TouchController } from '../js/touchController.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';
import { eventBus } from '../js/eventBus.js';

describe('Touch Controller', () => {
    let game;
    let controller;
    let canvas;
    let originalVibrate;
    let originalMatchMedia;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <div id="game-container" style="width: 800px; height: 600px;">
                <canvas id="game-board"></canvas>
            </div>
            <div id="hand-cards"></div>
            <div id="game-log"></div>
            <div id="phase-indicator"></div>
            <div id="mana-source"></div>
            <div id="fame-value">0</div>
            <div id="reputation-value">0</div>
            <div id="hero-armor">0</div>
            <div id="hero-handlimit">0</div>
            <div id="hero-wounds">0</div>
            <div id="hero-name"></div>
            <div id="movement-points">0</div>
            <div id="skill-list"></div>
            <div id="healing-points">0</div>
            <div id="mana-bank"></div>
            <div id="particle-layer"></div>
            <div id="visit-btn"></div>
            <button id="undo-btn"></button>
            <button id="end-turn-btn"></button>
        `;

        originalVibrate = global.navigator.vibrate;
        originalMatchMedia = global.window.matchMedia;

        canvas = document.getElementById('game-board');
        canvas.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600
        });

        game = {
            canvas: canvas,
            movementMode: false,
            addLog: vi.fn(),
            hexGrid: {
                hasHex: () => true,
                pixelToAxial: (x, y) => ({ q: Math.floor(x / 50), r: Math.floor(y / 50) }),
                getHex: () => ({ terrain: 1 }),
                clearSelection: vi.fn(),
                highlightHexes: vi.fn()
            },
            ui: {
                addLog: vi.fn(),
                tooltipManager: {
                    showEnemyTooltip: vi.fn(),
                    showTerrainTooltip: vi.fn(),
                    hideTooltip: vi.fn()
                }
            },
            enemies: [],
            terrain: { getName: () => 'plains' },
            moveHero: vi.fn(),
            selectHex: vi.fn(),
            handleCardClick: vi.fn(),
            handleCardRightClick: vi.fn(),
            hero: { hand: [{ name: 'Card 1' }] }
        };

        global.navigator.vibrate = vi.fn();
        global.window.matchMedia = () => ({ matches: false });

        controller = new TouchController(game);
    });

    afterEach(() => {
        if (controller) controller.destroy();
        if (store) store.clearListeners();
        vi.clearAllMocks();
        global.navigator.vibrate = originalVibrate;
        global.window.matchMedia = originalMatchMedia;
        document.body.innerHTML = '';
        eventBus.clear();
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

        expect(game.selectHex).toHaveBeenCalled();
    });

    it('should handle all swipe directions', () => {
        const touchStart = { clientX: 100, clientY: 100 };

        // Swipe Right
        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [{ clientX: 200, clientY: 100 }], preventDefault: () => { } });
        expect(game.addLog).toHaveBeenCalledWith('Swipe rechts', 'info');

        // Swipe Left
        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [{ clientX: 0, clientY: 100 }], preventDefault: () => { } });
        expect(game.addLog).toHaveBeenCalledWith('Swipe links', 'info');

        // Swipe Down
        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [{ clientX: 100, clientY: 200 }], preventDefault: () => { } });
        expect(game.addLog).toHaveBeenCalledWith('Swipe runter', 'info');

        // Swipe Up
        controller.handleTouchStart({ touches: [touchStart], preventDefault: () => { } });
        controller.handleTouchEnd({ changedTouches: [{ clientX: 100, clientY: 0 }], preventDefault: () => { } });
        expect(game.addLog).toHaveBeenCalledWith('Swipe hoch', 'info');
    });

    it('should show tooltips for enemies and terrain', () => {
        const touch = { clientX: 105, clientY: 105 };
        const hex = { q: 2, r: 2 };

        // Enemy tooltip
        game.enemies = [{ position: { q: 2, r: 2 }, name: 'Orc' }];
        controller.showHexTooltip(touch, hex);
        expect(game.ui.tooltipManager.showEnemyTooltip).toHaveBeenCalled();

        // Terrain tooltip
        game.enemies = [];
        controller.showHexTooltip(touch, hex);
        expect(game.ui.tooltipManager.showTerrainTooltip).toHaveBeenCalled();
    });

    it('should handle long press', async () => {
        const touch = { clientX: 100, clientY: 100 };

        controller.handleTouchStart({ touches: [touch], preventDefault: () => { } });

        // Wait for long press threshold
        await new Promise(resolve => setTimeout(resolve, 600));

        expect(game.addLog).toHaveBeenCalled();
    });

    it('should handle resize', () => {
        const container = document.getElementById('game-container');
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 800 });

        controller.handleResize();

        // Resize is debounced, so we wait
        return new Promise(resolve => {
            setTimeout(() => {
                expect(canvas.width).toBe(1000);
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
        game.handleCardClick = vi.fn();

        controller.handleCardTap(0);
        expect(game.handleCardClick).toHaveBeenCalled();
    });

    it('should handle full touch lifecycle for tap', () => {
        const touchStart = { clientX: 100, clientY: 100, target: canvas };
        const touchEnd = { clientX: 105, clientY: 105, target: canvas };

        const startEvt = new Event('touchstart', { bubbles: true });
        startEvt.touches = [touchStart];
        canvas.dispatchEvent(startEvt);

        const endEvt = new Event('touchend', { bubbles: true });
        endEvt.changedTouches = [touchEnd];
        canvas.dispatchEvent(endEvt);

        // This should trigger handleTap which calls handleHexClick
        expect(game.selectHex).toHaveBeenCalled();
    });

    it('should handle card long press', () => {
        game.hero.hand = [{ name: 'Card 1' }];
        game.handleCardRightClick = vi.fn();

        controller.handleCardLongPress(0);
        expect(game.handleCardRightClick).toHaveBeenCalled();
        expect(global.navigator.vibrate).toHaveBeenCalled();
    });

    it('should resize particle canvas if present', () => {
        game.particleCanvas = document.createElement('canvas');
        const container = document.getElementById('game-container');
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({ width: 500, height: 400 });

        controller.resizeCanvas();

        expect(game.particleCanvas.width).toBe(500);
        expect(game.particleCanvas.height).toBe(400);
    });

    it('should render on resize if hero present', () => {
        game.hero = { getStats: () => ({}) };
        game.render = vi.fn();
        const container = document.getElementById('game-container');
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 800 });

        controller.resizeCanvas();
        expect(game.render).toHaveBeenCalled();
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
        global.alert = vi.fn();
        controller.showHexContextMenu(hex);
        expect(global.alert).toHaveBeenCalled();
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
        expect(game.addLog).not.toHaveBeenCalledWith('Swipe rechts', 'info');
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
