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
});
