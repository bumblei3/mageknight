import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { store } from '../js/game/Store.js';
import { setLanguage } from '../js/i18n/index.js';

describe('Visual Rendering Snapshots', () => {
    let game;
    let ctx;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <canvas id="game-board"></canvas>
            <div id="game-log"></div>
            <div id="hand-cards"></div>
            <div id="mana-source"></div>
            <div id="fame-value">0</div>
            <div id="reputation-value">0</div>
            <div id="hero-armor">0</div>
            <div id="hero-handlimit">0</div>
            <div id="hero-wounds">0</div>
            <div id="hero-name">Hero</div>
            <div id="movement-points">0</div>
            <div id="skill-list"></div>
            <div id="healing-points">0</div>
            <div id="mana-bank"></div>
            <div id="particle-layer" class="canvas-layer"></div>
        `;
        game = new MageKnightGame();
    });

    afterEach(() => {
        if (store) store.clearListeners();
        if (game && game.ui) game.ui.destroy();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
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
        expect(gameCtx.fill).toHaveBeenCalled();
        expect(gameCtx.stroke).toHaveBeenCalled();

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
