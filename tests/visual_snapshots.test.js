import { describe, it, expect, beforeEach } from './testRunner.js';
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

    it('should call fillRect and stroke during hex rendering', () => {
        // Mock data
        game.hexGrid = {
            hexagons: new Map([
                ['0,0', { q: 0, r: 0, terrain: 'plains' }]
            ]),
            hexToPixel: () => ({ x: 100, y: 100 })
        };
        game.enemies = [];

        game.render();

        // We expect at least one hexagon to be drawn
        // Depending on how game.render is implemented, it might call beginPath, lineTo, fill, stroke
        expect(ctx.fill.called).toBe(true);
        expect(ctx.stroke.called).toBe(true);
    });

    it('should render game logs to the UI', () => {
        const logContainer = document.getElementById('log-container');
        game.ui.addLog('Test Log', 'info');
        expect(logContainer.children.length).toBeGreaterThan(0);
        expect(logContainer.innerHTML).toContain('Test Log');
    });
});
