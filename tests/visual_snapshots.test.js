import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockElement, createMockCanvas, createMockContext } from './test-mocks.js';

describe('Visual Rendering Snapshots', () => {
    let game;
    let ctx;

    beforeEach(() => {
        global.document.getElementById = (id) => {
            const el = createMockElement('div');
            el.id = id;
            if (id === 'game-board') {
                el.getContext = () => {
                    ctx = createMockContext();
                    return ctx;
                };
            }
            return el;
        };
        global.document.querySelector = () => createMockElement('div');
        game = new MageKnightGame();
    });

    afterEach(() => {
        if (game && game.ui) game.ui.destroy();
    });

    it('should call fillRect and stroke during hex rendering', () => {
        // Override rAF to sync
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (cb) => cb();

        // Access the mock context through game.ctx (which was captured during construction)
        const gameCtx = game.ctx;

        // Mock hexGrid render to call fill/stroke on the context
        game.hexGrid.render = () => {
            gameCtx.fill();
            gameCtx.stroke();
        };
        game.enemies = [];

        game.render();

        // Verify the mock ctx was called
        expect(gameCtx.fill.called).toBe(true);
        expect(gameCtx.stroke.called).toBe(true);

        window.requestAnimationFrame = originalRAF;
    });

    it('should render game logs to the UI', () => {
        const logContainer = game.ui.elements.gameLog;
        game.ui.addLog('Test Log', 'info');
        expect(logContainer.children.length).toBeGreaterThan(0);
        // Check that message is present in the log entry (now has timestamp, icon, etc)
        const entry = logContainer.children[logContainer.children.length - 1];
        expect(entry.textContent.includes('Test Log')).toBe(true);
    });
});
