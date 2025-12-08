import { describe, it, expect, beforeEach } from './testRunner.js';
import { TouchController } from '../js/touchController.js';

describe('TouchController', () => {
    let touchController;
    let mockGame;
    let mockCanvas;

    beforeEach(() => {
        // Mock Canvas
        mockCanvas = {
            addEventListener: () => { },
            removeEventListener: () => { },
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
            width: 800,
            height: 600,
            parentElement: {
                getBoundingClientRect: () => ({ width: 800, height: 600 })
            }
        };

        // Mock Game
        mockGame = {
            canvas: mockCanvas,
            hexGrid: {
                pixelToAxial: () => ({ q: 0, r: 0 }),
                hasHex: () => true,
                getHex: () => ({ terrain: 'plains' }),
                selectHex: () => { }, // Spy on this
                clearHighlights: () => { },
                highlightHexes: () => { }
            },
            ui: {
                addLog: () => { },
                tooltipManager: {
                    showEnemyTooltip: () => { },
                    showTerrainTooltip: () => { },
                    hideTooltip: () => { }
                }
            },
            enemies: [],
            terrain: {
                getName: () => 'Plains'
            },
            moveHero: () => { },
            selectHex: () => { },
            handleCardClick: () => { },
            handleCardRightClick: () => { },
            render: () => { },
            movementMode: false
        };

        // Mock window properties
        global.window = {
            addEventListener: () => { },
            removeEventListener: () => { },
            devicePixelRatio: 1
        };
        global.navigator = {
            vibrate: () => { }
        };

        touchController = new TouchController(mockGame);
    });

    it('should initialize and attach listeners', () => {
        expect(touchController).toBeDefined();
        // We could spy on addEventListener to verify calls
    });

    it('should handle tap', () => {
        // Mock touch event
        const touchEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 100, clientY: 100 }],
            changedTouches: [{ clientX: 100, clientY: 100 }]
        };

        // Simulate tap sequence
        touchController.handleTouchStart(touchEvent);

        // Fast forward time slightly (less than long press)
        // Since we can't easily mock Date.now() in this setup without more libs,
        // we rely on the fact that handleTouchEnd calculates duration.
        // We can mock Date.now if needed, but let's assume immediate end for tap.

        touchController.handleTouchEnd(touchEvent);

        // Should trigger selectHex (default mode)
        // We need to spy on mockGame.selectHex. 
        // Since we didn't use a spy lib, we can check a flag.

        let selected = false;
        mockGame.selectHex = () => { selected = true; };

        // Re-run with spy
        touchController.handleTouchStart(touchEvent);
        touchController.handleTouchEnd(touchEvent);

        expect(selected).toBe(true);
    });

    it('should handle long press', () => {
        return new Promise((resolve, reject) => {
            const touchEvent = {
                preventDefault: () => { },
                touches: [{ clientX: 100, clientY: 100 }],
                changedTouches: [{ clientX: 100, clientY: 100 }]
            };

            let longPressHandled = false;
            mockGame.ui.addLog = (msg) => {
                if (msg.includes('Langes Drücken')) longPressHandled = true;
            };

            // Reduce threshold for test
            touchController.longPressThreshold = 10;

            touchController.handleTouchStart(touchEvent);

            setTimeout(() => {
                try {
                    expect(longPressHandled).toBe(true);
                    expect(touchController.isLongPress).toBe(true);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }, 50);
        });
    });

    it('should handle swipe', () => {
        const startEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 100, clientY: 100 }]
        };

        const endEvent = {
            preventDefault: () => { },
            changedTouches: [{ clientX: 200, clientY: 100 }] // +100px X
        };

        let logMsg = '';
        mockGame.ui.addLog = (msg) => { logMsg = msg; };

        touchController.handleTouchStart(startEvent);
        touchController.handleTouchEnd(endEvent);

        expect(logMsg).toBe('Swipe rechts');
    });

    it('should resize canvas', () => {
        let rendered = false;
        mockGame.render = () => { rendered = true; };

        touchController.resizeCanvas();

        expect(mockGame.canvas.width).toBe(800);
        expect(rendered).toBe(true);
    });

    it('should detect touch device', () => {
        const result = TouchController.isTouchDevice();
        // In test environment, this depends on what's mocked
        expect(typeof result).toBe('boolean');
    });

    it('should handle touch move', () => {
        const touchMoveEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 110, clientY: 110 }]
        };

        // Should not throw
        touchController.handleTouchMove(touchMoveEvent);
        expect(true).toBe(true);
    });

    it('should cancel long press on move', () => {
        const startEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 100, clientY: 100 }]
        };

        const moveEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 120, clientY: 120 }] // Moved > 10px
        };

        touchController.handleTouchStart(startEvent);
        expect(touchController.longPressTimer).not.toBeNull();

        touchController.handleTouchMove(moveEvent);
        // Timer should be cancelled
        expect(touchController.longPressTimer).toBeNull();
    });

    it('should handle touch cancel', () => {
        const startEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 100, clientY: 100 }]
        };

        touchController.handleTouchStart(startEvent);
        expect(touchController.longPressTimer).not.toBeNull();

        touchController.handleTouchCancel({});
        expect(touchController.longPressTimer).toBeNull();
        expect(touchController.isLongPress).toBe(false);
    });

    it('should handle card tap', () => {
        const mockCard = { name: 'MockCard' };
        mockGame.hero = { hand: [mockCard] };

        let cardClicked = false;
        mockGame.handleCardClick = () => { cardClicked = true; };

        touchController.handleCardTap(0);
        expect(cardClicked).toBe(true);
    });

    it('should handle card long press', () => {
        const mockCard = { name: 'MockCard' };
        mockGame.hero = { hand: [mockCard] };

        let rightClicked = false;
        mockGame.handleCardRightClick = () => { rightClicked = true; };

        touchController.handleCardLongPress(0);
        expect(rightClicked).toBe(true);
    });

    it('should handle vertical swipe', () => {
        const startEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 100, clientY: 100 }]
        };

        const endEvent = {
            preventDefault: () => { },
            changedTouches: [{ clientX: 100, clientY: 200 }] // +100px Y
        };

        let logMsg = '';
        mockGame.ui.addLog = (msg) => { logMsg = msg; };

        touchController.handleTouchStart(startEvent);
        touchController.handleTouchEnd(endEvent);

        expect(logMsg).toBe('Swipe runter');
    });

    it('should handle tap in movement mode', () => {
        mockGame.movementMode = true;

        let heroMoved = false;
        mockGame.moveHero = () => { heroMoved = true; };

        const touchEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 100, clientY: 100 }],
            changedTouches: [{ clientX: 100, clientY: 100 }]
        };

        touchController.handleTouchStart(touchEvent);
        touchController.handleTouchEnd(touchEvent);

        expect(heroMoved).toBe(true);
    });

    it('should show hex tooltip on touch move', () => {
        let tooltipShown = false;
        mockGame.ui.tooltipManager.showTerrainTooltip = () => { tooltipShown = true; };

        const touchMoveEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 100, clientY: 100 }]
        };

        touchController.handleTouchMove(touchMoveEvent);
        expect(tooltipShown).toBe(true);
    });

    it('should handle resize with particle canvas', () => {
        mockGame.particleCanvas = {
            width: 0,
            height: 0
        };

        touchController.resizeCanvas();

        expect(mockGame.particleCanvas.width).toBe(800);
        expect(mockGame.particleCanvas.height).toBe(600);
    });

    it('should get device pixel ratio', () => {
        global.window.devicePixelRatio = 2;
        const ratio = TouchController.getDevicePixelRatio();
        expect(ratio).toBe(2);
    });

    it('should not crash with invalid hex on tap', () => {
        mockGame.hexGrid.hasHex = () => false;

        const touchEvent = {
            preventDefault: () => { },
            touches: [{ clientX: 100, clientY: 100 }],
            changedTouches: [{ clientX: 100, clientY: 100 }]
        };

        touchController.handleTouchStart(touchEvent);
        touchController.handleTouchEnd(touchEvent);

        // Should not throw
        expect(true).toBe(true);
    });
});
